import { chat, maxIterations, toolDefinition, type AnyTextAdapter } from "@tanstack/ai";
import { createCodeMode } from "@tanstack/ai-code-mode";
import { createOpenRouterText } from "@tanstack/ai-openrouter";
import {
  analystReportSpecSchema,
  type AnalystReportSpec,
  type AnalystRunEvent,
} from "@bankops/contracts";

import { createAnalystDataTools } from "./analyst-tools.js";
import { createAnalystIsolateDriver } from "./isolate-driver.js";

const MAX_ATTEMPTS = 4;
const CODE_MODE_TIMEOUT_MS = 60_000;

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
- Do not generate React, JSX, CSS, handlers, subscriptions, watchers, or browser code.
- Do not invent hidden scenario labels. Only describe observable audit-log facts returned by tools.
- Embed all chart, table, timeline, metric, and narrative data in the submitted report.
- Tables must contain capped rows useful for local rendering.
- Use version "2026-05-analyst-report" and an ISO datetime generatedAt value.
- If a previous report is provided, return a full replacement report, not a patch.`;

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

  const driver = await createAnalystIsolateDriver();

  return runAnalystReportAttempts({
    emit,
    runAttempt: async ({ validationError }) => {
      let submittedReport: AnalystReportSpec | undefined;
      let assistantText = "";
      const submitTool = createSubmitReportTool((report) => {
        submittedReport = report;
      });
      const { tool: attemptTool, systemPrompt: attemptSystemPrompt } = createCodeMode({
        driver,
        memoryLimit: 128,
        timeout: CODE_MODE_TIMEOUT_MS,
        tools: [...createAnalystDataTools(), submitTool],
      });

      const stream = chat({
        adapter: createAnalystAdapter(model, apiKey),
        abortController,
        agentLoopStrategy: maxIterations(8),
        maxTokens: 8192,
        messages: [
          {
            role: "user",
            content: userPrompt({ previousReport, question, validationError }),
          },
        ],
        systemPrompts: [ANALYST_SYSTEM_PROMPT, attemptSystemPrompt],
        tools: [attemptTool],
      });

      for await (const event of stream) {
        const runError = runErrorMessage(event);

        if (runError !== undefined) {
          throw new Error(runError);
        }

        assistantText += textChunk(event);

        if (isCodeModeConsoleEvent(event)) {
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

    try {
      // oxlint-disable-next-line eslint/no-await-in-loop -- repair attempts must use the previous validation error.
      const candidate = await runAttempt({ attempt, validationError });
      emit({ type: "phase", phase: "validating" });
      const report = analystReportSpecSchema.parse(candidate);

      emit({ attempt, ok: true, type: "validation" });
      emit({ report, type: "report" });
      emit({ type: "phase", phase: "done" });

      return report;
    } catch (error) {
      validationError = error instanceof Error ? error.message : "Invalid Analyst Report";
      emit({ attempt, message: validationError, ok: false, type: "validation" });

      if (attempt === MAX_ATTEMPTS) {
        throw new Error(validationError, { cause: error });
      }
    }
  }

  throw new Error("Analyst Report generation failed");
}

function createAnalystAdapter(model: string, apiKey: string): AnyTextAdapter {
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- ANALYST_MODEL is an OpenRouter slug supplied by the server environment, outside the adapter's generated model union.
  return createOpenRouterText(model as never, apiKey) as unknown as AnyTextAdapter;
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
