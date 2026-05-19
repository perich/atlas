import React from "react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { AUDIT_SEVERITIES, AUDIT_STATUSES, RAILS } from "@bankops/contracts";
import { Check, ChevronDown } from "lucide-react";

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
  count?: number;
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
      <div className="flex min-h-14 items-center justify-between gap-3 border-b border-white/[0.06] bg-bankops-panel px-4 py-2">
        <div className="flex min-w-0 items-center gap-2 overflow-hidden">
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

          <ActiveFilterChips filters={activeFilters} />
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

function ActiveFilterChips({ filters }: { filters: readonly string[] }) {
  if (filters.length === 0) {
    return null;
  }

  return (
    <div className="ml-1 flex min-w-0 items-center gap-1.5 overflow-hidden border-l border-white/[0.08] pl-3">
      {filters.map((filter) => (
        <span
          className="inline-flex h-6 max-w-44 shrink-0 items-center truncate rounded-[2px] border border-bankops-accent/20 bg-bankops-accent/[0.06] px-2 font-mono text-[10px] text-cyan-100/85"
          key={filter}
        >
          {filter}
        </span>
      ))}
    </div>
  );
}

function auditFilterOptions<const T extends string>(
  values: readonly T[],
  counts: Record<string, number> | undefined,
): FilterOption<"all" | T>[] {
  return [
    { label: "All", value: "all" },
    ...values.map((value) => ({
      count: counts?.[value],
      label: value,
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
  const selectedOption = options.find((option) => option.value === value) ?? options[0];
  const selectOption = (nextValue: string) => {
    const nextOption = options.find((option) => option.value === nextValue);

    if (nextOption !== undefined) {
      onChange(nextOption.value);
    }
  };

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          aria-label={label}
          className="group grid h-9 min-w-40 grid-cols-[auto_minmax(4rem,1fr)_auto] items-center gap-2 rounded-[3px] border border-white/[0.08] bg-bankops-sidebar px-3 font-mono text-left transition-colors hover:border-white/[0.14] hover:bg-white/[0.025] focus-visible:border-bankops-accent/45 focus-visible:outline-none data-[state=open]:border-bankops-accent/40 data-[state=open]:bg-bankops-accent/[0.04]"
          type="button"
        >
          <span className="text-[8px] font-semibold uppercase leading-none tracking-[0.16em] text-bankops-subtle">
            {label}
          </span>
          <span className="min-w-0 truncate text-center text-[11px] font-semibold leading-none text-bankops-text">
            {selectedOption.label}
          </span>
          <ChevronDown
            aria-hidden="true"
            className="size-3 text-bankops-subtle transition-transform group-data-[state=open]:rotate-180 group-data-[state=open]:text-bankops-accent"
          />
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="start"
          className="z-50 min-w-64 rounded-[4px] border border-white/[0.10] bg-bankops-sidebar p-1.5 font-mono text-[11px] text-bankops-text shadow-2xl shadow-black/45"
          sideOffset={6}
        >
          <DropdownMenu.RadioGroup onValueChange={selectOption} value={value}>
            {options.map((option) => (
              <DropdownMenu.RadioItem
                className="flex cursor-default items-center gap-2 rounded-[3px] px-2 py-1.5 text-bankops-muted outline-none transition-colors data-[highlighted]:bg-white/[0.055] data-[highlighted]:text-bankops-text data-[state=checked]:text-bankops-text"
                key={option.value}
                value={option.value}
              >
                <span className="grid size-4 shrink-0 place-items-center">
                  <DropdownMenu.ItemIndicator className="text-bankops-accent">
                    <Check aria-hidden="true" className="size-3" />
                  </DropdownMenu.ItemIndicator>
                </span>
                <span className="min-w-0 flex-1 whitespace-nowrap capitalize">{option.label}</span>
                {option.count === undefined ? null : (
                  <span className="ml-6 text-[10px] tabular-nums text-bankops-subtle">
                    {formatCount(option.count)}
                  </span>
                )}
              </DropdownMenu.RadioItem>
            ))}
          </DropdownMenu.RadioGroup>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
