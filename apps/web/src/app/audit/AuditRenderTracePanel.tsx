import React, { useSyncExternalStore } from "react";

import type { AuditWindowCache } from "./audit-window";

const LONG_TASK_SAMPLE_LIMIT = 40;
const longTaskSamples: number[] = [];
const longTaskListeners = new Set<() => void>();
let longTaskObserverStarted = false;
let latestLongTaskP95: number | undefined;

export function useMainThreadBlockingP95() {
  return useSyncExternalStore(subscribeToLongTasks, readLongTaskP95, readLongTaskP95);
}

export function AuditRenderTracePanel({
  cache,
  firstVirtualIndex,
  lastVirtualIndex,
  mainThreadBlockingP95,
  mountedRows,
  rows,
}: {
  cache: AuditWindowCache;
  firstVirtualIndex: number | undefined;
  lastVirtualIndex: number | undefined;
  mainThreadBlockingP95: number | undefined;
  mountedRows: number;
  rows: number;
}) {
  const loadedRange = cache.windows
    .map((window) => `${window.start}-${window.start + window.rows.length - 1}`)
    .join(", ");

  return (
    <section
      aria-label="Render trace"
      className="flex min-w-[280px] flex-1 flex-wrap items-center gap-x-5 gap-y-2 text-xs text-bankops-muted"
    >
      <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-bankops-muted/75">
        Render trace
      </div>
      <dl className="flex flex-wrap items-center gap-x-5 gap-y-2">
        <TraceMetric
          label="Visible range"
          value={
            firstVirtualIndex === undefined || lastVirtualIndex === undefined
              ? "-"
              : `${firstVirtualIndex}-${lastVirtualIndex}`
          }
        />
        <TraceMetric label="Mounted rows" value={mountedRows.toLocaleString()} />
        <TraceMetric label="Query latency" value={`${cache.queryMs.toFixed(1)}ms`} />
        <TraceMetric
          label="Main-thread p95"
          value={
            mainThreadBlockingP95 === undefined ? "n/a" : `${mainThreadBlockingP95.toFixed(1)}ms`
          }
        />
        <TraceMetric label="Rows cached" testId="audit-rows-cached" value={rows.toLocaleString()} />
        <TraceMetric label="Windows" value={cache.windows.length.toLocaleString()} />
        <TraceMetric label="Loaded ranges" value={loadedRange || "-"} />
      </dl>
    </section>
  );
}

function TraceMetric({ label, testId, value }: { label: string; testId?: string; value: string }) {
  return (
    <div>
      <dt className="text-[9px] font-semibold uppercase tracking-[0.12em] text-bankops-muted/60">
        {label}
      </dt>
      <dd
        className="mt-0.5 max-w-32 truncate font-mono text-[11px] leading-none text-bankops-text"
        data-testid={testId}
        title={value}
      >
        {value}
      </dd>
    </div>
  );
}

function subscribeToLongTasks(listener: () => void) {
  longTaskListeners.add(listener);
  startLongTaskObserver();

  return () => longTaskListeners.delete(listener);
}

function readLongTaskP95() {
  return latestLongTaskP95;
}

function startLongTaskObserver() {
  if (
    longTaskObserverStarted ||
    typeof PerformanceObserver === "undefined" ||
    !PerformanceObserver.supportedEntryTypes.includes("longtask")
  ) {
    return;
  }

  longTaskObserverStarted = true;
  new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      longTaskSamples.push(entry.duration);
    }

    if (longTaskSamples.length > LONG_TASK_SAMPLE_LIMIT) {
      longTaskSamples.splice(0, longTaskSamples.length - LONG_TASK_SAMPLE_LIMIT);
    }

    latestLongTaskP95 = percentile(longTaskSamples, 0.95);
    longTaskListeners.forEach((listener) => listener());
  }).observe({ entryTypes: ["longtask"] });
}

function percentile(values: number[], point: number) {
  if (values.length === 0) {
    return 0;
  }

  const sorted = values.slice();
  sorted.sort((left, right) => left - right);
  const index = Math.min(sorted.length - 1, Math.floor((sorted.length - 1) * point));

  return sorted[index];
}
