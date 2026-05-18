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
        <div className="mt-2 overflow-hidden rounded-md border border-white/[0.08] bg-black/25 transition-colors focus-within:border-white/20">
          <textarea
            className="min-h-28 w-full resize-none border-0 bg-transparent p-3 text-sm leading-6 text-bankops-text outline-none placeholder:text-bankops-muted"
            onChange={(event) => onQuestionChange(event.target.value)}
            placeholder={
              mode === "refine"
                ? "Example: focus this report on ACH failures and add a customer priority table..."
                : "Example: find the most interesting operating pattern in today's audit log..."
            }
            value={question}
          />
          <div className="grid grid-cols-[minmax(0,1fr)_2rem] gap-2 border-t border-white/[0.08] bg-black/20 p-2">
            <Button className="w-full" disabled={!question.trim() || isRunning} type="submit">
              {isRunning ? (
                <Loader2 aria-hidden="true" className="size-4 animate-spin" />
              ) : (
                <Play aria-hidden="true" className="size-4" />
              )}
              {hasReport ? "Refine" : "Generate"}
            </Button>
            <button
              aria-label="New analysis"
              className="inline-flex size-8 items-center justify-center border border-white/[0.08] bg-[#1a1c1f] text-bankops-muted transition-colors hover:border-white/18 hover:bg-white/[0.06] hover:text-bankops-text disabled:cursor-not-allowed disabled:opacity-45"
              disabled={isEmpty || isRunning}
              onClick={onNewAnalysis}
              title="New analysis"
              type="button"
            >
              <RotateCcw aria-hidden="true" className="size-4" />
              <span className="sr-only">New analysis</span>
            </button>
          </div>
        </div>
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
                  "inline-flex h-6 items-center rounded-full border border-white/[0.12] bg-[#15191d] px-2.5 font-semibold uppercase tracking-[0.12em] text-bankops-muted shadow-[0_1px_0_rgba(255,255,255,0.05)_inset,0_6px_14px_rgba(0,0,0,0.16)] transition-colors hover:border-sky-300/35 hover:bg-[#18222a] hover:text-white",
                  question === chip.prompt &&
                    "border-sky-300/50 bg-sky-300/[0.1] text-sky-100 shadow-[0_1px_0_rgba(255,255,255,0.08)_inset,0_0_0_1px_rgba(125,211,252,0.08)]",
                )}
                disabled={isRunning}
                key={chip.label}
                onClick={() => onQuestionChange(chip.prompt)}
                style={{ fontSize: 12, lineHeight: 1 }}
                type="button"
              >
                {chip.label}
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
    </form>
  );
}
