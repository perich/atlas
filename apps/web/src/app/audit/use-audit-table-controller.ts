import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getRouteApi, useNavigate } from "@tanstack/react-router";
import { useVirtualizer } from "@tanstack/react-virtual";

import type { ColumnLayoutUpdate } from "./AuditColumnLayoutMenu";
import { activeAuditFilters } from "./AuditFilterPanel";
import {
  readAuditColumnLayout,
  visibleAuditColumns,
  writeAuditColumnLayout,
  type AuditColumnId,
} from "./audit-columns";
import { auditSearchToQueryState, queryStateToAuditSearch } from "./audit-query-state";
import { timeRangeValue } from "./audit-time-range";
import { useAuditWindow, type AuditQueryState } from "./use-audit-window";
import { useMainThreadBlockingP95 } from "./use-main-thread-blocking-p95";

const ROW_HEIGHT = 34;
const AUDIT_SCROLL_LOAD_DEBOUNCE_MS = 24;
const auditRouteApi = getRouteApi("/audit");

export function useAuditTableController() {
  const search = auditRouteApi.useSearch();
  const navigate = useNavigate({ from: "/audit" });
  const queryState = useMemo(() => auditSearchToQueryState(search), [search]);
  const {
    backgroundError,
    cache,
    facets,
    hasError,
    isFetching,
    loadVisibleRange,
    resetWindowCache,
    rows,
  } = useAuditWindow(queryState);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [draggedColumnId, setDraggedColumnId] = useState<AuditColumnId>();
  const [columnLayout, setColumnLayoutValue] = useState(() => readAuditColumnLayout());
  const mainThreadBlockingP95 = useMainThreadBlockingP95();
  const setColumnLayout = useCallback((update: ColumnLayoutUpdate) => {
    setColumnLayoutValue((current) => {
      const next = typeof update === "function" ? update(current) : update;

      writeAuditColumnLayout(next);

      return next;
    });
  }, []);
  const visibleColumns = useMemo(() => visibleAuditColumns(columnLayout), [columnLayout]);
  const tableWidth = useMemo(
    () => visibleColumns.reduce((width, column) => width + column.width, 0),
    [visibleColumns],
  );
  const rowByIndex = useMemo(() => {
    const map = new Map<number, (typeof rows)[number]>();

    for (const window of cache.windows) {
      window.rows.forEach((row, offset) => map.set(window.start + offset, row));
    }

    return map;
  }, [cache.windows]);
  const getAuditRowKey = useCallback(
    (index: number) => rowByIndex.get(index)?.id ?? `placeholder-${index}`,
    [rowByIndex],
  );
  // oxlint-disable-next-line react-hooks-js/incompatible-library -- TanStack Virtual exposes imperative functions; the controller keeps them local to the table surface.
  const virtualizer = useVirtualizer({
    count: cache.totalMatched || rows.length,
    estimateSize: () => ROW_HEIGHT,
    getItemKey: getAuditRowKey,
    getScrollElement: () => scrollRef.current,
    overscan: 24,
  });
  const virtualRows = virtualizer.getVirtualItems();
  const firstVirtualRow = virtualRows[0];
  const lastVirtualRow = virtualRows.at(-1);
  const firstVirtualIndex = firstVirtualRow?.index;
  const lastVirtualIndex = lastVirtualRow?.index;
  const mountedRows = virtualRows.length;
  const selectedTimeRange = timeRangeValue(queryState.filters.tsFrom, cache.newestTs);
  const activeFilters = activeAuditFilters(queryState, selectedTimeRange);
  const setQueryState = useCallback(
    (nextState: AuditQueryState) => {
      resetWindowCache();
      void navigate({
        replace: true,
        resetScroll: false,
        search: queryStateToAuditSearch(nextState),
      });
    },
    [navigate, resetWindowCache],
  );

  useEffect(() => {
    if (firstVirtualIndex === undefined || lastVirtualIndex === undefined) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      loadVisibleRange({ start: firstVirtualIndex, end: lastVirtualIndex });
    }, AUDIT_SCROLL_LOAD_DEBOUNCE_MS);

    return () => window.clearTimeout(timeoutId);
  }, [firstVirtualIndex, lastVirtualIndex, loadVisibleRange]);

  return {
    activeFilters,
    backgroundError,
    cache,
    columnLayout,
    draggedColumnId,
    facets,
    firstVirtualIndex,
    hasError,
    isFetching,
    lastVirtualIndex,
    mainThreadBlockingP95,
    mountedRows,
    queryState,
    rowByIndex,
    rows,
    scrollRef,
    selectedTimeRange,
    setColumnLayout,
    setDraggedColumnId,
    setQueryState,
    tableWidth,
    virtualRows,
    virtualizerTotalSize: virtualizer.getTotalSize(),
    visibleColumns,
  };
}
