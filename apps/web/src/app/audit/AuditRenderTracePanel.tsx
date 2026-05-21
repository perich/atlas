import React from "react";

import {
  useMainThreadBlockingP95,
  type MainThreadBlockingP95Snapshot,
} from "./use-main-thread-blocking-p95";
import type { AuditWindowCache } from "./audit-window";

export function AuditRenderTracePanel({
  cache,
  firstVirtualIndex,
  lastVirtualIndex,
  mountedRows,
  rows,
}: {
  cache: AuditWindowCache;
  firstVirtualIndex: number | undefined;
  lastVirtualIndex: number | undefined;
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
  const leadingTraceMetrics = [
    { label: "Visible Range", value: visibleRange },
    { label: "Mounted Rows", value: mountedRows.toLocaleString() },
    { label: "Query Latency", value: `${cache.queryMs.toFixed(1)}ms` },
  ];
  const trailingTraceMetrics = [
    { label: "Rows Cached", testId: "audit-rows-cached", value: rows.toLocaleString() },
    { label: "Windows", value: cache.windows.length.toLocaleString() },
    { className: "col-span-2", label: "Loaded", value: loadedRange || "-" },
  ];

  return (
    <section
      aria-label="Render trace"
      className="mx-4 mt-4 grid min-h-14 shrink-0 grid-cols-8 overflow-x-auto rounded-[4px] border border-white/[0.07] bg-bankops-sidebar/65 text-xs text-bankops-muted"
    >
      {leadingTraceMetrics.map((metric) => (
        <TraceMetric key={metric.label} label={metric.label} value={metric.value} />
      ))}
      <LongTaskP95TraceMetric />
      {trailingTraceMetrics.map((metric) => (
        <TraceMetric
          key={metric.label}
          className={metric.className}
          label={metric.label}
          testId={metric.testId}
          value={metric.value}
        />
      ))}
    </section>
  );
}

function LongTaskP95TraceMetric() {
  const mainThreadBlockingP95 = useMainThreadBlockingP95();

  return (
    <TraceMetric
      label="Long-task p95"
      title={longTaskP95Title(mainThreadBlockingP95)}
      value={longTaskP95Value(mainThreadBlockingP95)}
    />
  );
}

function longTaskP95Value(snapshot: MainThreadBlockingP95Snapshot): string {
  switch (snapshot.status) {
    case "pending":
      return "checking";
    case "unsupported":
      return "n/a";
    case "observing":
      return "none";
    case "sampled":
      return `${snapshot.p95.toFixed(1)}ms`;
  }

  const exhaustive: never = snapshot;
  return exhaustive;
}

function longTaskP95Title(snapshot: MainThreadBlockingP95Snapshot): string {
  switch (snapshot.status) {
    case "pending":
      return "Checking whether this browser exposes PerformanceObserver long-task entries.";
    case "unsupported":
      return "This browser does not expose PerformanceObserver long-task entries.";
    case "observing":
      return "Long Tasks API is available, but this route session has not reported any main-thread task over 50ms.";
    case "sampled":
      return "p95 duration from reported Long Tasks API entries. The browser only reports main-thread tasks over 50ms.";
  }

  const exhaustive: never = snapshot;
  return exhaustive;
}

function TraceMetric({
  className,
  label,
  testId,
  title,
  value,
}: {
  className?: string;
  label: string;
  testId?: string;
  title?: string;
  value: string;
}) {
  return (
    <dl
      className={`flex flex-col justify-center gap-1 border-r border-white/[0.06] px-3 last:border-r-0 ${className ?? ""}`}
    >
      <dt className="font-mono text-[9px] font-semibold uppercase leading-none tracking-[0.16em] text-bankops-subtle">
        {label}
      </dt>
      <dd
        className="max-w-full truncate font-mono text-xs font-medium leading-none text-bankops-text"
        data-testid={testId}
        title={title ?? value}
      >
        {value}
      </dd>
    </dl>
  );
}
