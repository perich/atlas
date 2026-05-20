import React from "react";

import { AuditFilterPanel } from "../audit/AuditFilterPanel";
import { AuditRenderTracePanel } from "../audit/AuditRenderTracePanel";
import { AuditTablePanel } from "../audit/AuditTablePanel";
import { useAuditTableController } from "../audit/use-audit-table-controller";

export function AuditRoute() {
  const auditTable = useAuditTableController();

  return (
    <div className="flex h-[calc(100vh-5.25rem)] min-h-[40rem] flex-col overflow-hidden rounded-[4px] border border-white/[0.06] bg-bankops-panel">
      <div className="shrink-0 border-b border-white/[0.06] bg-bankops-sidebar px-6 py-5">
        <h1 className="text-2xl font-semibold leading-tight tracking-[-0.02em] text-bankops-text">
          Bank Core Audit Log
        </h1>
      </div>

      <AuditRenderTracePanel
        cache={auditTable.cache}
        firstVirtualIndex={auditTable.firstVirtualIndex}
        lastVirtualIndex={auditTable.lastVirtualIndex}
        mainThreadBlockingP95={auditTable.mainThreadBlockingP95}
        mountedRows={auditTable.mountedRows}
        rows={auditTable.rows.length}
      />

      <AuditTablePanel
        activeFilters={auditTable.activeFilters}
        backgroundError={auditTable.backgroundError}
        cache={auditTable.cache}
        draggedColumnId={auditTable.draggedColumnId}
        hasError={auditTable.hasError}
        isFetching={auditTable.isFetching}
        queryState={auditTable.queryState}
        rowByIndex={auditTable.rowByIndex}
        scrollRef={auditTable.scrollRef}
        setColumnLayout={auditTable.setColumnLayout}
        setDraggedColumnId={auditTable.setDraggedColumnId}
        setQueryState={auditTable.setQueryState}
        tableWidth={auditTable.tableWidth}
        toolbar={
          <AuditFilterPanel
            columnLayout={auditTable.columnLayout}
            facets={auditTable.facets}
            hasActiveFilters={auditTable.activeFilters.length > 0}
            newestRowTs={auditTable.cache.newestTs}
            onColumnLayoutChange={auditTable.setColumnLayout}
            queryState={auditTable.queryState}
            selectedTimeRange={auditTable.selectedTimeRange}
            setQueryState={auditTable.setQueryState}
          />
        }
        virtualRows={auditTable.virtualRows}
        virtualizerTotalSize={auditTable.virtualizerTotalSize}
        visibleColumns={auditTable.visibleColumns}
      />
    </div>
  );
}
