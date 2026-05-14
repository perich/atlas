import React from "react";
import type { AuditEntry } from "@bankops/contracts";
import { AUDIT_SEVERITIES, AUDIT_STATUSES, RAILS } from "@bankops/contracts";

import { AuditColumnLayoutMenu, type ColumnLayoutUpdate } from "./AuditColumnLayoutMenu";
import type { AuditColumnLayout } from "./audit-column-layout";
import { TIME_RANGES, type TimeRangeValue } from "./audit-time-range";
import type { AuditQueryState } from "./use-audit-window";
import { Panel } from "../../design/components";

const TIME_OPTIONS = TIME_RANGES.map((range) => ({ label: range.label, value: range.value }));
const SEVERITY_OPTIONS = [
  { label: "All", value: "all" },
  ...AUDIT_SEVERITIES.map((value) => ({ label: value, value })),
] satisfies FilterOption<"all" | AuditEntry["severity"]>[];
const RAIL_OPTIONS = [
  { label: "All", value: "all" },
  ...RAILS.map((value) => ({ label: value, value })),
] satisfies FilterOption<"all" | NonNullable<AuditEntry["rail"]>>[];
const STATUS_OPTIONS = [
  { label: "All", value: "all" },
  ...AUDIT_STATUSES.map((value) => ({ label: value, value })),
] satisfies FilterOption<"all" | AuditEntry["status"]>[];

type FilterOption<T extends string> = {
  label: string;
  value: T;
};

export function AuditFilterPanel({
  columnLayout,
  newestRowTs,
  onColumnLayoutChange,
  queryState,
  renderTrace,
  selectedTimeRange,
  setQueryState,
}: {
  columnLayout: AuditColumnLayout;
  newestRowTs: number | undefined;
  onColumnLayoutChange: (update: ColumnLayoutUpdate) => void;
  queryState: AuditQueryState;
  renderTrace: React.ReactNode;
  selectedTimeRange: TimeRangeValue;
  setQueryState: (state: AuditQueryState) => void;
}) {
  return (
    <Panel className="flex flex-wrap items-end gap-4">
      {renderTrace}

      <div className="flex flex-wrap items-end gap-3">
        <FilterSelect
          label="Time"
          onChange={(value) => {
            const range = TIME_RANGES.find((item) => item.value === value);
            const nextFilters = { ...queryState.filters };

            delete nextFilters.tsFrom;
            delete nextFilters.tsTo;

            if (range?.durationMs !== undefined && newestRowTs !== undefined) {
              nextFilters.tsFrom = newestRowTs - range.durationMs;
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
              filters: {
                ...queryState.filters,
                severity: value === "all" ? undefined : [value],
              },
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
              filters: {
                ...queryState.filters,
                rail: value === "all" ? undefined : [value],
              },
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
              filters: {
                ...queryState.filters,
                status: value === "all" ? undefined : [value],
              },
              sort: queryState.sort,
            })
          }
          options={STATUS_OPTIONS}
          value={queryState.filters.status?.[0] ?? "all"}
        />

        <AuditColumnLayoutMenu layout={columnLayout} onChange={onColumnLayoutChange} />
      </div>
    </Panel>
  );
}

function FilterSelect<T extends string>({
  ariaLabel,
  label,
  onChange,
  options,
  value,
}: {
  ariaLabel?: string;
  label: string;
  onChange: (value: T) => void;
  options: readonly FilterOption<T>[];
  value: T;
}) {
  const select = (
    <select
      aria-label={ariaLabel}
      className="h-9 rounded-md border border-white/10 bg-black/30 px-2 text-xs normal-case tracking-normal text-white"
      onChange={(event) => onChange(options[event.currentTarget.selectedIndex]?.value ?? value)}
      value={value}
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );

  if (label === "") {
    return select;
  }

  return (
    <label className="grid gap-1 text-xs font-semibold uppercase tracking-[0.12em] text-bankops-muted">
      {label}
      {select}
    </label>
  );
}
