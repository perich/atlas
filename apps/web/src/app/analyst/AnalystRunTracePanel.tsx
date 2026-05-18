import React from "react";
import { Activity, AlertTriangle, CheckCircle2, Clock3, Loader2, Terminal } from "lucide-react";

import { cn } from "../../design/utils";
import type { AnalystProgressEvent, AnalystTraceEvent } from "./useAnalystRun";
import { useElapsedSeconds } from "./useElapsedSeconds";
import { RawTrace, TraceFact } from "./AnalystRunTraceRows";

export function AnalystRunTracePanel({
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
