import React from "react";
import type { AuditEntry, AuditSort } from "@bankops/contracts";
import { RAILS } from "@bankops/contracts";

import {
  AuditCellValue,
  AuditColumnLayoutMenu,
  AuditHeaderCell,
  AuditRowCell,
  type ColumnLayoutUpdate,
} from "./AuditColumnControls";
import type { JsonAuditEntry } from "./audit-api";
import {
  moveAuditColumn,
  resizeAuditColumn,
  type AuditColumnId,
  type AuditColumnLayout,
  type SizedAuditColumn,
} from "./audit-column-layout";
import type { AuditWindowCache } from "./audit-window";
import type { AuditQueryState } from "./use-audit-window";
import { Panel } from "../../design/components";

const AUDIT_HEADER_HEIGHT = 38;
const SORT_FIELD_BY_COLUMN_ID: Partial<Record<AuditColumnId, AuditSort["field"]>> = {
  kind: "kind",
  rail: "rail",
  severity: "severity",
  status: "status",
  ts: "ts",
};
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
] satisfies FilterOption<"all" | AuditEntry["severity"]>[];
const RAIL_OPTIONS = [
  { label: "All", value: "all" },
  ...RAILS.map((value) => ({ label: value, value })),
] satisfies FilterOption<"all" | NonNullable<AuditEntry["rail"]>>[];
const STATUS_OPTIONS = [
  { label: "All", value: "all" },
  ...STATUSES.map((value) => ({ label: value, value })),
] satisfies FilterOption<"all" | AuditEntry["status"]>[];
// Width classes for loading skeleton bars, tuned to resemble each column's real content.
// Each array is cycled by row so placeholder rows do not look mechanically duplicated.
const LOADING_CELL_WIDTH_CLASSES_BY_COLUMN: Record<AuditColumnId, readonly string[]> = {
  action: ["w-2/3", "w-3/4", "w-4/5"],
  actor: ["w-2/5", "w-1/2", "w-3/5"],
  amountMinor: ["w-2/3", "w-3/4", "w-4/5"],
  customerId: ["w-1/2", "w-3/5", "w-2/3"],
  kind: ["w-1/2", "w-3/5", "w-2/3"],
  rail: ["w-2/5", "w-1/2", "w-3/5"],
  severity: ["w-1/2", "w-3/5", "w-2/3"],
  status: ["w-1/2", "w-3/5", "w-2/3"],
  subject: ["w-2/3", "w-3/4", "w-4/5"],
  traceId: ["w-2/3", "w-3/4", "w-4/5"],
  ts: ["w-3/4", "w-4/5", "w-11/12"],
};

export type TimeRangeValue = (typeof TIME_RANGES)[number]["value"];

type AuditVirtualItem = {
  index: number;
  key: React.Key;
  size: number;
  start: number;
};

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

export function AuditTablePanel({
  cache,
  draggedColumnId,
  hasError,
  isFetching,
  rowByIndex,
  scrollRef,
  queryState,
  setColumnLayout,
  setDraggedColumnId,
  setQueryState,
  tableWidth,
  virtualRows,
  virtualizerTotalSize,
  visibleColumns,
}: {
  cache: AuditWindowCache;
  draggedColumnId: AuditColumnId | undefined;
  hasError: boolean;
  isFetching: boolean;
  rowByIndex: Map<number, JsonAuditEntry>;
  scrollRef: React.RefObject<HTMLDivElement | null>;
  queryState: AuditQueryState;
  setColumnLayout: (update: ColumnLayoutUpdate) => void;
  setDraggedColumnId: (columnId: AuditColumnId | undefined) => void;
  setQueryState: (state: AuditQueryState) => void;
  tableWidth: number;
  virtualRows: AuditVirtualItem[];
  virtualizerTotalSize: number;
  visibleColumns: SizedAuditColumn[];
}) {
  return (
    <Panel className="overflow-hidden p-0">
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
        <div
          className="sticky top-0 z-30 flex min-w-full border-b border-white/[0.075] bg-[#15181a] px-4 text-[11px] font-semibold uppercase tracking-[0.12em] text-bankops-muted"
          style={{ height: `${AUDIT_HEADER_HEIGHT}px`, width: `${tableWidth}px` }}
        >
          {visibleColumns.map((column) => {
            const field = SORT_FIELD_BY_COLUMN_ID[column.id];

            return (
              <AuditHeaderCell
                column={column}
                draggedColumnId={draggedColumnId}
                key={column.id}
                onDragEnd={() => setDraggedColumnId(undefined)}
                onDragStart={setDraggedColumnId}
                onDrop={(beforeColumnId) => {
                  if (draggedColumnId !== undefined) {
                    setColumnLayout((layout) =>
                      moveAuditColumn(layout, draggedColumnId, beforeColumnId),
                    );
                  }

                  setDraggedColumnId(undefined);
                }}
                onResize={(width) =>
                  setColumnLayout((layout) => resizeAuditColumn(layout, column.id, width))
                }
                onSort={
                  field === undefined
                    ? undefined
                    : () => {
                        setQueryState({
                          filters: queryState.filters,
                          sort: {
                            field,
                            dir:
                              queryState.sort.field === field && queryState.sort.dir === "desc"
                                ? "asc"
                                : "desc",
                          },
                        });
                      }
                }
                sortable={field !== undefined}
                sortDir={queryState.sort.field === field ? queryState.sort.dir : undefined}
              />
            );
          })}
        </div>
        {cache.totalMatched === 0 && !isFetching ? (
          <div className="grid h-full place-items-center text-sm text-bankops-muted">
            No audit rows match these filters.
          </div>
        ) : null}
        <div
          className="relative w-max min-w-full"
          style={{
            height: `${virtualizerTotalSize}px`,
            width: `${tableWidth}px`,
          }}
        >
          {virtualRows.map((virtualRow) => (
            <AuditVirtualRow
              key={virtualRow.key}
              row={rowByIndex.get(virtualRow.index)}
              tableWidth={tableWidth}
              virtualRow={virtualRow}
              visibleColumns={visibleColumns}
            />
          ))}
        </div>
      </div>
    </Panel>
  );
}

export function timeRangeValue(
  tsFrom: number | undefined,
  newestTs: number | undefined,
): TimeRangeValue {
  if (tsFrom === undefined || newestTs === undefined) {
    return "all";
  }

  const durationMs = newestTs - tsFrom;
  const range = TIME_RANGES.find((item) => item.durationMs === durationMs);

  return range?.value ?? "all";
}

function AuditVirtualRow({
  row,
  tableWidth,
  virtualRow,
  visibleColumns,
}: {
  row: JsonAuditEntry | undefined;
  tableWidth: number;
  virtualRow: AuditVirtualItem;
  visibleColumns: SizedAuditColumn[];
}) {
  if (row === undefined) {
    return (
      <div
        aria-label="Loading audit row"
        className="absolute left-0 top-0 flex min-w-full items-center border-b border-white/[0.045] bg-[linear-gradient(90deg,rgba(56,189,248,0.025),rgba(255,255,255,0.012)_36%,rgba(255,255,255,0))] px-4"
        data-testid="audit-row-placeholder"
        style={{
          height: `${virtualRow.size}px`,
          transform: `translateY(${virtualRow.start}px)`,
          width: `${tableWidth}px`,
        }}
      >
        {visibleColumns.map((column) => (
          <AuditRowCell column={column} key={column.id}>
            <AuditLoadingCell columnId={column.id} rowIndex={virtualRow.index} />
          </AuditRowCell>
        ))}
      </div>
    );
  }

  return (
    <div
      className="absolute left-0 top-0 flex min-w-full items-center border-b border-white/[0.055] px-4 font-mono text-xs leading-none text-bankops-muted"
      data-testid="audit-row"
      style={{
        height: `${virtualRow.size}px`,
        transform: `translateY(${virtualRow.start}px)`,
        width: `${tableWidth}px`,
      }}
    >
      {visibleColumns.map((column) => (
        <AuditRowCell column={column} key={column.id}>
          <AuditCellValue columnId={column.id} row={row} />
        </AuditRowCell>
      ))}
    </div>
  );
}

function AuditLoadingCell({ columnId, rowIndex }: { columnId: AuditColumnId; rowIndex: number }) {
  const widthClasses = LOADING_CELL_WIDTH_CLASSES_BY_COLUMN[columnId];
  const widthClass = widthClasses[rowIndex % widthClasses.length];

  return (
    <span
      aria-hidden="true"
      className={`h-2.5 rounded-full bg-[linear-gradient(90deg,rgba(148,163,184,0.12),rgba(226,232,240,0.24),rgba(148,163,184,0.12))] shadow-[0_0_18px_rgba(125,211,252,0.05)] motion-safe:animate-pulse ${widthClass}`}
    />
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
