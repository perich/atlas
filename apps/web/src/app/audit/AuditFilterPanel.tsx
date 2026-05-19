import React from "react";
import { AUDIT_SEVERITIES, AUDIT_STATUSES, RAILS } from "@bankops/contracts";
import { X } from "lucide-react";

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
import { Panel } from "../../design/components";
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
  renderTrace,
  selectedTimeRange,
  setQueryState,
}: {
  columnLayout: AuditColumnLayout;
  facets: JsonAuditFacets | undefined;
  newestRowTs: number | undefined;
  onColumnLayoutChange: (update: ColumnLayoutUpdate) => void;
  queryState: AuditQueryState;
  renderTrace: React.ReactNode;
  selectedTimeRange: TimeRangeValue;
  setQueryState: (state: AuditQueryState) => void;
}) {
  const severityOptions = auditFilterOptions(AUDIT_SEVERITIES, facets?.severity);
  const railOptions = auditFilterOptions(RAILS, facets?.rail);
  const statusOptions = auditFilterOptions(AUDIT_STATUSES, facets?.status);

  return (
    <Panel className="m-4 mb-0 overflow-hidden p-0">
      {renderTrace}

      <ActiveFilterBar
        filters={activeAuditFilters(queryState, selectedTimeRange)}
        onReset={() => setQueryState({ filters: {}, sort: queryState.sort })}
      />

      <div className="flex flex-wrap items-end gap-2.5 bg-bankops-panel px-4 py-3">
        <FilterSelect
          label="Time"
          onChange={(value) => {
            const range = TIME_RANGES.find((item) => item.value === value);

            setQueryState(
              auditQueryStateWithTimeBounds(queryState, {
                tsFrom:
                  range?.durationMs !== undefined && newestRowTs !== undefined
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

        <div className="flex-1" />
        <AuditColumnLayoutMenu layout={columnLayout} onChange={onColumnLayoutChange} />
      </div>
    </Panel>
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
    <div className="flex flex-wrap items-center gap-2 border-b border-white/[0.08] bg-[#101214] px-4 py-2">
      <span className="text-[10px] font-semibold uppercase tracking-widest text-[#5a6272]">
        Filtered
      </span>
      {filters.map((filter) => (
        <span
          className="inline-flex h-6 items-center border border-sky-300/15 bg-sky-300/[0.06] px-2 font-mono text-[10px] text-sky-100/85"
          key={filter}
        >
          {filter}
        </span>
      ))}
      <button
        className="ml-1 inline-flex h-6 items-center gap-1 border border-white/[0.08] bg-white/[0.03] px-2 text-[10px] font-semibold uppercase tracking-[0.1em] text-bankops-muted transition-colors hover:border-white/18 hover:text-bankops-text"
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
  const timeRange = TIME_RANGES.find((range) => range.value === selectedTimeRange);

  if (queryState.filters.tsFrom !== undefined || queryState.filters.tsTo !== undefined) {
    filters.push(timeRange?.value === "all" ? "time filtered" : `time: ${timeRange?.label}`);
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
  const select = (
    <select
      className="h-8 min-w-28 appearance-none rounded-md border border-white/[0.08] bg-[#1a1c1f] px-3 font-mono text-xs normal-case tracking-normal text-bankops-text outline-none transition-colors focus:ring-1 focus:ring-white/20"
      onChange={(event) => onChange(options[event.currentTarget.selectedIndex].value)}
      value={value}
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );

  return (
    <label className="grid gap-1 text-[10px] font-semibold uppercase leading-none tracking-widest text-[#5a6272]">
      {label}
      {select}
    </label>
  );
}
