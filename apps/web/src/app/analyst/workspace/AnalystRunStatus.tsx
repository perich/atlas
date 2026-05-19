import React from "react";
import { Clock3 } from "lucide-react";
import type { AnalystReportRunPhase } from "@bankops/contracts";

export function AnalystRunStatus({
  completedDurationSeconds,
  error,
  isEmpty,
  phase,
  statusMessage,
}: {
  completedDurationSeconds: number | null;
  error: string | null;
  isEmpty: boolean;
  phase: AnalystReportRunPhase;
  statusMessage: string | null;
}) {
  const status = statusMessage ?? phaseStatusCopy(phase, isEmpty);
  const statusTone = error
    ? "bg-bankops-negative-strong"
    : isEmpty
      ? "bg-bankops-subtle"
      : "bg-bankops-accent";
  const completedDuration =
    completedDurationSeconds === null
      ? null
      : completedDurationSeconds < 60
        ? `${completedDurationSeconds}s`
        : `${Math.floor(completedDurationSeconds / 60)}m ${String(
            completedDurationSeconds % 60,
          ).padStart(2, "0")}s`;

  return (
    <div className="flex min-h-10 flex-wrap items-center justify-between gap-3">
      <div className="flex min-w-0 items-center gap-3">
        <p className="font-mono text-[9px] font-semibold uppercase tracking-[0.18em] text-bankops-subtle">
          Run status
        </p>
        <span className="h-3 w-px bg-white/[0.06]" />
        <span className="inline-flex min-w-0 items-center gap-1.5">
          <span className={`size-1.5 rounded-full ${statusTone}`} />
          <span className="truncate font-mono text-[11px] text-bankops-muted">{status}</span>
        </span>
      </div>

      <div className="flex items-center gap-3 font-mono text-xs text-bankops-muted">
        {completedDuration ? (
          <span className="inline-flex items-center gap-2">
            <Clock3 className="size-3.5" />
            Generated in {completedDuration}
          </span>
        ) : isEmpty ? (
          <span className="text-[10px] text-bankops-subtle">No active run</span>
        ) : null}
      </div>

      {error ? (
        <p className="basis-full truncate text-xs leading-5 text-bankops-negative/90">{error}</p>
      ) : null}
    </div>
  );
}

function phaseStatusCopy(phase: AnalystReportRunPhase, isEmpty: boolean) {
  if (isEmpty) {
    return "Idle";
  }
  if (phase === "querying") {
    return "Querying analyst tools";
  }
  if (phase === "validating") {
    return "Validating report";
  }
  if (phase === "repairing") {
    return "Repairing report";
  }
  if (phase === "done") {
    return "Done";
  }
  if (phase === "error") {
    return "Error";
  }
  return "Generating report";
}
