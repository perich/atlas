import React, { useState } from "react";
import { AlertTriangle, Bot, Braces, Loader2, Play, RotateCcw, ShieldCheck } from "lucide-react";

import { AnalystReportRenderer } from "../analyst/AnalystReportRenderer";
import { useAnalystRun } from "../analyst/useAnalystRun";
import { Button, PageHeader } from "../../design/components";
import { cn } from "../../design/utils";

const promptChips = [
  "Find the riskiest operating pattern in today's audit log",
  "Show rail health and exception pressure by hour",
  "Which customers need operations attention before cutoff?",
];

export function AnalystRoute() {
  const [question, setQuestion] = useState(promptChips[0]);
  const analystRun = useAnalystRun();
  const isEmpty = !analystRun.report && !analystRun.error && !analystRun.isRunning;

  return (
    <div className="min-h-[calc(100vh-5.25rem)] rounded-md border border-white/[0.08] bg-bankops-bg">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-white/[0.08] bg-bankops-sidebar px-6 py-5">
        <PageHeader eyebrow="CodeMode Analyst" title="Analyst workspace" />
        <div className="flex gap-3">
          <StatusPill icon={Bot} label="Model" value="Server configured" />
          <StatusPill icon={Braces} label="Output" value="Validated spec" />
          <StatusPill icon={ShieldCheck} label="Renderer" value="BankOps owned" />
        </div>
      </div>

      <div className="grid min-h-[calc(100vh-12rem)] xl:grid-cols-[360px_minmax(0,1fr)]">
        <aside className="border-b border-white/[0.08] bg-bankops-sidebar p-5 xl:border-b-0 xl:border-r">
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              void analystRun.run(question.trim());
            }}
          >
            <label className="block">
              <span className="text-[11px] font-semibold uppercase tracking-[0.13em] text-bankops-muted">
                Ask
              </span>
              <textarea
                className="mt-2 min-h-32 w-full resize-none rounded-md border border-white/[0.08] bg-black/25 p-3 text-sm leading-6 text-bankops-text outline-none transition-colors placeholder:text-bankops-muted focus:border-white/20"
                onChange={(event) => setQuestion(event.target.value)}
                placeholder="Explain what you want to see..."
                value={question}
              />
            </label>

            <div className="space-y-2">
              <p className="text-[11px] font-semibold uppercase tracking-[0.13em] text-bankops-muted">
                Prompt chips
              </p>
              <div className="grid gap-2">
                {promptChips.map((chip) => (
                  <button
                    className={cn(
                      "rounded-md border border-white/[0.08] bg-black/20 px-3 py-2 text-left text-xs leading-5 text-bankops-muted transition-colors hover:border-white/18 hover:bg-white/[0.04] hover:text-white",
                      question === chip && "border-sky-300/30 bg-sky-300/[0.06] text-white",
                    )}
                    disabled={analystRun.isRunning}
                    key={chip}
                    onClick={() => setQuestion(chip)}
                    type="button"
                  >
                    {chip}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-2">
              <Button disabled={!question.trim() || analystRun.isRunning} type="submit">
                {analystRun.isRunning ? (
                  <Loader2 aria-hidden="true" className="size-4 animate-spin" />
                ) : (
                  <Play aria-hidden="true" className="size-4" />
                )}
                {analystRun.report ? "Refine" : "Generate"}
              </Button>
              <Button
                onClick={() => {
                  setQuestion("");
                  analystRun.reset();
                }}
                variant="secondary"
              >
                <RotateCcw aria-hidden="true" className="size-4" />
                Reset
              </Button>
            </div>
          </form>

          <div className="mt-5 rounded-md border border-white/[0.08] bg-black/20 p-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.13em] text-bankops-muted">
              Run status
            </p>
            <p className="mt-2 text-sm text-bankops-text">
              {analystRun.statusMessage ?? (isEmpty ? "Idle" : "Done")}
            </p>
            {analystRun.error ? (
              <p className="mt-2 flex gap-2 text-xs leading-5 text-rose-200">
                <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                {analystRun.error}
              </p>
            ) : null}
          </div>
        </aside>

        <main className="p-5">
          <AnalystCanvas
            error={analystRun.error}
            isRunning={analystRun.isRunning}
            report={analystRun.report}
          />
        </main>
      </div>
    </div>
  );
}

function AnalystCanvas({
  error,
  isRunning,
  report,
}: {
  error: string | null;
  isRunning: boolean;
  report: unknown;
}) {
  if (isRunning) {
    return (
      <div className="grid min-h-[520px] place-items-center rounded-md border border-white/[0.08] bg-bankops-panel">
        <div className="text-center">
          <Loader2 className="mx-auto size-7 animate-spin text-sky-300" />
          <p className="mt-3 text-sm font-medium text-white">Generating Analyst Report</p>
          <p className="mt-2 text-xs text-bankops-muted">Waiting for validated report snapshot.</p>
        </div>
      </div>
    );
  }

  if (report) {
    return (
      <div className="rounded-md border border-white/[0.08] bg-black/20 p-5">
        <AnalystReportRenderer report={report} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="grid min-h-[520px] place-items-center rounded-md border border-rose-300/20 bg-rose-300/[0.04]">
        <div className="max-w-md text-center">
          <AlertTriangle className="mx-auto size-7 text-rose-300" />
          <p className="mt-3 text-sm font-medium text-white">Report validation failed</p>
          <p className="mt-2 text-xs leading-5 text-bankops-muted">
            The renderer only accepts complete AnalystReportSpec snapshots.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid min-h-[520px] place-items-center rounded-md border border-dashed border-white/[0.12] bg-bankops-panel">
      <div className="max-w-md text-center">
        <Braces className="mx-auto size-8 text-sky-300/80" />
        <p className="mt-3 text-sm font-medium text-white">No active report</p>
        <p className="mt-2 text-xs leading-5 text-bankops-muted">
          Ask an operational question to render a validated Analyst Report snapshot.
        </p>
      </div>
    </div>
  );
}

function StatusPill({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-2 rounded-md border border-white/[0.08] bg-black/20 px-3 py-2">
      <Icon className="size-4 text-sky-300/85" />
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-bankops-muted">
          {label}
        </p>
        <p className="text-xs text-bankops-text">{value}</p>
      </div>
    </div>
  );
}
