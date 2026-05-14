import React, { useEffect, useMemo, useRef } from "react";
import type { AuditEntry, AuditSort } from "@bankops/contracts";
import { RAILS } from "@bankops/contracts";
import { useVirtualizer } from "@tanstack/react-virtual";
import { ArrowDown, ArrowUp, Columns3, Database, ListFilter, Rows3 } from "lucide-react";

import { useAuditWindow } from "../audit/use-audit-window";
import { PageHeader, Panel, StatCard } from "../../design/components";

const ROW_HEIGHT = 34;
const AUDIT_SCROLL_LOAD_DEBOUNCE_MS = 60;
const AUDIT_GRID_COLUMNS = "grid-cols-[130px_86px_78px_78px_150px_130px_78px_70px_72px_112px_90px]";
const AUDIT_HEADERS = [
  "Timestamp",
  "Severity",
  "Kind",
  "Actor",
  "Action",
  "Subject",
  "Customer",
  "Rail",
  "Status",
  "Amount",
  "Trace ID",
] as const;
const SORT_FIELDS = ["ts", "severity", "kind", "rail", "status"] as const;
const SEVERITIES = ["info", "notice", "warning", "critical"] as const;
const STATUSES = ["accepted", "pending", "posted", "settled", "failed", "reversed"] as const;
const TIME_RANGES = [
  { label: "All time", value: "all", durationMs: undefined },
  { label: "Newest 15m", value: "15m", durationMs: 15 * 60_000 },
  { label: "Newest 1h", value: "1h", durationMs: 60 * 60_000 },
  { label: "Newest 4h", value: "4h", durationMs: 4 * 60 * 60_000 },
] as const;
const TIME_OPTIONS = TIME_RANGES.map((range) => ({ label: range.label, value: range.value }));
const SEVERITY_OPTIONS = [
  { label: "All", value: "all" },
  ...SEVERITIES.map((value) => ({ label: value, value })),
];
const RAIL_OPTIONS = [
  { label: "All", value: "all" },
  ...RAILS.map((value) => ({ label: value, value })),
];
const STATUS_OPTIONS = [
  { label: "All", value: "all" },
  ...STATUSES.map((value) => ({ label: value, value })),
];

type TimeRangeValue = (typeof TIME_RANGES)[number]["value"];

export function AuditRoute() {
  const { cache, facets, hasError, isFetching, loadVisibleRange, queryState, rows, setQueryState } =
    useAuditWindow();
  const scrollRef = useRef<HTMLDivElement>(null);
  const rowByIndex = useMemo(() => {
    const map = new Map<number, (typeof rows)[number]>();

    for (const window of cache.windows) {
      window.rows.forEach((row, offset) => map.set(window.start + offset, row));
    }

    return map;
  }, [cache.windows]);
  const virtualizer = useVirtualizer({
    count: cache.totalMatched || rows.length,
    estimateSize: () => ROW_HEIGHT,
    getScrollElement: () => scrollRef.current,
    overscan: 12,
  });
  const virtualRows = virtualizer.getVirtualItems();
  const firstVirtualRow = virtualRows[0];
  const lastVirtualRow = virtualRows.at(-1);
  const firstVirtualIndex = firstVirtualRow?.index;
  const lastVirtualIndex = lastVirtualRow?.index;
  const mountedRows = virtualRows.length;
  const failedCount = facets?.status.failed ?? 0;
  const selectedTimeRange = timeRangeValue(queryState.filters.tsFrom, rows[0]?.ts);

  useEffect(() => {
    if (firstVirtualIndex === undefined || lastVirtualIndex === undefined) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      void loadVisibleRange({ start: firstVirtualIndex, end: lastVirtualIndex });
    }, AUDIT_SCROLL_LOAD_DEBOUNCE_MS);

    return () => window.clearTimeout(timeoutId);
  }, [firstVirtualIndex, lastVirtualIndex, loadVisibleRange]);

  return (
    <div className="space-y-5">
      <PageHeader eyebrow="Bank Core Audit" title="Balance sheet movement history" />

      <section className="grid gap-3 xl:grid-cols-4">
        <StatCard
          icon={Database}
          label="Matched rows"
          value={cache.totalMatched.toLocaleString()}
        />
        <StatCard
          icon={Rows3}
          label="Rows cached"
          value={<span data-testid="audit-rows-cached">{rows.length.toLocaleString()}</span>}
        />
        <StatCard
          icon={ListFilter}
          label="Failed"
          value={isFetching ? "Fetching" : failedCount.toLocaleString()}
        />
        <StatCard icon={Columns3} label="Mounted rows" value={mountedRows.toLocaleString()} />
      </section>

      <Panel className="flex flex-wrap items-end gap-3">
        <FilterSelect
          label="Time"
          onChange={(value) => {
            const range = TIME_RANGES.find((item) => item.value === value);
            const nextFilters = { ...queryState.filters };

            delete nextFilters.tsFrom;
            delete nextFilters.tsTo;

            if (range?.durationMs !== undefined && rows[0] !== undefined) {
              nextFilters.tsFrom = rows[0].ts - range.durationMs;
            }

            setQueryState({ filters: nextFilters, sort: queryState.sort });
          }}
          options={TIME_OPTIONS}
          value={selectedTimeRange}
        />

        <FilterSelect
          label="Severity"
          onChange={(value) =>
            setQueryState({
              filters: { ...queryState.filters, severity: severityFilter(value) },
              sort: queryState.sort,
            })
          }
          options={SEVERITY_OPTIONS}
          value={queryState.filters.severity?.[0] ?? "all"}
        />

        <FilterSelect
          label="Rail"
          onChange={(value) =>
            setQueryState({
              filters: { ...queryState.filters, rail: railFilter(value) },
              sort: queryState.sort,
            })
          }
          options={RAIL_OPTIONS}
          value={queryState.filters.rail?.[0] ?? "all"}
        />

        <FilterSelect
          label="Status"
          onChange={(value) =>
            setQueryState({
              filters: { ...queryState.filters, status: statusFilter(value) },
              sort: queryState.sort,
            })
          }
          options={STATUS_OPTIONS}
          value={queryState.filters.status?.[0] ?? "all"}
        />

        <label className="grid gap-1 text-xs font-semibold uppercase tracking-[0.12em] text-bankops-muted">
          Sort
          <div className="flex gap-2">
            <select
              aria-label="Sort field"
              className="h-9 rounded-md border border-white/10 bg-black/30 px-2 text-xs normal-case tracking-normal text-white"
              onChange={(event) =>
                setQueryState({
                  filters: queryState.filters,
                  sort: { dir: queryState.sort.dir, field: sortField(event.target.value) },
                })
              }
              value={queryState.sort.field}
            >
              {SORT_FIELDS.map((field) => (
                <option key={field} value={field}>
                  {field}
                </option>
              ))}
            </select>
            <button
              aria-label={`Sort ${queryState.sort.dir === "asc" ? "descending" : "ascending"}`}
              className="inline-flex h-9 items-center justify-center rounded-[4px] border border-white/[0.1] bg-white/[0.035] px-3 text-bankops-text transition-colors hover:border-white/18 hover:bg-white/[0.065] focus:outline-none focus:ring-2 focus:ring-white/30"
              onClick={() =>
                setQueryState({
                  filters: queryState.filters,
                  sort: {
                    field: queryState.sort.field,
                    dir: queryState.sort.dir === "asc" ? "desc" : "asc",
                  },
                })
              }
              type="button"
            >
              {queryState.sort.dir === "asc" ? (
                <ArrowUp aria-hidden="true" className="size-4" />
              ) : (
                <ArrowDown aria-hidden="true" className="size-4" />
              )}
            </button>
          </div>
        </label>
      </Panel>

      <Panel className="overflow-hidden p-0">
        <div
          className={`grid ${AUDIT_GRID_COLUMNS} border-b border-white/[0.075] bg-white/[0.035] px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-bankops-muted [&>span]:truncate [&>span]:pr-3`}
        >
          {AUDIT_HEADERS.map((header) => (
            <span key={header}>{header}</span>
          ))}
        </div>
        {hasError ? (
          <div className="border-b border-rose-300/20 bg-rose-950/25 px-4 py-3 text-sm text-rose-100">
            Audit backend unavailable. Filters and layout remain usable while the data request
            recovers.
          </div>
        ) : null}
        <div
          className="h-[620px] overflow-auto bg-black/[0.16]"
          data-testid="audit-table-scroll"
          ref={scrollRef}
        >
          {cache.totalMatched === 0 && !isFetching ? (
            <div className="grid h-full place-items-center text-sm text-bankops-muted">
              No audit rows match these filters.
            </div>
          ) : null}
          <div
            className="relative w-max min-w-full"
            style={{ height: `${virtualizer.getTotalSize()}px` }}
          >
            {virtualRows.map((virtualRow) => {
              const row = rowByIndex.get(virtualRow.index);

              if (row === undefined) {
                return (
                  <div
                    className={`absolute left-0 top-0 grid w-full min-w-[1080px] ${AUDIT_GRID_COLUMNS} items-center border-b border-white/[0.04] px-4 text-xs text-bankops-muted/55`}
                    data-testid="audit-row-placeholder"
                    key={virtualRow.key}
                    style={{
                      height: `${virtualRow.size}px`,
                      transform: `translateY(${virtualRow.start}px)`,
                    }}
                  >
                    <span>Loading</span>
                  </div>
                );
              }

              const timestamp = formatTimestamp(row.ts);

              return (
                <div
                  className={`absolute left-0 top-0 grid w-full min-w-[1080px] ${AUDIT_GRID_COLUMNS} items-center border-b border-white/[0.055] px-4 font-mono text-xs leading-none text-bankops-muted`}
                  data-testid="audit-row"
                  key={row.id}
                  style={{
                    height: `${virtualRow.size}px`,
                    transform: `translateY(${virtualRow.start}px)`,
                  }}
                >
                  <Cell title={timestamp}>{timestamp}</Cell>
                  <Cell className={severityClass(row.severity)}>{row.severity}</Cell>
                  <Cell>{row.kind}</Cell>
                  <Cell>{row.actor}</Cell>
                  <Cell title={row.action}>{row.action}</Cell>
                  <Cell title={`${row.subjectType}:${row.subjectId}`}>
                    {row.subjectType}:{row.subjectId}
                  </Cell>
                  <Cell>{row.customerId ?? "-"}</Cell>
                  <Cell>{row.rail ?? "-"}</Cell>
                  <Cell>{row.status}</Cell>
                  <Cell className="text-white">{formatMinor(row.amountMinor)}</Cell>
                  <Cell title={row.traceId}>{row.traceId}</Cell>
                </div>
              );
            })}
          </div>
        </div>
      </Panel>
    </div>
  );
}

function FilterSelect({
  label,
  onChange,
  options,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  options: { label: string; value: string }[];
  value: string;
}) {
  return (
    <label className="grid gap-1 text-xs font-semibold uppercase tracking-[0.12em] text-bankops-muted">
      {label}
      <select
        className="h-9 rounded-md border border-white/10 bg-black/30 px-2 text-xs normal-case tracking-normal text-white"
        onChange={(event) => onChange(event.target.value)}
        value={value}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function Cell({
  children,
  className = "",
  title,
}: {
  children: React.ReactNode;
  className?: string;
  title?: string;
}) {
  return (
    <span className={`truncate pr-4 ${className}`} title={title}>
      {children}
    </span>
  );
}

function timeRangeValue(tsFrom: number | undefined, newestTs: number | undefined): TimeRangeValue {
  if (tsFrom === undefined || newestTs === undefined) {
    return "all";
  }

  const durationMs = newestTs - tsFrom;
  const range = TIME_RANGES.find((item) => item.durationMs === durationMs);

  return range?.value ?? "all";
}

function severityFilter(value: string) {
  switch (value) {
    case "info":
    case "notice":
    case "warning":
    case "critical":
      return [value] satisfies AuditEntry["severity"][];
    default:
      return undefined;
  }
}

function railFilter(value: string) {
  switch (value) {
    case "ach":
    case "card":
    case "instant":
    case "internal_ledger":
    case "stablecoin":
    case "wire":
      return [value] satisfies NonNullable<AuditEntry["rail"]>[];
    default:
      return undefined;
  }
}

function statusFilter(value: string) {
  switch (value) {
    case "accepted":
    case "failed":
    case "pending":
    case "posted":
    case "reversed":
    case "settled":
      return [value] satisfies AuditEntry["status"][];
    default:
      return undefined;
  }
}

function sortField(value: string): AuditSort["field"] {
  switch (value) {
    case "kind":
    case "rail":
    case "severity":
    case "status":
    case "ts":
      return value;
    default:
      return "ts";
  }
}

function formatTimestamp(timestamp: number) {
  const date = new Date(timestamp);

  return [
    date.getUTCFullYear(),
    "-",
    String(date.getUTCMonth() + 1).padStart(2, "0"),
    "-",
    String(date.getUTCDate()).padStart(2, "0"),
    " ",
    String(date.getUTCHours()).padStart(2, "0"),
    ":",
    String(date.getUTCMinutes()).padStart(2, "0"),
    ":",
    String(date.getUTCSeconds()).padStart(2, "0"),
  ].join("");
}

function severityClass(severity: AuditEntry["severity"]) {
  switch (severity) {
    case "critical":
      return "text-rose-300";
    case "warning":
      return "text-amber-200";
    case "notice":
      return "text-sky-200";
    default:
      return "text-bankops-muted";
  }
}

function formatMinor(value: string | undefined) {
  if (value === undefined) {
    return "-";
  }

  return `$${(Number(value) / 100).toLocaleString(undefined, {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  })}`;
}
