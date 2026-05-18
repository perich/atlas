import React from "react";
import { FileText, Loader2, Play, RotateCcw, Sparkles } from "lucide-react";

import { Button } from "../../design/components";
import { cn } from "../../design/utils";
import { ANALYST_PROMPT_CHIPS } from "./analyst-prompts";

export function AnalystControlRail({
  hasReport,
  isEmpty,
  isRunning,
  onNewAnalysis,
  onQuestionChange,
  onSubmit,
  question,
}: {
  hasReport: boolean;
  isEmpty: boolean;
  isRunning: boolean;
  onNewAnalysis: () => void;
  onQuestionChange: (question: string) => void;
  onSubmit: () => void;
  question: string;
}) {
  const mode = hasReport ? "refine" : "create";

  return (
    <form
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
    >
      <div>
        <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.13em] text-bankops-muted">
          {mode === "refine" ? (
            <FileText className="size-3.5 text-sky-300" />
          ) : (
            <Sparkles className="size-3.5 text-sky-300" />
          )}
          {mode === "refine" ? "Revise report" : "Create report"}
        </p>
        <p className="mt-2 text-sm leading-6 text-bankops-muted">
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
          className="mt-2 min-h-28 w-full resize-none rounded-md border border-white/[0.08] bg-black/25 p-3 text-sm leading-6 text-bankops-text outline-none transition-colors placeholder:text-bankops-muted focus:border-white/20"
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
          <p className="text-[10px] font-semibold uppercase tracking-[0.13em] text-bankops-muted">
            Starter prompts
          </p>
          <div className="flex flex-wrap gap-2">
            {ANALYST_PROMPT_CHIPS.map((chip) => (
              <button
                className={cn(
                  "rounded-full border border-white/[0.1] bg-white/[0.025] px-3 py-1.5 text-left text-[11px] leading-4 text-bankops-muted transition-colors hover:border-sky-300/30 hover:bg-sky-300/[0.05] hover:text-white",
                  question === chip && "border-sky-300/45 bg-sky-300/[0.09] text-white",
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
        <div className="rounded-md border border-sky-300/15 bg-sky-300/[0.035] p-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.13em] text-sky-200/90">
            Follow-up examples
          </p>
          <p className="mt-2 text-xs leading-5 text-bankops-muted">
            Narrow the scope, swap chart emphasis, add evidence rows, or ask for a different
            operational recommendation.
          </p>
        </div>
      )}

      <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2">
        <Button className="w-full" disabled={!question.trim() || isRunning} type="submit">
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
  );
}
