import React from "react";
import type { AuditEntry, AuditSort } from "@bankops/contracts";
import { Columns3, Database, ListFilter, Rows3 } from "lucide-react";

import { useAuditWindow } from "../audit/use-audit-window";
import { PageHeader, Panel, StatCard } from "../../design/components";

export function AuditRoute() {
  const { cache, facets, isFetching, loadVisibleRange, queryState, rows, setQueryState } =
    useAuditWindow();
  const mountedRows = rows.length;
  const visibleRows = rows.slice(0, 30);
  const failedCount = facets?.status.failed ?? 0;

  return (
    <div className="space-y-5">
      <PageHeader eyebrow="Bank Core Audit" title="Balance sheet movement history" />

      <section className="grid gap-3 xl:grid-cols-4">
        <StatCard
          icon={Database}
          label="Matched rows"
          value={cache.totalMatched.toLocaleString()}
        />
        <StatCard icon={Rows3} label="Rows cached" value={mountedRows.toLocaleString()} />
        <StatCard
          icon={ListFilter}
          label="Failed"
          value={isFetching ? "Fetching" : failedCount.toLocaleString()}
        />
        <StatCard icon={Columns3} label="Windows" value={String(cache.windows.length)} />
      </section>

      <Panel className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-bankops-muted">
          Status
          <select
            className="rounded-md border border-white/10 bg-black/30 px-2 py-1 text-xs normal-case tracking-normal text-white"
            onChange={(event) =>
              setQueryState({ filters: statusFilter(event.target.value), sort: queryState.sort })
            }
            value={queryState.filters.status?.[0] ?? "all"}
          >
            <option value="all">All</option>
            <option value="failed">Failed</option>
            <option value="pending">Pending</option>
            <option value="posted">Posted</option>
            <option value="settled">Settled</option>
          </select>
        </label>

        <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-bankops-muted">
          Sort
          <select
            className="rounded-md border border-white/10 bg-black/30 px-2 py-1 text-xs normal-case tracking-normal text-white"
            onChange={(event) =>
              setQueryState({
                filters: queryState.filters,
                sort: { dir: "desc", field: sortField(event.target.value) },
              })
            }
            value={queryState.sort.field}
          >
            <option value="ts">Time</option>
            <option value="severity">Severity</option>
            <option value="rail">Rail</option>
          </select>
        </label>

        <button
          className="rounded-md border border-white/10 px-3 py-1 text-xs font-semibold text-white hover:bg-white/10"
          onClick={() => {
            void loadVisibleRange({ start: Math.max(0, mountedRows - 45), end: mountedRows });
          }}
          type="button"
        >
          Load next window
        </button>
      </Panel>

      <Panel className="overflow-hidden p-0">
        <div className="grid grid-cols-[150px_110px_1fr_150px_120px_110px] border-b border-white/[0.075] bg-white/[0.025] px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-bankops-muted">
          <span>Time</span>
          <span>Severity</span>
          <span>Summary</span>
          <span>Amount</span>
          <span>Rail</span>
          <span>Status</span>
        </div>
        {visibleRows.map((row) => (
          <div
            className="grid grid-cols-[150px_110px_1fr_150px_120px_110px] border-b border-white/[0.055] px-4 py-2 font-mono text-xs last:border-b-0"
            key={row.id}
          >
            <span className="text-bankops-muted">{formatTime(row.ts)}</span>
            <span className={row.severity === "critical" ? "text-rose-300" : "text-bankops-muted"}>
              {row.severity}
            </span>
            <span className="truncate text-white">{row.summary}</span>
            <span className="text-white">{formatMinor(row.amountMinor)}</span>
            <span className="text-bankops-muted">{row.rail ?? "-"}</span>
            <span className="text-bankops-muted">{row.status}</span>
          </div>
        ))}
      </Panel>
    </div>
  );
}

function formatTime(timestamp: number) {
  const seconds = Math.floor(timestamp / 1_000);
  const hour = Math.floor(seconds / 3_600) % 24;
  const minute = Math.floor(seconds / 60) % 60;
  const second = seconds % 60;

  return [hour, minute, second].map((part) => String(part).padStart(2, "0")).join(":");
}

function statusFilter(value: string) {
  switch (value) {
    case "failed":
    case "pending":
    case "posted":
    case "settled":
      return { status: [value] } satisfies { status: AuditEntry["status"][] };
    default:
      return {};
  }
}

function sortField(value: string): AuditSort["field"] {
  switch (value) {
    case "rail":
    case "severity":
    case "ts":
      return value;
    default:
      return "ts";
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
