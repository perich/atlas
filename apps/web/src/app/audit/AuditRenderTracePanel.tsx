import React from "react";

import type { AuditWindowCache } from "./audit-window";

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
      className="mx-4 mt-4 grid min-h-14 shrink-0 grid-cols-8 overflow-x-auto rounded-[4px] border border-white/[0.07] bg-bankops-sidebar/65 text-xs text-bankops-muted"
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
