import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { getRouteApi, useNavigate } from "@tanstack/react-router";

import { auditSearchToQueryState, queryStateToAuditSearch } from "../audit/audit-query-state";
import type { ColumnLayoutUpdate } from "../audit/AuditColumnLayoutMenu";
import { AuditFilterPanel } from "../audit/AuditFilterPanel";
import { AuditRenderTracePanel, useMainThreadBlockingP95 } from "../audit/AuditRenderTracePanel";
import { AuditTablePanel } from "../audit/AuditTablePanel";
import { timeRangeValue } from "../audit/audit-time-range";
import {
  readAuditColumnLayout,
  visibleAuditColumns,
  writeAuditColumnLayout,
  type AuditColumnId,
} from "../audit/audit-column-layout";
import { useAuditWindow } from "../audit/use-audit-window";
import type { AuditQueryState } from "../audit/use-audit-window";
import { PageHeader } from "../../design/components";

const ROW_HEIGHT = 34;
const AUDIT_SCROLL_LOAD_DEBOUNCE_MS = 24;
const auditRouteApi = getRouteApi("/audit");

export function AuditRoute() {
  const search = auditRouteApi.useSearch();
  const navigate = useNavigate({ from: "/audit" });
  const queryState = useMemo(() => auditSearchToQueryState(search), [search]);
  const { cache, hasError, isFetching, loadVisibleRange, resetWindowCache, rows } =
    useAuditWindow(queryState);
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
  const virtualizer = useVirtualizer({
    count: cache.totalMatched || rows.length,
    estimateSize: () => ROW_HEIGHT,
    getScrollElement: () => scrollRef.current,
    overscan: 24,
  });
  const virtualRows = virtualizer.getVirtualItems();
  const firstVirtualRow = virtualRows[0];
  const lastVirtualRow = virtualRows.at(-1);
  const firstVirtualIndex = firstVirtualRow?.index;
  const lastVirtualIndex = lastVirtualRow?.index;
  const mountedRows = virtualRows.length;
  const selectedTimeRange = timeRangeValue(queryState.filters.tsFrom, rows[0]?.ts);
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
      void loadVisibleRange({ start: firstVirtualIndex, end: lastVirtualIndex });
    }, AUDIT_SCROLL_LOAD_DEBOUNCE_MS);

    return () => window.clearTimeout(timeoutId);
  }, [firstVirtualIndex, lastVirtualIndex, loadVisibleRange]);

  return (
    <div className="min-h-[calc(100vh-5.25rem)] rounded-md border border-white/[0.08] bg-bankops-bg">
      <div className="border-b border-white/[0.08] bg-bankops-sidebar px-6 py-5">
        <PageHeader eyebrow="Bank Core Audit" title="Balance Sheet Movement History" />
      </div>

      <AuditFilterPanel
        columnLayout={columnLayout}
        newestRowTs={rows[0]?.ts}
        onColumnLayoutChange={setColumnLayout}
        queryState={queryState}
        renderTrace={
          <AuditRenderTracePanel
            cache={cache}
            firstVirtualIndex={firstVirtualIndex}
            lastVirtualIndex={lastVirtualIndex}
            mainThreadBlockingP95={mainThreadBlockingP95}
            mountedRows={mountedRows}
            rows={rows.length}
          />
        }
        selectedTimeRange={selectedTimeRange}
        setQueryState={setQueryState}
      />

      <AuditTablePanel
        cache={cache}
        draggedColumnId={draggedColumnId}
        hasError={hasError}
        isFetching={isFetching}
        queryState={queryState}
        rowByIndex={rowByIndex}
        scrollRef={scrollRef}
        setColumnLayout={setColumnLayout}
        setDraggedColumnId={setDraggedColumnId}
        setQueryState={setQueryState}
        tableWidth={tableWidth}
        virtualRows={virtualRows}
        virtualizerTotalSize={virtualizer.getTotalSize()}
        visibleColumns={visibleColumns}
      />
    </div>
  );
}
