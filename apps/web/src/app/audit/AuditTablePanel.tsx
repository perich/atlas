import React from "react";

import { AuditHeaderCell, AuditRowCell } from "./AuditTableCells";
import type { ColumnLayoutUpdate } from "./AuditColumnLayoutMenu";
import type { JsonAuditEntry } from "./audit-api";
import {
  AuditColumnCellContent,
  moveAuditColumn,
  resizeAuditColumn,
  type AuditColumnId,
  type SizedAuditColumn,
} from "./audit-columns";
import { auditQueryStateWithToggledSort } from "./audit-query-state";
import type { AuditWindowCache } from "./audit-window";
import type { AuditQueryState } from "./use-audit-window";
import { Panel } from "../../design/components";
import { cn } from "../../design/utils";

const AUDIT_HEADER_HEIGHT = 38;
const AUDIT_ROW_HEIGHT = 34;
const AUDIT_INITIAL_LOADING_ROWS = 40;

type AuditVirtualItem = {
  index: number;
  key: React.Key;
  size: number;
  start: number;
};

export function AuditTablePanel({
  activeFilters,
  backgroundError,
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
  toolbar,
  virtualRows,
  virtualizerTotalSize,
  visibleColumns,
}: {
  activeFilters: readonly string[];
  backgroundError: Error | undefined;
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
  toolbar: React.ReactNode;
  virtualRows: AuditVirtualItem[];
  virtualizerTotalSize: number;
  visibleColumns: SizedAuditColumn[];
}) {
  const [liveScrollRange, setLiveScrollRange] = React.useState<{
    start: number;
    end: number;
  }>();
  const isInitialLoading = cache.windows.length === 0 && isFetching;
  const liveFallbackRows = React.useMemo(
    () => getLiveFallbackRows(cache.totalMatched, liveScrollRange, virtualRows),
    [cache.totalMatched, liveScrollRange, virtualRows],
  );
  const handleScroll = React.useCallback((event: React.UIEvent<HTMLDivElement>) => {
    const scrollElement = event.currentTarget;
    const start = Math.max(
      0,
      Math.floor((scrollElement.scrollTop - AUDIT_HEADER_HEIGHT) / AUDIT_ROW_HEIGHT),
    );
    const visibleRows = Math.ceil(scrollElement.clientHeight / AUDIT_ROW_HEIGHT);

    setLiveScrollRange({ end: start + visibleRows, start });
  }, []);

  return (
    <Panel className="m-4 flex min-h-0 flex-1 flex-col overflow-hidden border-white/[0.10] p-0">
      {hasError ? (
        <div className="border-b border-bankops-negative/20 bg-bankops-negative/[0.06] px-4 py-3 text-sm text-bankops-negative">
          Audit backend unavailable. Filters and layout remain usable while the data request
          recovers.
        </div>
      ) : null}
      {backgroundError !== undefined && !hasError ? (
        <div className="border-b border-amber-300/20 bg-amber-950/20 px-4 py-3 text-sm text-amber-100">
          Additional audit rows could not be loaded. Already loaded Audit Entries remain visible
          while the window request can be retried.
        </div>
      ) : null}
      <div className="flex h-9 items-center justify-between gap-4 border-b border-white/[0.06] bg-bankops-sidebar px-4">
        <div className="flex items-center gap-2.5">
          <span className="h-3.5 w-0.5 rounded-full bg-bankops-accent" />
          <span className="font-mono text-[9px] font-semibold uppercase tracking-[0.18em] text-bankops-subtle">
            Audit Log
          </span>
        </div>
        <ActiveFilterChips filters={activeFilters} />
      </div>
      {toolbar}
      <div
        className={cn(
          "min-h-0 flex-1 overflow-auto bg-bankops-panel",
          "bg-[repeating-linear-gradient(0deg,rgba(148,163,184,0.018)_0,rgba(148,163,184,0.018)_1px,transparent_1px,transparent_34px)]",
        )}
        data-testid="audit-table-scroll"
        onScroll={handleScroll}
        ref={scrollRef}
      >
        <div
          className="sticky top-0 z-30 flex min-w-full border-b border-white/[0.06] bg-bankops-panel px-4 font-mono text-[9px] font-semibold uppercase tracking-[0.14em] text-bankops-subtle"
          style={{ height: `${AUDIT_HEADER_HEIGHT}px`, width: `${tableWidth}px` }}
        >
          {visibleColumns.map((column) => {
            const sortField = column.sortField;

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
                  sortField === undefined
                    ? undefined
                    : () => setQueryState(auditQueryStateWithToggledSort(queryState, sortField))
                }
                sortable={sortField !== undefined}
                sortDir={queryState.sort.field === sortField ? queryState.sort.dir : undefined}
              />
            );
          })}
        </div>
        {cache.totalMatched === 0 && !isFetching ? (
          <div className="grid h-full place-items-center text-sm text-bankops-muted">
            No audit rows match these filters.
          </div>
        ) : null}
        {isInitialLoading ? (
          <AuditInitialLoadingRows tableWidth={tableWidth} visibleColumns={visibleColumns} />
        ) : (
          <div
            className="relative w-max min-w-full"
            style={{
              height: `${virtualizerTotalSize}px`,
              width: `${tableWidth}px`,
            }}
          >
            {liveFallbackRows.map((virtualRow) => (
              <AuditVirtualRow
                key={virtualRow.key}
                row={rowByIndex.get(virtualRow.index)}
                tableWidth={tableWidth}
                virtualRow={virtualRow}
                visibleColumns={visibleColumns}
              />
            ))}
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
        )}
      </div>
    </Panel>
  );
}

function getLiveFallbackRows(
  totalMatched: number,
  liveScrollRange: { start: number; end: number } | undefined,
  virtualRows: AuditVirtualItem[],
) {
  if (liveScrollRange === undefined || totalMatched === 0) {
    return [];
  }

  const virtualIndexes = new Set(virtualRows.map((virtualRow) => virtualRow.index));
  const start = Math.max(0, Math.min(liveScrollRange.start, totalMatched));
  const end = Math.max(start, Math.min(liveScrollRange.end + 1, totalMatched));
  const fallbackRows: AuditVirtualItem[] = [];

  for (let index = start; index < end; index += 1) {
    if (virtualIndexes.has(index)) {
      continue;
    }

    fallbackRows.push({
      index,
      key: `live-fallback-${index}`,
      size: AUDIT_ROW_HEIGHT,
      start: index * AUDIT_ROW_HEIGHT,
    });
  }

  return fallbackRows;
}

function ActiveFilterChips({ filters }: { filters: readonly string[] }) {
  if (filters.length === 0) {
    return null;
  }

  return (
    <div className="flex min-w-0 items-center gap-1.5 overflow-hidden">
      {filters.map((filter) => (
        <span
          className="inline-flex h-5 max-w-52 shrink-0 items-center truncate rounded-[2px] border border-bankops-accent/20 bg-bankops-accent/[0.06] px-2 font-mono text-[10px] text-cyan-100/85"
          key={filter}
        >
          {filter}
        </span>
      ))}
    </div>
  );
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
        className={cn(
          "absolute left-0 top-0 flex min-w-full items-center border-b border-white/[0.04] px-4",
          auditRowBackgroundClassName(virtualRow.index),
        )}
        data-testid="audit-row-placeholder"
        style={{
          height: `${virtualRow.size}px`,
          transform: `translateY(${virtualRow.start}px)`,
          width: `${tableWidth}px`,
        }}
      >
        {visibleColumns.map((column) => (
          <AuditRowCell column={column} key={column.id}>
            <AuditLoadingCell column={column} rowIndex={virtualRow.index} />
          </AuditRowCell>
        ))}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "absolute left-0 top-0 flex min-w-full items-center border-b border-white/[0.04] px-4 font-mono text-[11px] leading-none text-bankops-muted transition-colors duration-75 hover:bg-bankops-surface",
        severityBorderClassName(row.severity),
        auditRowBackgroundClassName(virtualRow.index),
      )}
      data-testid="audit-row"
      style={{
        height: `${virtualRow.size}px`,
        transform: `translateY(${virtualRow.start}px)`,
        width: `${tableWidth}px`,
      }}
    >
      {visibleColumns.map((column) => (
        <AuditRowCell column={column} key={column.id}>
          <AuditColumnCellContent column={column} row={row} />
        </AuditRowCell>
      ))}
    </div>
  );
}

function auditRowBackgroundClassName(index: number) {
  return index % 2 === 0 ? "bg-bankops-panel" : "bg-white/[0.012]";
}

function AuditInitialLoadingRows({
  tableWidth,
  visibleColumns,
}: {
  tableWidth: number;
  visibleColumns: SizedAuditColumn[];
}) {
  return (
    <div
      aria-label="Loading audit rows"
      className="relative w-max min-w-full"
      data-testid="audit-initial-loading"
      style={{
        height: `${AUDIT_INITIAL_LOADING_ROWS * AUDIT_ROW_HEIGHT}px`,
        width: `${tableWidth}px`,
      }}
    >
      {Array.from({ length: AUDIT_INITIAL_LOADING_ROWS }, (_, index) => (
        <AuditVirtualRow
          key={`initial-placeholder-${index}`}
          row={undefined}
          tableWidth={tableWidth}
          virtualRow={{
            index,
            key: `initial-placeholder-${index}`,
            size: AUDIT_ROW_HEIGHT,
            start: index * AUDIT_ROW_HEIGHT,
          }}
          visibleColumns={visibleColumns}
        />
      ))}
    </div>
  );
}

function severityBorderClassName(severity: JsonAuditEntry["severity"]) {
  switch (severity) {
    case "critical":
      return "border-l-2 border-l-bankops-negative-strong/50";
    case "warning":
      return "border-l-2 border-l-amber-400/40";
    case "notice":
      return "border-l border-l-bankops-accent/30";
    case "info":
      return "border-l border-l-[rgba(255,255,255,0.04)]";
  }

  const exhaustive: never = severity;
  return exhaustive;
}

function AuditLoadingCell({ column, rowIndex }: { column: SizedAuditColumn; rowIndex: number }) {
  const widthClass = column.loadingWidthClasses[rowIndex % column.loadingWidthClasses.length];

  return (
    <span
      aria-hidden="true"
      className={`h-2.5 rounded-full bg-[linear-gradient(90deg,rgba(148,163,184,0.12),rgba(226,232,240,0.24),rgba(148,163,184,0.12))] shadow-[0_0_18px_rgba(125,211,252,0.05)] motion-safe:animate-pulse ${widthClass}`}
    />
  );
}
