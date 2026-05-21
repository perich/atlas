import { useCallback, useMemo, useState } from "react";
import { getRouteApi, useNavigate } from "@tanstack/react-router";

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
  const [draggedColumnId, setDraggedColumnId] = useState<AuditColumnId>();
  const [columnLayout, setColumnLayoutValue] = useState(() => readAuditColumnLayout());
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

  return {
    activeFilters,
    backgroundError,
    cache,
    columnLayout,
    draggedColumnId,
    facets,
    hasError,
    isFetching,
    loadVisibleRange,
    queryState,
    rowByIndex,
    rows,
    selectedTimeRange,
    setColumnLayout,
    setDraggedColumnId,
    setQueryState,
    tableWidth,
    visibleColumns,
  };
}
