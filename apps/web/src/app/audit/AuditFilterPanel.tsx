import React from "react";
import { AUDIT_SEVERITIES, AUDIT_STATUSES, RAILS } from "@bankops/contracts";
import { ChevronDown, X } from "lucide-react";

import { AuditColumnLayoutMenu, type ColumnLayoutUpdate } from "./AuditColumnLayoutMenu";
import type { JsonAuditFacets } from "./audit-api";
import type { AuditColumnLayout } from "./audit-columns";
import {
  auditQueryStateWithRailFilter,
  auditQueryStateWithSeverityFilter,
  auditQueryStateWithStatusFilter,
  auditQueryStateWithTimeBounds,
} from "./audit-query-state";
import { TIME_RANGES, type TimeRangeValue } from "./audit-time-range";
import type { AuditQueryState } from "./use-audit-window";
import { formatCount } from "../../design/format";

const TIME_OPTIONS = TIME_RANGES.map((range) => ({ label: range.label, value: range.value }));

type FilterOption<T extends string> = {
  label: string;
  value: T;
};

export function AuditFilterPanel({
  columnLayout,
  facets,
  newestRowTs,
  onColumnLayoutChange,
  queryState,
  selectedTimeRange,
  setQueryState,
}: {
  columnLayout: AuditColumnLayout;
  facets: JsonAuditFacets | undefined;
  newestRowTs: number | undefined;
  onColumnLayoutChange: (update: ColumnLayoutUpdate) => void;
  queryState: AuditQueryState;
  selectedTimeRange: TimeRangeValue;
  setQueryState: (state: AuditQueryState) => void;
}) {
  const severityOptions = auditFilterOptions(AUDIT_SEVERITIES, facets?.severity);
  const railOptions = auditFilterOptions(RAILS, facets?.rail);
  const statusOptions = auditFilterOptions(AUDIT_STATUSES, facets?.status);
  const activeFilters = activeAuditFilters(queryState, selectedTimeRange);

  return (
    <>
      <ActiveFilterBar
        filters={activeFilters}
        onReset={() => setQueryState({ filters: {}, sort: queryState.sort })}
      />

      <div className="flex min-h-14 items-center justify-between gap-3 border-b border-white/[0.06] bg-bankops-panel px-4 py-2">
        <div className="flex min-w-0 items-center gap-2">
          <FilterSelect
            label="Time"
            onChange={(value) => {
              const range = TIME_RANGES.find((item) => item.value === value)!;

              setQueryState(
                auditQueryStateWithTimeBounds(queryState, {
                  tsFrom:
                    range.durationMs !== undefined && newestRowTs !== undefined
                      ? newestRowTs - range.durationMs
                      : undefined,
                }),
              );
            }}
            options={TIME_OPTIONS}
            value={selectedTimeRange}
          />

          <FilterSelect
            label="Severity"
            onChange={(value) =>
              setQueryState(
                auditQueryStateWithSeverityFilter(queryState, value === "all" ? undefined : value),
              )
            }
            options={severityOptions}
            value={queryState.filters.severity?.[0] ?? "all"}
          />

          <FilterSelect
            label="Rail"
            onChange={(value) =>
              setQueryState(
                auditQueryStateWithRailFilter(queryState, value === "all" ? undefined : value),
              )
            }
            options={railOptions}
            value={queryState.filters.rail?.[0] ?? "all"}
          />

          <FilterSelect
            label="Status"
            onChange={(value) =>
              setQueryState(
                auditQueryStateWithStatusFilter(queryState, value === "all" ? undefined : value),
              )
            }
            options={statusOptions}
            value={queryState.filters.status?.[0] ?? "all"}
          />
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          <div className="inline-flex h-7 items-center rounded-[3px] border border-white/[0.06] px-3 font-mono text-[11px] text-bankops-muted">
            Sort: {queryState.sort.field} {queryState.sort.dir}
          </div>
          <AuditColumnLayoutMenu layout={columnLayout} onChange={onColumnLayoutChange} />
          <button
            className="inline-flex h-7 items-center rounded-[3px] px-3 font-mono text-[11px] text-bankops-subtle transition-colors hover:bg-white/[0.035] hover:text-bankops-text disabled:cursor-not-allowed disabled:opacity-45"
            disabled={activeFilters.length === 0}
            onClick={() => setQueryState({ filters: {}, sort: queryState.sort })}
            type="button"
          >
            Reset
          </button>
        </div>
      </div>
    </>
  );
}

function ActiveFilterBar({
  filters,
  onReset,
}: {
  filters: readonly string[];
  onReset: () => void;
}) {
  if (filters.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-white/[0.06] bg-bankops-sidebar px-4 py-2">
      <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-bankops-subtle">
        Filtered
      </span>
      {filters.map((filter) => (
        <span
          className="inline-flex h-6 items-center rounded-[2px] border border-bankops-accent/20 bg-bankops-accent/[0.06] px-2 font-mono text-[10px] text-cyan-100/85"
          key={filter}
        >
          {filter}
        </span>
      ))}
      <button
        className="ml-1 inline-flex h-6 items-center gap-1 rounded-[3px] border border-white/[0.06] bg-white/[0.03] px-2 font-mono text-[10px] font-semibold uppercase tracking-[0.1em] text-bankops-muted transition-colors hover:border-white/18 hover:text-bankops-text"
        onClick={onReset}
        type="button"
      >
        <X aria-hidden="true" className="size-3" />
        Reset
      </button>
    </div>
  );
}

function activeAuditFilters(
  queryState: AuditQueryState,
  selectedTimeRange: TimeRangeValue,
): string[] {
  const filters: string[] = [];
  const timeRange = TIME_RANGES.find((range) => range.value === selectedTimeRange)!;

  if (queryState.filters.tsFrom !== undefined || queryState.filters.tsTo !== undefined) {
    filters.push(timeRange.value === "all" ? "time filtered" : `time: ${timeRange.label}`);
  }

  if (queryState.filters.severity !== undefined) {
    filters.push(`severity: ${queryState.filters.severity.join(", ")}`);
  }

  if (queryState.filters.rail !== undefined) {
    filters.push(`rail: ${queryState.filters.rail.join(", ")}`);
  }

  if (queryState.filters.status !== undefined) {
    filters.push(`status: ${queryState.filters.status.join(", ")}`);
  }

  return filters;
}

function auditFilterOptions<const T extends string>(
  values: readonly T[],
  counts: Record<string, number> | undefined,
): FilterOption<"all" | T>[] {
  return [
    { label: "All", value: "all" },
    ...values.map((value) => ({
      label: counts === undefined ? value : `${value} (${formatCount(counts[value] ?? 0)})`,
      value,
    })),
  ];
}

function FilterSelect<T extends string>({
  label,
  onChange,
  options,
  value,
}: {
  label: string;
  onChange: (value: T) => void;
  options: readonly FilterOption<T>[];
  value: T;
}) {
  return (
    <label className="relative grid h-10 min-w-40 grid-rows-[auto_minmax(0,1fr)] rounded-[3px] border border-white/[0.08] bg-bankops-sidebar px-3 py-1 font-mono transition-colors focus-within:border-bankops-accent/35">
      <span className="text-center text-[8px] font-semibold uppercase leading-3 tracking-[0.16em] text-bankops-subtle">
        {label}
      </span>
      <select
        className="min-w-0 appearance-none bg-transparent px-4 text-center font-mono text-[11px] font-medium leading-5 text-bankops-text outline-none [text-align-last:center]"
        onChange={(event) => onChange(options[event.currentTarget.selectedIndex].value)}
        value={value}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <ChevronDown
        aria-hidden="true"
        className="pointer-events-none absolute right-2.5 top-1/2 size-3 -translate-y-1/2 text-bankops-subtle"
      />
    </label>
  );
}
