import { chat, maxIterations, toolDefinition, type AnyTextAdapter } from "@tanstack/ai";
import { createCodeMode } from "@tanstack/ai-code-mode";
import { createOpenRouterText } from "@tanstack/ai-openrouter";
import {
  analystReportSpecSchema,
  type AnalystReportSpec,
  type AnalystRunEvent,
} from "@bankops/contracts";
import { z } from "zod";

import {
  ANALYST_CODE_MODE_SCAFFOLD,
  ANALYST_CODE_MODE_TIMEOUT_MS,
  ANALYST_MAX_ATTEMPTS,
  ANALYST_SYSTEM_PROMPT,
  analystModelOptions,
  analystUserPrompt,
  reasoningTraceDelta,
  reasoningTraceSnippet,
} from "./analyst-run-policy.js";
import { emitAnalystProgress, emitAnalystTrace } from "./analyst-run-events.js";
import { createAnalystDataTools } from "./analyst-tools.js";
import { createAnalystIsolateDriver } from "./isolate-driver.js";

type RunAnalystReportInput = {
  question: string;
  emit: (event: AnalystRunEvent) => void;
  env?: NodeJS.ProcessEnv;
  abortController?: AbortController;
};
type AttemptInput = {
  attempt: number;
  validationError?: string;
};
const codeModeConsoleEventSchema = z.object({
  type: z.literal("CUSTOM"),
  data: z.object({
    name: z.literal("code_mode:console"),
    message: z.string(),
  }),
});
const runErrorEventSchema = z.object({
  type: z.literal("RUN_ERROR"),
  message: z.string(),
});
const textMessageContentEventSchema = z.object({
  type: z.literal("TEXT_MESSAGE_CONTENT"),
  delta: z.string(),
});

export async function runAnalystCodeMode({
  emit,
  abortController,
  env = process.env,
  question,
}: RunAnalystReportInput): Promise<AnalystReportSpec> {
  const apiKey = env.OPENROUTER_API_KEY;
  const model = env.ANALYST_MODEL;

  if (!apiKey || !model) {
    throw new Error("OPENROUTER_API_KEY and ANALYST_MODEL must be configured");
  }

  emitAnalystProgress(
    emit,
    "Starting CodeMode run",
    "Opening server-side OpenRouter CodeMode session",
  );
  emitAnalystTrace(emit, "runtime", "Configured analyst model", model);
  const driver = await createAnalystIsolateDriver();
  emitAnalystProgress(
    emit,
    "Prepared sandbox",
    "Node isolate driver ready for bounded analyst tools",
  );

  return runAnalystReportAttempts({
    emit,
    runAttempt: async ({ attempt, validationError }) => {
      let submittedReport: AnalystReportSpec | undefined;
      let assistantText = "";
      let reasoningBuffer = "";
      const flushReasoningTrace = () => {
        const detail = reasoningTraceSnippet(reasoningBuffer);
        reasoningBuffer = "";
        if (detail !== undefined) {
          emitAnalystTrace(emit, "model", "Reasoning trace", detail);
        }
      };
      const submitTool = createSubmitReportTool((report) => {
        emitAnalystProgress(
          emit,
          "Submitting AnalystReportSpec",
          `${report.blocks.length} report blocks`,
        );
        emitAnalystTrace(emit, "runtime", "external_submit_report", report.title);
        submittedReport = report;
      });
      const { tool: attemptTool, systemPrompt: attemptSystemPrompt } = createCodeMode({
        driver,
        memoryLimit: 128,
        timeout: ANALYST_CODE_MODE_TIMEOUT_MS,
        tools: [...createAnalystDataTools(emit), submitTool],
      });

      emitAnalystProgress(
        emit,
        attempt === 1 ? "Planning bounded analyst queries" : "Repairing report submission",
        validationError ?? "CodeMode can call capped BankOps analyst tools only",
      );
      emitAnalystTrace(emit, "runtime", `Attempt ${attempt}`, validationError ?? question);

      const stream = chat({
        adapter: createAnalystAdapter(model, apiKey),
        abortController,
        agentLoopStrategy: maxIterations(24),
        maxTokens: 20_000,
        messages: [
          {
            role: "user",
            content: analystUserPrompt({ question, validationError }),
          },
        ],
        modelOptions: analystModelOptions(),
        systemPrompts: [ANALYST_SYSTEM_PROMPT, ANALYST_CODE_MODE_SCAFFOLD, attemptSystemPrompt],
        tools: [attemptTool],
      });

      for await (const event of stream) {
        const runError = runErrorMessage(event);

        if (runError !== undefined) {
          emitAnalystTrace(emit, "runtime", "Run error", runError);
          throw new Error(runError);
        }

        const text = textChunk(event);
        assistantText += text;
        if (text.trim()) {
          emitAnalystTrace(emit, "model", "Assistant text", text.trim().slice(0, 1_500));
        }

        const reasoning = reasoningTraceDelta(event);
        if (reasoning !== undefined) {
          reasoningBuffer += reasoning;
          if (reasoningBuffer.length >= 180) {
            flushReasoningTrace();
          }
        }

        const consoleEvent = codeModeConsoleEvent(event);
        if (consoleEvent !== undefined) {
          emitAnalystProgress(emit, "CodeMode milestone", consoleEvent.data.message.slice(0, 500));
          emitAnalystTrace(emit, "codemode", "console.log", consoleEvent.data.message);
          emit({ type: "code", code: consoleEvent.data.message });
        }
      }

      flushReasoningTrace();

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

  for (let attempt = 1; attempt <= ANALYST_MAX_ATTEMPTS; attempt += 1) {
    emit({ type: "phase", phase: attempt === 1 ? "generating" : "repairing" });
    emitAnalystTrace(
      emit,
      "runtime",
      attempt === 1 ? "Generation attempt started" : "Repair attempt started",
      `Attempt ${attempt} of ${ANALYST_MAX_ATTEMPTS}`,
    );

    try {
      // oxlint-disable-next-line eslint/no-await-in-loop -- repair attempts must use the previous validation error.
      const candidate = await runAttempt({ attempt, validationError });
      emit({ type: "phase", phase: "validating" });
      emitAnalystProgress(emit, "Validating AnalystReportSpec", `Attempt ${attempt}`);
      const report = analystReportSpecSchema.parse(candidate);

      emit({ attempt, ok: true, type: "validation" });
      emitAnalystProgress(emit, `Validation attempt ${attempt} passed`, report.title);
      emitAnalystTrace(
        emit,
        "validation",
        "Report validation passed",
        `${report.blocks.length} blocks`,
      );
      emit({ report, type: "report" });
      emitAnalystProgress(
        emit,
        "Rendering validated report",
        "Swapping in complete report snapshot",
      );
      emit({ type: "phase", phase: "done" });

      return report;
    } catch (error) {
      validationError = error instanceof Error ? error.message : "Invalid Analyst Report";
      emit({ attempt, message: validationError, ok: false, type: "validation" });
      emitAnalystProgress(emit, `Validation attempt ${attempt} failed`, validationError);
      emitAnalystTrace(emit, "validation", "Report validation failed", validationError);

      if (attempt === ANALYST_MAX_ATTEMPTS) {
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

function codeModeConsoleEvent(event: unknown) {
  const parsed = codeModeConsoleEventSchema.safeParse(event);
  return parsed.success ? parsed.data : undefined;
}

function runErrorMessage(event: unknown) {
  const parsed = runErrorEventSchema.safeParse(event);
  return parsed.success ? parsed.data.message : undefined;
}

function textChunk(event: unknown) {
  const parsed = textMessageContentEventSchema.safeParse(event);
  return parsed.success ? parsed.data.delta : "";
}
