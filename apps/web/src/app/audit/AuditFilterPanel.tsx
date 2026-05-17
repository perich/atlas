import React from "react";
import { AUDIT_SEVERITIES, AUDIT_STATUSES, RAILS } from "@bankops/contracts";

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
