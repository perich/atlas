import React from "react";
import { useVirtualizer } from "@tanstack/react-virtual";

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
import { publishAuditVirtualTraceSnapshot } from "./audit-virtual-trace";
import type { AuditVisibleRange, AuditWindowCache } from "./audit-window";
import type { AuditQueryState } from "./use-audit-window";
import { Panel } from "../../design/components";
import { cn } from "../../design/utils";

const AUDIT_HEADER_HEIGHT = 38;
const AUDIT_ROW_HEIGHT = 34;
const AUDIT_ROW_OVERSCAN = 24;
const AUDIT_SCROLL_LOAD_DEBOUNCE_MS = 24;
const AUDIT_INITIAL_LOADING_ROWS = 40;
const AUDIT_VIEWPORT_SKELETON_ROWS = 48;
const AUDIT_INITIAL_LOADING_ROW_PLACEHOLDERS = Array.from(
  { length: AUDIT_INITIAL_LOADING_ROWS },
  (_, rowIndex) => ({ id: `initial-loading-row-${rowIndex}`, rowIndex }),
);
const AUDIT_VIEWPORT_SKELETON_ROW_PLACEHOLDERS = Array.from(
  { length: AUDIT_VIEWPORT_SKELETON_ROWS },
  (_, rowIndex) => ({ id: `viewport-skeleton-row-${rowIndex}`, rowIndex }),
);

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
  loadVisibleRange,
  rowByIndex,
  queryState,
  setColumnLayout,
  setDraggedColumnId,
  setQueryState,
  tableWidth,
  toolbar,
  visibleColumns,
}: {
  activeFilters: readonly string[];
  backgroundError: Error | undefined;
  cache: AuditWindowCache;
  draggedColumnId: AuditColumnId | undefined;
  hasError: boolean;
  isFetching: boolean;
  loadVisibleRange: (visibleRange: AuditVisibleRange) => void;
  rowByIndex: Map<number, JsonAuditEntry>;
  queryState: AuditQueryState;
  setColumnLayout: (update: ColumnLayoutUpdate) => void;
  setDraggedColumnId: (columnId: AuditColumnId | undefined) => void;
  setQueryState: (state: AuditQueryState) => void;
  tableWidth: number;
  toolbar: React.ReactNode;
  visibleColumns: SizedAuditColumn[];
}) {
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
      <AuditTableScrollSurface
        cache={cache}
        draggedColumnId={draggedColumnId}
        isFetching={isFetching}
        loadVisibleRange={loadVisibleRange}
        queryState={queryState}
        rowByIndex={rowByIndex}
        setColumnLayout={setColumnLayout}
        setDraggedColumnId={setDraggedColumnId}
        setQueryState={setQueryState}
        tableWidth={tableWidth}
        visibleColumns={visibleColumns}
      />
    </Panel>
  );
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

function AuditTableScrollSurface({
  cache,
  draggedColumnId,
  isFetching,
  loadVisibleRange,
  queryState,
  rowByIndex,
  setColumnLayout,
  setDraggedColumnId,
  setQueryState,
  tableWidth,
  visibleColumns,
}: {
  cache: AuditWindowCache;
  draggedColumnId: AuditColumnId | undefined;
  isFetching: boolean;
  loadVisibleRange: (visibleRange: AuditVisibleRange) => void;
  queryState: AuditQueryState;
  rowByIndex: Map<number, JsonAuditEntry>;
  setColumnLayout: (update: ColumnLayoutUpdate) => void;
  setDraggedColumnId: (columnId: AuditColumnId | undefined) => void;
  setQueryState: (state: AuditQueryState) => void;
  tableWidth: number;
  visibleColumns: SizedAuditColumn[];
}) {
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const isInitialLoading = cache.windows.length === 0 && isFetching;

  return (
    <div
      className="relative min-h-0 flex-1 overflow-auto bg-bankops-panel"
      data-testid="audit-table-scroll"
      ref={scrollRef}
    >
      <AuditTableHeader
        draggedColumnId={draggedColumnId}
        queryState={queryState}
        setColumnLayout={setColumnLayout}
        setDraggedColumnId={setDraggedColumnId}
        setQueryState={setQueryState}
        tableWidth={tableWidth}
        visibleColumns={visibleColumns}
      />
      {cache.totalMatched > 0 && !isInitialLoading ? (
        <AuditViewportSkeletonUnderlay tableWidth={tableWidth} visibleColumns={visibleColumns} />
      ) : null}
      {cache.totalMatched === 0 && !isFetching ? (
        <div className="grid h-full place-items-center text-sm text-bankops-muted">
          No audit rows match these filters.
        </div>
      ) : null}
      <AuditVirtualizedRows
        cache={cache}
        isFetching={isFetching}
        loadVisibleRange={loadVisibleRange}
        rowByIndex={rowByIndex}
        scrollRef={scrollRef}
        tableWidth={tableWidth}
        visibleColumns={visibleColumns}
      />
    </div>
  );
}

function AuditTableHeader({
  draggedColumnId,
  queryState,
  setColumnLayout,
  setDraggedColumnId,
  setQueryState,
  tableWidth,
  visibleColumns,
}: {
  draggedColumnId: AuditColumnId | undefined;
  queryState: AuditQueryState;
  setColumnLayout: (update: ColumnLayoutUpdate) => void;
  setDraggedColumnId: (columnId: AuditColumnId | undefined) => void;
  setQueryState: (state: AuditQueryState) => void;
  tableWidth: number;
  visibleColumns: SizedAuditColumn[];
}) {
  return (
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
  );
}

function AuditVirtualizedRows({
  cache,
  isFetching,
  loadVisibleRange,
  rowByIndex,
  scrollRef,
  tableWidth,
  visibleColumns,
}: {
  cache: AuditWindowCache;
  isFetching: boolean;
  loadVisibleRange: (visibleRange: AuditVisibleRange) => void;
  rowByIndex: Map<number, JsonAuditEntry>;
  scrollRef: React.RefObject<HTMLDivElement | null>;
  tableWidth: number;
  visibleColumns: SizedAuditColumn[];
}) {
  const isInitialLoading = cache.windows.length === 0 && isFetching;
  const getAuditRowKey = React.useCallback(
    (index: number) => rowByIndex.get(index)?.id ?? `placeholder-${index}`,
    [rowByIndex],
  );
  // oxlint-disable-next-line react-hooks-js/incompatible-library -- TanStack Virtual owns scroll measurement; the hook is isolated to the table row surface.
  const virtualizer = useVirtualizer({
    count: cache.totalMatched || rowByIndex.size,
    estimateSize: () => AUDIT_ROW_HEIGHT,
    getItemKey: getAuditRowKey,
    getScrollElement: () => scrollRef.current,
    overscan: AUDIT_ROW_OVERSCAN,
  });
  const virtualRows = virtualizer.getVirtualItems();
  const firstVirtualRow = virtualRows[0];
  const lastVirtualRow = virtualRows.at(-1);
  const firstVirtualIndex = firstVirtualRow?.index;
  const lastVirtualIndex = lastVirtualRow?.index;
  const mountedRows = virtualRows.length;

  React.useEffect(() => {
    publishAuditVirtualTraceSnapshot({ firstVirtualIndex, lastVirtualIndex, mountedRows });
  }, [firstVirtualIndex, lastVirtualIndex, mountedRows]);

  React.useEffect(
    () => () =>
      publishAuditVirtualTraceSnapshot({
        firstVirtualIndex: undefined,
        lastVirtualIndex: undefined,
        mountedRows: 0,
      }),
    [],
  );

  React.useEffect(() => {
    if (firstVirtualIndex === undefined || lastVirtualIndex === undefined) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      loadVisibleRange({ start: firstVirtualIndex, end: lastVirtualIndex });
    }, AUDIT_SCROLL_LOAD_DEBOUNCE_MS);

    return () => window.clearTimeout(timeoutId);
  }, [firstVirtualIndex, lastVirtualIndex, loadVisibleRange]);

  if (cache.totalMatched === 0 && !isFetching) {
    return null;
  }

  if (isInitialLoading) {
    return <AuditInitialLoadingRows tableWidth={tableWidth} visibleColumns={visibleColumns} />;
  }

  return (
    <div
      className="relative z-10 w-max min-w-full"
      style={{
        height: `${virtualizer.getTotalSize()}px`,
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
      <AuditSkeletonRow
        aria-label="Loading audit row"
        className="absolute left-0 top-0"
        rowIndex={virtualRow.index}
        style={{
          height: `${virtualRow.size}px`,
          transform: `translateY(${virtualRow.start}px)`,
          width: `${tableWidth}px`,
        }}
        testId="audit-row-placeholder"
        visibleColumns={visibleColumns}
      />
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
  return index % 2 === 0 ? "bg-bankops-panel" : "bg-[#0f1215]";
}

function AuditViewportSkeletonUnderlay({
  tableWidth,
  visibleColumns,
}: {
  tableWidth: number;
  visibleColumns: SizedAuditColumn[];
}) {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none sticky z-0 h-0 w-max min-w-full"
      style={{ top: `${AUDIT_HEADER_HEIGHT}px`, width: `${tableWidth}px` }}
    >
      <div className="w-max min-w-full" style={{ width: `${tableWidth}px` }}>
        {AUDIT_VIEWPORT_SKELETON_ROW_PLACEHOLDERS.map((row) => (
          <AuditSkeletonRow
            animated={false}
            key={row.id}
            rowIndex={row.rowIndex}
            style={{
              height: `${AUDIT_ROW_HEIGHT}px`,
              width: `${tableWidth}px`,
            }}
            visibleColumns={visibleColumns}
          />
        ))}
      </div>
    </div>
  );
}

function AuditSkeletonRow({
  animated = true,
  "aria-label": ariaLabel,
  className,
  rowIndex,
  style,
  testId,
  visibleColumns,
}: {
  animated?: boolean;
  "aria-label"?: string;
  className?: string;
  rowIndex: number;
  style: React.CSSProperties;
  testId?: string;
  visibleColumns: SizedAuditColumn[];
}) {
  return (
    <div
      aria-label={ariaLabel}
      className={cn(
        "flex min-w-full items-center border-b border-white/[0.04] px-4",
        auditRowBackgroundClassName(rowIndex),
        className,
      )}
      data-testid={testId}
      style={style}
    >
      {visibleColumns.map((column) => (
        <AuditRowCell column={column} key={column.id}>
          <AuditLoadingCell animated={animated} column={column} rowIndex={rowIndex} />
        </AuditRowCell>
      ))}
    </div>
  );
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
      {AUDIT_INITIAL_LOADING_ROW_PLACEHOLDERS.map((row) => (
        <AuditVirtualRow
          key={row.id}
          row={undefined}
          tableWidth={tableWidth}
          virtualRow={{
            index: row.rowIndex,
            key: row.id,
            size: AUDIT_ROW_HEIGHT,
            start: row.rowIndex * AUDIT_ROW_HEIGHT,
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

function AuditLoadingCell({
  animated = true,
  column,
  rowIndex,
}: {
  animated?: boolean;
  column: SizedAuditColumn;
  rowIndex: number;
}) {
  const widthClass = column.loadingWidthClasses[rowIndex % column.loadingWidthClasses.length];

  return (
    <span
      aria-hidden="true"
      className={cn(
        "h-2.5 rounded-full bg-[linear-gradient(90deg,rgba(148,163,184,0.12),rgba(226,232,240,0.24),rgba(148,163,184,0.12))]",
        animated && "shadow-[0_0_18px_rgba(125,211,252,0.05)] motion-safe:animate-pulse",
        widthClass,
      )}
    />
  );
}
