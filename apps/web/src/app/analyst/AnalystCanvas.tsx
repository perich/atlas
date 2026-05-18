import React from "react";
import { Braces } from "lucide-react";

import { AnalystReportRenderer } from "./AnalystReportRenderer";
import { AnalystRunTracePanel } from "./AnalystRunTracePanel";
import type { AnalystProgressEvent, AnalystTraceEvent } from "./useAnalystRun";

export function AnalystCanvas({
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
      <AnalystRunTracePanel
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
      <AnalystRunTracePanel
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
