import React from "react";
import { ChevronDown, Loader2 } from "lucide-react";

import { cn } from "../../../design/utils";
import { ANALYST_PROMPT_CHIPS } from "./analyst-prompts";

export function AnalystControlRail({
  isEmpty,
  isRunning,
  onNewAnalysis,
  onQuestionChange,
  onSubmit,
  question,
}: {
  isEmpty: boolean;
  isRunning: boolean;
  onNewAnalysis: () => void;
  onQuestionChange: (question: string) => void;
  onSubmit: () => void;
  question: string;
}) {
  const [showHowItWorks, setShowHowItWorks] = React.useState(false);

  return (
    <div className="space-y-5">
      <label className="block">
        <span className="font-mono text-[9px] font-semibold uppercase tracking-[0.18em] text-bankops-subtle">
          Question
        </span>
        <div className="mt-2 overflow-hidden rounded-[4px] border border-white/[0.10] bg-bankops-panel transition-colors focus-within:border-bankops-accent/45">
          <textarea
            className="min-h-[120px] w-full resize-none border-0 bg-transparent p-3 text-sm leading-6 text-bankops-text outline-none placeholder:text-bankops-muted"
            onChange={(event) => onQuestionChange(event.target.value)}
            placeholder="Describe what you want to analyze..."
            value={question}
          />
          <div className="flex items-center justify-between border-t border-white/[0.06] bg-black/20 p-2">
            <span className="font-mono text-[9px] text-bankops-subtle">
              {question.length} chars
            </span>
            <div className="flex items-center gap-1.5">
              <button
                className="inline-flex h-8 items-center rounded-[3px] px-2.5 text-xs text-bankops-subtle transition-colors hover:bg-white/[0.035] hover:text-bankops-text disabled:cursor-not-allowed disabled:opacity-45"
                disabled={isEmpty || isRunning}
                onClick={onNewAnalysis}
                title="New analysis"
                type="button"
              >
                Reset
                <span className="sr-only">New analysis</span>
              </button>
              <button
                className="inline-flex h-8 items-center justify-center gap-2 rounded-[3px] bg-bankops-accent px-4 text-xs font-semibold text-bankops-bg transition-colors hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-45"
                disabled={!question.trim() || isRunning}
                onClick={onSubmit}
                type="button"
              >
                {isRunning ? <Loader2 aria-hidden="true" className="size-4 animate-spin" /> : null}
                Generate
              </button>
            </div>
          </div>
        </div>
      </label>

      <div className="space-y-2">
        <p className="font-mono text-[9px] font-semibold uppercase tracking-[0.18em] text-bankops-subtle">
          Example prompts
          <span className="sr-only">Starter prompts</span>
        </p>
        <div className="flex flex-wrap gap-2">
          {ANALYST_PROMPT_CHIPS.map((chip) => (
            <button
              className={cn(
                "inline-flex min-h-8 items-center rounded-[3px] border border-white/[0.08] bg-transparent px-2.5 font-mono text-[11px] leading-none text-bankops-muted transition-colors hover:bg-bankops-surface hover:text-bankops-text",
                question === chip.prompt &&
                  "border-bankops-accent/40 bg-bankops-accent/[0.08] text-cyan-100",
              )}
              disabled={isRunning}
              key={chip.label}
              onClick={() => onQuestionChange(chip.prompt)}
              type="button"
            >
              {chip.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <button
          aria-label={`${showHowItWorks ? "Hide" : "Show"} how it works`}
          aria-expanded={showHowItWorks}
          className="flex w-full items-center justify-between border-t border-white/[0.06] pt-4 font-mono text-[9px] font-semibold uppercase tracking-[0.18em] text-bankops-subtle transition-colors hover:text-bankops-text"
          onClick={() => setShowHowItWorks((value) => !value)}
          type="button"
        >
          <span>How it works</span>
          <ChevronDown
            aria-hidden="true"
            className={cn("size-3 transition-transform", showHowItWorks && "rotate-180")}
          />
        </button>

        {showHowItWorks ? (
          <div className="mt-3 space-y-3 border-l border-bankops-accent/25 pl-3.5">
            <HowItWorksStep
              body="Ask for patterns, risks, customers, rails, or exceptions."
              number="1"
              title="Describe"
            />
            <HowItWorksStep
              body="Runs bounded CodeMode queries with observable progress."
              number="2"
              title="Generate"
            />
            <HowItWorksStep
              body="Validated reports render as charts, tables, and summaries."
              number="3"
              title="Review"
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}

function HowItWorksStep({ body, number, title }: { body: string; number: string; title: string }) {
  return (
    <div>
      <div className="flex items-baseline gap-2">
        <span className="font-mono text-sm font-semibold leading-none text-bankops-accent">
          {number}
        </span>
        <span className="text-xs font-semibold text-bankops-text">{title}</span>
      </div>
      <p className="mt-1 pl-5 text-[11px] leading-5 text-bankops-muted">{body}</p>
    </div>
  );
}
