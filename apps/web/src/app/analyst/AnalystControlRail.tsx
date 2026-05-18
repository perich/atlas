import React from "react";
import { AlertTriangle, FileText, Loader2, Play, RotateCcw, Sparkles } from "lucide-react";

import { Button } from "../../design/components";
import { cn } from "../../design/utils";
import { ANALYST_PROMPT_CHIPS } from "./analyst-prompts";

export function AnalystControlRail({
  completedDurationSeconds,
  error,
  hasReport,
  isEmpty,
  isRunning,
  onNewAnalysis,
  onQuestionChange,
  onSubmit,
  question,
  statusMessage,
}: {
  completedDurationSeconds: number | null;
  error: string | null;
  hasReport: boolean;
  isEmpty: boolean;
  isRunning: boolean;
  onNewAnalysis: () => void;
  onQuestionChange: (question: string) => void;
  onSubmit: () => void;
  question: string;
  statusMessage: string | null;
}) {
  const mode = hasReport ? "refine" : "create";

  return (
    <>
      <form
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit();
        }}
      >
        <div className="rounded-md border border-white/[0.08] bg-black/20 p-4">
          <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.13em] text-bankops-muted">
            {mode === "refine" ? (
              <FileText className="size-3.5 text-sky-300" />
            ) : (
              <Sparkles className="size-3.5 text-sky-300" />
            )}
            {mode === "refine" ? "Revise report" : "Create report"}
          </p>
          <p className="mt-2 text-sm leading-6 text-bankops-text">
            {mode === "refine"
              ? "Ask for a focused change to the current report. The next run replaces the report with a newly validated version."
              : "Describe the operational view you want. CodeMode will query bounded BankOps data tools, assemble a report, validate it, and render the result here."}
          </p>
        </div>

        <label className="block">
          <span className="text-[11px] font-semibold uppercase tracking-[0.13em] text-bankops-muted">
            {mode === "refine" ? "Change request" : "Ask"}
          </span>
          <textarea
            className="mt-2 min-h-32 w-full resize-none rounded-md border border-white/[0.08] bg-black/25 p-3 text-sm leading-6 text-bankops-text outline-none transition-colors placeholder:text-bankops-muted focus:border-white/20"
            onChange={(event) => onQuestionChange(event.target.value)}
            placeholder={
              mode === "refine"
                ? "Example: focus this report on ACH failures and add a customer priority table..."
                : "Example: find the most interesting operating pattern in today's audit log..."
            }
            value={question}
          />
        </label>

        {mode === "create" ? (
          <div className="space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.13em] text-bankops-muted">
              Starter prompts
            </p>
            <div className="grid gap-2">
              {ANALYST_PROMPT_CHIPS.map((chip) => (
                <button
                  className={cn(
                    "rounded-md border border-white/[0.08] bg-black/20 px-3 py-2 text-left text-xs leading-5 text-bankops-muted transition-colors hover:border-white/18 hover:bg-white/[0.04] hover:text-white",
                    question === chip && "border-sky-300/30 bg-sky-300/[0.06] text-white",
                  )}
                  disabled={isRunning}
                  key={chip}
                  onClick={() => onQuestionChange(chip)}
                  type="button"
                >
                  {chip}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="rounded-md border border-sky-300/15 bg-sky-300/[0.04] p-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.13em] text-sky-200/90">
              Follow-up examples
            </p>
            <p className="mt-2 text-xs leading-5 text-bankops-muted">
              Narrow the scope, swap chart emphasis, add evidence rows, or ask for a different
              operational recommendation.
            </p>
          </div>
        )}

        <div className="flex gap-2">
          <Button disabled={!question.trim() || isRunning} type="submit">
            {isRunning ? (
              <Loader2 aria-hidden="true" className="size-4 animate-spin" />
            ) : (
              <Play aria-hidden="true" className="size-4" />
            )}
            {hasReport ? "Refine" : "Generate"}
          </Button>
          <Button disabled={isEmpty || isRunning} onClick={onNewAnalysis} variant="secondary">
            <RotateCcw aria-hidden="true" className="size-4" />
            New analysis
          </Button>
        </div>
      </form>

      <div className="mt-5 rounded-md border border-white/[0.08] bg-black/20 p-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.13em] text-bankops-muted">
          Run status
        </p>
        <p className="mt-2 text-sm text-bankops-text">
          {statusMessage ?? (isEmpty ? "Idle" : "Done")}
        </p>
        {completedDurationSeconds !== null ? (
          <p className="mt-2 font-mono text-xs text-bankops-muted">
            Generated in {formatDuration(completedDurationSeconds)}
          </p>
        ) : null}
        {error ? (
          <p className="mt-2 flex gap-2 text-xs leading-5 text-rose-200">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" />
            {error}
          </p>
        ) : null}
      </div>
    </>
  );
}

function formatDuration(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  if (minutes === 0) {
    return `${seconds}s`;
  }

  return `${minutes}m ${String(seconds).padStart(2, "0")}s`;
}
