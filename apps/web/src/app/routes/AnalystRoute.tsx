import React, { useEffect, useState } from "react";
import {
  Activity,
  AlertTriangle,
  Bot,
  Braces,
  CheckCircle2,
  Clock3,
  Loader2,
  Play,
  RotateCcw,
  ShieldCheck,
  Terminal,
} from "lucide-react";

import { AnalystReportRenderer } from "../analyst/AnalystReportRenderer";
import type { AnalystProgressEvent, AnalystTraceEvent } from "../analyst/useAnalystRun";
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
                New analysis
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
            progressEvents={analystRun.progressEvents}
            report={analystRun.report}
            startedAt={analystRun.startedAt}
            traceEvents={analystRun.traceEvents}
            validationAttempts={analystRun.validationAttempts}
          />
        </main>
      </div>
    </div>
  );
}

function AnalystCanvas({
  error,
  isRunning,
  progressEvents,
  report,
  startedAt,
  traceEvents,
  validationAttempts,
}: {
  error: string | null;
  isRunning: boolean;
  progressEvents: AnalystProgressEvent[];
  report: unknown;
  startedAt: number | null;
  traceEvents: AnalystTraceEvent[];
  validationAttempts: number;
}) {
  if (isRunning) {
    return (
      <RunTracePanel
        error={null}
        progressEvents={progressEvents}
        startedAt={startedAt}
        traceEvents={traceEvents}
        validationAttempts={validationAttempts}
      />
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
      <RunTracePanel
        error={error}
        progressEvents={progressEvents}
        startedAt={startedAt}
        traceEvents={traceEvents}
        validationAttempts={validationAttempts}
      />
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

function RunTracePanel({
  error,
  progressEvents,
  startedAt,
  traceEvents,
  validationAttempts,
}: {
  error: string | null;
  progressEvents: AnalystProgressEvent[];
  startedAt: number | null;
  traceEvents: AnalystTraceEvent[];
  validationAttempts: number;
}) {
  const elapsed = useElapsedSeconds(startedAt);
  const currentFact = progressEvents.at(-1);
  const recentFacts = progressEvents.slice(-10).reverse();
  const recentTrace = traceEvents.slice(-5).reverse();

  return (
    <div
      className={cn(
        "min-h-[520px] rounded-md border bg-bankops-panel p-5",
        error ? "border-rose-300/20" : "border-white/[0.08]",
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-white/[0.08] pb-4">
        <div>
          <p className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-bankops-muted">
            {error ? (
              <AlertTriangle className="size-3.5 text-rose-300" />
            ) : (
              <Loader2 className="size-3.5 animate-spin text-sky-300" />
            )}
            {error ? "Report validation failed" : "Generating Analyst Report"}
          </p>
          <h2 className="mt-2 text-xl font-semibold tracking-tight text-white">
            CodeMode run trace
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-bankops-muted">
            Observable execution facts from BankOps tools, validation, and CodeMode runtime events.
          </p>
        </div>
        <div className="grid gap-2 text-right font-mono text-[11px] text-bankops-muted">
          <span className="inline-flex items-center justify-end gap-2">
            <Clock3 className="size-3.5" />
            {elapsed}s elapsed
          </span>
          <span>{validationAttempts} validation attempts</span>
        </div>
      </div>

      {error ? (
        <div className="mt-4 rounded-md border border-rose-300/20 bg-rose-300/[0.05] p-3">
          <p className="text-sm font-medium text-white">Run failed</p>
          <p className="mt-1 text-xs leading-5 text-rose-100/85">{error}</p>
        </div>
      ) : null}

      <section className="mt-4 rounded-md border border-white/[0.08] bg-black/20 p-4">
        <p className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-bankops-muted">
          <Activity className="size-3.5 text-sky-300" />
          Current execution fact
        </p>
        <p className="mt-3 text-base font-semibold text-white">
          {currentFact?.label ?? "Starting CodeMode run"}
        </p>
        <p className="mt-2 text-sm leading-6 text-bankops-muted">
          {currentFact?.detail ?? "Waiting for the first server-side trace event."}
        </p>
      </section>

      <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1.05fr)_minmax(360px,0.95fr)]">
        <section className="rounded-md border border-white/[0.08] bg-black/20 p-4">
          <p className="mb-3 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-bankops-muted">
            <CheckCircle2 className="size-3.5 text-emerald-300" />
            Observable facts
          </p>
          <div className="space-y-2">
            {recentFacts.length ? (
              recentFacts.map((event, index) => (
                <TraceFact
                  event={event}
                  isCurrent={index === 0}
                  key={`${event.at}-${event.label}`}
                />
              ))
            ) : (
              <p className="text-sm text-bankops-muted">No execution facts have arrived yet.</p>
            )}
          </div>
        </section>

        <section className="rounded-md border border-white/[0.08] bg-black/25 p-4">
          <p className="mb-3 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-bankops-muted">
            <Terminal className="size-3.5 text-sky-300" />
            Raw runtime trace
          </p>
          <div className="space-y-2">
            {recentTrace.length ? (
              recentTrace.map((event) => (
                <RawTrace event={event} key={`${event.at}-${event.source}-${event.label}`} />
              ))
            ) : (
              <p className="text-sm text-bankops-muted">Waiting for model or tool trace output.</p>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

function TraceFact({ event, isCurrent }: { event: AnalystProgressEvent; isCurrent: boolean }) {
  return (
    <div
      className={cn(
        "rounded-md border px-3 py-2",
        isCurrent ? "border-sky-300/24 bg-sky-300/[0.06]" : "border-white/[0.06] bg-black/20",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-white">{event.label}</p>
        <time className="shrink-0 font-mono text-[10px] text-bankops-muted">
          {formatTraceTime(event.at)}
        </time>
      </div>
      {event.detail ? (
        <p className="mt-1 text-xs leading-5 text-bankops-muted">{event.detail}</p>
      ) : null}
    </div>
  );
}

function RawTrace({ event }: { event: AnalystTraceEvent }) {
  return (
    <div className="rounded-md border border-white/[0.06] bg-black/25 px-3 py-2">
      <div className="flex items-center justify-between gap-3">
        <span
          className={cn(
            "text-[10px] font-semibold uppercase tracking-[0.12em]",
            traceSourceClass(event.source),
          )}
        >
          {event.source}
        </span>
        <time className="font-mono text-[10px] text-bankops-muted">
          {formatTraceTime(event.at)}
        </time>
      </div>
      <p className="mt-1 font-mono text-xs text-bankops-text">{event.label}</p>
      {event.detail ? (
        <p className="mt-1 line-clamp-3 whitespace-pre-wrap font-mono text-[11px] leading-5 text-bankops-muted">
          {event.detail}
        </p>
      ) : null}
    </div>
  );
}

function useElapsedSeconds(startedAt: number | null) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!startedAt) {
      return undefined;
    }

    const interval = window.setInterval(() => setNow(Date.now()), 1_000);
    return () => window.clearInterval(interval);
  }, [startedAt]);

  return startedAt ? Math.max(Math.floor((now - startedAt) / 1_000), 0) : 0;
}

function formatTraceTime(value: string) {
  return new Date(value).toLocaleTimeString([], { hour12: false });
}

function traceSourceClass(source: AnalystTraceEvent["source"]) {
  if (source === "tool") {
    return "text-emerald-300";
  }
  if (source === "validation") {
    return "text-amber-300";
  }
  if (source === "model") {
    return "text-sky-300";
  }
  if (source === "codemode") {
    return "text-violet-300";
  }
  return "text-bankops-muted";
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
