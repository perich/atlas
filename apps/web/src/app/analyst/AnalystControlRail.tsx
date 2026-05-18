import React from "react";
import { AlertTriangle, Loader2, Play, RotateCcw } from "lucide-react";

import { Button } from "../../design/components";
import { cn } from "../../design/utils";
import { ANALYST_PROMPT_CHIPS } from "./analyst-prompts";

export function AnalystControlRail({
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
  return (
    <>
      <form
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit();
        }}
      >
        <label className="block">
          <span className="text-[11px] font-semibold uppercase tracking-[0.13em] text-bankops-muted">
            Ask
          </span>
          <textarea
            className="mt-2 min-h-32 w-full resize-none rounded-md border border-white/[0.08] bg-black/25 p-3 text-sm leading-6 text-bankops-text outline-none transition-colors placeholder:text-bankops-muted focus:border-white/20"
            onChange={(event) => onQuestionChange(event.target.value)}
            placeholder="Explain what you want to see..."
            value={question}
          />
        </label>

        <div className="space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.13em] text-bankops-muted">
            Prompt chips
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

        <div className="flex gap-2">
          <Button disabled={!question.trim() || isRunning} type="submit">
            {isRunning ? (
              <Loader2 aria-hidden="true" className="size-4 animate-spin" />
            ) : (
              <Play aria-hidden="true" className="size-4" />
            )}
            {hasReport ? "Refine" : "Generate"}
          </Button>
          <Button onClick={onNewAnalysis} variant="secondary">
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
