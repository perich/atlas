import React from "react";
import { AlertTriangle, CheckCircle2, Clock3, Loader2 } from "lucide-react";

import { cn } from "../../design/utils";

export function AnalystRunStatus({
  completedDurationSeconds,
  error,
  isEmpty,
  isRunning,
  statusMessage,
}: {
  completedDurationSeconds: number | null;
  error: string | null;
  isEmpty: boolean;
  isRunning: boolean;
  statusMessage: string | null;
}) {
  const status = statusMessage ?? (isEmpty ? "Idle" : "Done");
  const Icon = error ? AlertTriangle : isRunning ? Loader2 : CheckCircle2;

  return (
    <div className="flex min-h-9 flex-wrap items-center justify-between gap-3">
      <div className="flex min-w-0 items-center gap-3">
        <span
          className={cn(
            "inline-flex size-7 shrink-0 items-center justify-center rounded-md border",
            error
              ? "border-rose-300/20 bg-rose-300/[0.06] text-rose-200"
              : isRunning
                ? "border-sky-300/20 bg-sky-300/[0.06] text-sky-200"
                : "border-emerald-300/15 bg-emerald-300/[0.04] text-emerald-200",
          )}
        >
          <Icon className={cn("size-3.5", isRunning && "animate-spin")} />
        </span>
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-bankops-muted">
            Run status
          </p>
          <p className="truncate text-sm text-bankops-text">{status}</p>
        </div>
      </div>

      <div className="flex items-center gap-3 font-mono text-xs text-bankops-muted">
        {completedDurationSeconds !== null ? (
          <span className="inline-flex items-center gap-2">
            <Clock3 className="size-3.5" />
            Generated in {formatDuration(completedDurationSeconds)}
          </span>
        ) : null}
      </div>

      {error ? (
        <p className="basis-full truncate text-xs leading-5 text-rose-200/90">{error}</p>
      ) : null}
    </div>
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
