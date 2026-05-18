import { chat, maxIterations, toolDefinition, type AnyTextAdapter } from "@tanstack/ai";
import { createCodeMode } from "@tanstack/ai-code-mode";
import { createOpenRouterText, type OpenRouterTextModelOptions } from "@tanstack/ai-openrouter";
import {
  analystReportSpecSchema,
  type AnalystReportSpec,
  type AnalystRunEvent,
} from "@bankops/contracts";

import { createAnalystDataTools } from "./analyst-tools.js";
import { createAnalystIsolateDriver } from "./isolate-driver.js";

const MAX_ATTEMPTS = 4;
const CODE_MODE_TIMEOUT_MS = 120_000;

type RunAnalystReportInput = {
  question: string;
  previousReport?: AnalystReportSpec;
  emit: (event: AnalystRunEvent) => void;
  env?: NodeJS.ProcessEnv;
  abortController?: AbortController;
};
type AttemptInput = {
  attempt: number;
  validationError?: string;
};

const ANALYST_SYSTEM_PROMPT = `You are the BankOps CodeMode Analyst.

Use execute_typescript to call bounded external_get_* analyst tools, analyze their compact outputs,
and submit exactly one complete AnalystReportSpec by calling external_submit_report(spec).

Hard constraints:
- Do all work inside execute_typescript. Do not answer in prose.
- Use console.log for short safe milestones before tool calls, after tool results, before report assembly, and before final submit.
- End the execute_typescript program with: await external_submit_report(report);
- Do not generate React, JSX, CSS, handlers, subscriptions, watchers, or browser code.
- Do not invent hidden scenario labels. Only describe observable audit-log facts returned by tools.
- Embed all chart, table, timeline, metric, and narrative data in the submitted report.
- Tables must contain capped rows useful for local rendering.
- Use version "2026-05-analyst-report" and an ISO datetime generatedAt value.
- If a previous report is provided, return a full replacement report, not a patch.`;

const CODE_MODE_SCAFFOLD = `Use this exact shape inside execute_typescript:
const overview = await external_get_dataset_overview({});
console.log("loaded dataset overview", overview.totalEntries, "entries");
const risk = await external_get_customer_risk_rollup({ limit: 8 });
console.log("loaded customer risk rows", risk.rows.length);
const report = {
  version: "2026-05-analyst-report",
  title: "...",
  generatedAt: new Date().toISOString(),
  question: "copy the user's question",
  summary: "...",
  blocks: [...]
};
await external_submit_report(report);`;

export async function runAnalystCodeMode({
  emit,
  abortController,
  env = process.env,
  previousReport,
  question,
}: RunAnalystReportInput): Promise<AnalystReportSpec> {
  const apiKey = env.OPENROUTER_API_KEY;
  const model = env.ANALYST_MODEL;

  if (!apiKey || !model) {
    throw new Error("OPENROUTER_API_KEY and ANALYST_MODEL must be configured");
  }

  emitProgress(emit, "Starting CodeMode run", "Opening server-side OpenRouter CodeMode session");
  emitTrace(emit, "runtime", "Configured analyst model", model);
  const driver = await createAnalystIsolateDriver();
  emitProgress(emit, "Prepared sandbox", "Node isolate driver ready for bounded analyst tools");

  return runAnalystReportAttempts({
    emit,
    runAttempt: async ({ attempt, validationError }) => {
      let submittedReport: AnalystReportSpec | undefined;
      let assistantText = "";
      const submitTool = createSubmitReportTool((report) => {
        emitProgress(emit, "Submitting AnalystReportSpec", `${report.blocks.length} report blocks`);
        emitTrace(emit, "runtime", "external_submit_report", report.title);
        submittedReport = report;
      });
      const { tool: attemptTool, systemPrompt: attemptSystemPrompt } = createCodeMode({
        driver,
        memoryLimit: 128,
        timeout: CODE_MODE_TIMEOUT_MS,
        tools: [...createAnalystDataTools(emit), submitTool],
      });

      emitProgress(
        emit,
        attempt === 1 ? "Planning bounded analyst queries" : "Repairing report submission",
        validationError ?? "CodeMode can call capped BankOps analyst tools only",
      );
      emitTrace(emit, "runtime", `Attempt ${attempt}`, validationError ?? question);

      const stream = chat({
        adapter: createAnalystAdapter(model, apiKey),
        abortController,
        agentLoopStrategy: maxIterations(24),
        maxTokens: 20_000,
        messages: [
          {
            role: "user",
            content: userPrompt({ previousReport, question, validationError }),
          },
        ],
        modelOptions: analystModelOptions(),
        systemPrompts: [ANALYST_SYSTEM_PROMPT, CODE_MODE_SCAFFOLD, attemptSystemPrompt],
        tools: [attemptTool],
      });

      for await (const event of stream) {
        const runError = runErrorMessage(event);

        if (runError !== undefined) {
          emitTrace(emit, "runtime", "Run error", runError);
          throw new Error(runError);
        }

        const text = textChunk(event);
        assistantText += text;
        if (text.trim()) {
          emitTrace(emit, "model", "Assistant text", text.trim().slice(0, 1_500));
        }

        const reasoning = reasoningTraceDetail(event);
        if (reasoning !== undefined) {
          emitTrace(emit, "model", "Reasoning trace", reasoning);
        }

        if (isCodeModeConsoleEvent(event)) {
          emitProgress(emit, "CodeMode milestone", event.data.message.slice(0, 500));
          emitTrace(emit, "codemode", "console.log", event.data.message);
          emit({ type: "code", code: event.data.message });
        }
      }

      if (submittedReport === undefined) {
        throw new Error(
          assistantText.trim()
            ? `CodeMode completed without calling external_submit_report. Model said: ${assistantText.trim().slice(0, 500)}`
            : "CodeMode completed without calling external_submit_report",
        );
      }

      return submittedReport;
    },
  });
}

export async function runAnalystReportAttempts({
  emit,
  runAttempt,
}: {
  emit: (event: AnalystRunEvent) => void;
  runAttempt: (input: AttemptInput) => Promise<unknown>;
}) {
  let validationError: string | undefined;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    emit({ type: "phase", phase: attempt === 1 ? "generating" : "repairing" });
    emitTrace(
      emit,
      "runtime",
      attempt === 1 ? "Generation attempt started" : "Repair attempt started",
      `Attempt ${attempt} of ${MAX_ATTEMPTS}`,
    );

    try {
      // oxlint-disable-next-line eslint/no-await-in-loop -- repair attempts must use the previous validation error.
      const candidate = await runAttempt({ attempt, validationError });
      emit({ type: "phase", phase: "validating" });
      emitProgress(emit, "Validating AnalystReportSpec", `Attempt ${attempt}`);
      const report = analystReportSpecSchema.parse(candidate);

      emit({ attempt, ok: true, type: "validation" });
      emitProgress(emit, `Validation attempt ${attempt} passed`, report.title);
      emitTrace(emit, "validation", "Report validation passed", `${report.blocks.length} blocks`);
      emit({ report, type: "report" });
      emitProgress(emit, "Rendering validated report", "Swapping in complete report snapshot");
      emit({ type: "phase", phase: "done" });

      return report;
    } catch (error) {
      validationError = error instanceof Error ? error.message : "Invalid Analyst Report";
      emit({ attempt, message: validationError, ok: false, type: "validation" });
      emitProgress(emit, `Validation attempt ${attempt} failed`, validationError);
      emitTrace(emit, "validation", "Report validation failed", validationError);

      if (attempt === MAX_ATTEMPTS) {
        throw new Error(validationError, { cause: error });
      }
    }
  }

  throw new Error("Analyst Report generation failed");
}

function emitProgress(emit: (event: AnalystRunEvent) => void, label: string, detail?: string) {
  emit({
    at: new Date().toISOString(),
    detail: detail?.slice(0, 500),
    label: label.slice(0, 160),
    type: "progress",
  });
}

function emitTrace(
  emit: (event: AnalystRunEvent) => void,
  source: Extract<AnalystRunEvent, { type: "trace" }>["source"],
  label: string,
  detail?: string,
) {
  emit({
    at: new Date().toISOString(),
    detail: detail?.slice(0, 1_500),
    label: label.slice(0, 160),
    source,
    type: "trace",
  });
}

function createAnalystAdapter(model: string, apiKey: string): AnyTextAdapter {
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- ANALYST_MODEL is an OpenRouter slug supplied by the server environment, outside the adapter's generated model union.
  return createOpenRouterText(model as never, apiKey) as unknown as AnyTextAdapter;
}

export function analystModelOptions(): OpenRouterTextModelOptions {
  return {
    reasoning: { effort: "high" },
  };
}

function createSubmitReportTool(onReport: (report: AnalystReportSpec) => void) {
  return toolDefinition({
    description: "Submit the complete AnalystReportSpec for validation and rendering.",
    inputSchema: analystReportSpecSchema,
    name: "submit_report",
  }).server(async (spec) => {
    const report = analystReportSpecSchema.parse(spec);
    onReport(report);
    return { ok: true };
  });
}

function userPrompt({
  previousReport,
  question,
  validationError,
}: {
  question: string;
  previousReport?: AnalystReportSpec;
  validationError?: string;
}) {
  return JSON.stringify({
    question,
    previousReport,
    repairInstruction:
      validationError === undefined
        ? undefined
        : `The previous report failed validation: ${validationError}. Submit a corrected full report.`,
  });
}

function isCodeModeConsoleEvent(event: unknown): event is { data: { message: string } } {
  if (event === null || typeof event !== "object" || !("type" in event)) {
    return false;
  }

  const candidate = event as { type?: unknown; data?: unknown };
  return (
    candidate.type === "CUSTOM" &&
    candidate.data !== null &&
    typeof candidate.data === "object" &&
    "name" in candidate.data &&
    candidate.data.name === "code_mode:console" &&
    "message" in candidate.data &&
    typeof candidate.data.message === "string"
  );
}

function runErrorMessage(event: unknown) {
  if (event === null || typeof event !== "object" || !("type" in event)) {
    return undefined;
  }

  const candidate = event as { type?: unknown; message?: unknown };
  return candidate.type === "RUN_ERROR" && typeof candidate.message === "string"
    ? candidate.message
    : undefined;
}

function textChunk(event: unknown) {
  if (event === null || typeof event !== "object" || !("type" in event)) {
    return "";
  }

  const candidate = event as { type?: unknown; delta?: unknown };
  return candidate.type === "TEXT_MESSAGE_CONTENT" && typeof candidate.delta === "string"
    ? candidate.delta
    : "";
}

export function reasoningTraceDetail(event: unknown) {
  if (event === null || typeof event !== "object" || !("type" in event)) {
    return undefined;
  }

  const candidate = event as { type?: unknown; delta?: unknown };
  if (candidate.type !== "REASONING_MESSAGE_CONTENT" || typeof candidate.delta !== "string") {
    return undefined;
  }

  const detail = candidate.delta.trim();
  return detail.length > 0 ? detail.slice(0, 1_500) : undefined;
}
