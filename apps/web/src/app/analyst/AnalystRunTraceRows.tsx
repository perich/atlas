import React from "react";

import { cn } from "../../design/utils";
import type { AnalystProgressEvent, AnalystTraceEvent } from "./useAnalystRun";

export function TraceFact({
  event,
  isCurrent,
}: {
  event: AnalystProgressEvent;
  isCurrent: boolean;
}) {
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

export function RawTrace({ event }: { event: AnalystTraceEvent }) {
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
