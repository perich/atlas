import React from "react";
import { Clock3 } from "lucide-react";

export function AnalystRunStatus({
  completedDurationSeconds,
  error,
  isEmpty,
  statusMessage,
}: {
  completedDurationSeconds: number | null;
  error: string | null;
  isEmpty: boolean;
  statusMessage: string | null;
}) {
  const status = statusMessage ?? (isEmpty ? "Idle" : "Done");

  return (
    <div className="flex min-h-9 flex-wrap items-center justify-between gap-3">
      <div className="min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-bankops-muted">
          Run status
        </p>
        <p className="truncate text-sm text-bankops-text">{status}</p>
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
