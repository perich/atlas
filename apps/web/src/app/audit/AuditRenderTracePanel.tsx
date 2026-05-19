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
  const visibleRange =
    firstVirtualIndex === undefined || lastVirtualIndex === undefined
      ? "-"
      : `${firstVirtualIndex}-${lastVirtualIndex}`;
  const traceMetrics = [
    { label: "Visible Range", value: visibleRange },
    { label: "Mounted Rows", value: mountedRows.toLocaleString() },
    { label: "Query Latency", value: `${cache.queryMs.toFixed(1)}ms` },
    {
      label: "Long-task p95",
      title:
        "Browser PerformanceObserver long-task p95. It is n/a until the browser reports supported samples.",
      value: mainThreadBlockingP95 === undefined ? "n/a" : `${mainThreadBlockingP95.toFixed(1)}ms`,
    },
    { label: "Rows Cached", testId: "audit-rows-cached", value: rows.toLocaleString() },
    { label: "Windows", value: cache.windows.length.toLocaleString() },
    { label: "Loaded", value: loadedRange || "-" },
    { label: "Scroll", value: "virtual" },
  ];

  return (
    <section
      aria-label="Render trace"
      className="grid min-h-14 grid-cols-8 overflow-x-auto border-b border-white/[0.06] bg-bankops-sidebar text-xs text-bankops-muted"
    >
      {traceMetrics.map((metric) => (
        <TraceMetric
          key={metric.label}
          label={metric.label}
          testId={metric.testId}
          title={metric.title}
          value={metric.value}
        />
      ))}
    </section>
  );
}

function TraceMetric({
  label,
  testId,
  title,
  value,
}: {
  label: string;
  testId?: string;
  title?: string;
  value: string;
}) {
  return (
    <dl className="flex flex-col justify-center gap-1 border-r border-white/[0.06] px-3 last:border-r-0">
      <dt className="font-mono text-[9px] font-semibold uppercase leading-none tracking-[0.16em] text-bankops-subtle">
        {label}
      </dt>
      <dd
        className="max-w-36 truncate font-mono text-xs font-medium leading-none text-bankops-text"
        data-testid={testId}
        title={title ?? value}
      >
        {value}
      </dd>
    </dl>
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
