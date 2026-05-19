import React from "react";
import { ArrowDown, ArrowUp, GripVertical } from "lucide-react";

import { auditColumnStyle, type AuditColumnId, type SizedAuditColumn } from "./audit-columns";
import { cn } from "../../design/utils";

export function AuditHeaderCell({
  column,
  draggedColumnId,
  onDragEnd,
  onDragStart,
  onDrop,
  onResize,
  onSort,
  sortDir,
  sortable,
}: {
  column: SizedAuditColumn;
  draggedColumnId: AuditColumnId | undefined;
  onDragEnd: () => void;
  onDragStart: (columnId: AuditColumnId) => void;
  onDrop: (beforeColumnId: AuditColumnId) => void;
  onResize: (width: number) => void;
  onSort?: () => void;
  sortDir?: "asc" | "desc";
  sortable: boolean;
}) {
  const sorted = sortDir !== undefined;
  const ariaSort = sortDir === undefined ? "none" : sortDir === "asc" ? "ascending" : "descending";

  return (
    <div
      aria-sort={ariaSort}
      className={cn(
        "group relative flex shrink-0 select-none items-center gap-1 overflow-hidden py-2 pr-3 transition-colors hover:text-bankops-text",
        sortable ? "cursor-pointer" : "cursor-grab active:cursor-grabbing",
        draggedColumnId === column.id && "opacity-50",
      )}
      data-testid={`audit-column-header-${column.id}`}
      draggable
      onClick={(event) => {
        if (!sortable || resizeHandleWasClicked(event.target)) {
          return;
        }

        onSort?.();
      }}
      onDragEnd={onDragEnd}
      onDragOver={(event) => event.preventDefault()}
      onDragStart={(event) => {
        event.dataTransfer.effectAllowed = "move";
        onDragStart(column.id);
      }}
      onDrop={(event) => {
        event.preventDefault();
        onDrop(column.id);
      }}
      onKeyDown={(event) => {
        if (!sortable || (event.key !== "Enter" && event.key !== " ")) {
          return;
        }

        event.preventDefault();
        onSort?.();
      }}
      role="columnheader"
      style={auditColumnStyle(column)}
      tabIndex={sortable ? 0 : undefined}
      title={
        sortable
          ? "Click to sort. Drag to reorder. Drag the right edge to resize."
          : "Drag to reorder. Drag the right edge to resize."
      }
    >
      <GripVertical
        aria-hidden="true"
        className="size-3 shrink-0 cursor-grab text-bankops-subtle/45 transition-colors group-hover:text-bankops-muted"
      />
      <span className="min-w-0 truncate">{column.label}</span>
      {sortable ? (
        <span
          className={cn(
            "ml-auto inline-flex size-4 shrink-0 items-center justify-center text-bankops-muted/45 opacity-0 transition-colors group-hover:text-bankops-muted group-hover:opacity-100",
            sorted && "text-bankops-text opacity-100",
          )}
        >
          {sortDir === "asc" ? (
            <ArrowUp aria-hidden="true" className="size-3" />
          ) : (
            <ArrowDown aria-hidden="true" className="size-3" />
          )}
        </span>
      ) : null}
      <ResizeHandle column={column} onResize={onResize} />
    </div>
  );
}

export function AuditRowCell({
  children,
  column,
}: {
  children: React.ReactNode;
  column: SizedAuditColumn;
}) {
  return (
    <span
      className="flex h-full shrink-0 items-center overflow-hidden pr-4"
      style={auditColumnStyle(column)}
    >
      {children}
    </span>
  );
}

function ResizeHandle({
  column,
  onResize,
}: {
  column: SizedAuditColumn;
  onResize: (width: number) => void;
}) {
  return (
    <span
      aria-label={`Resize ${column.label}`}
      className="absolute right-0 top-0 h-full w-2 cursor-col-resize touch-none"
      data-resize-handle="true"
      onPointerDown={(event) => {
        event.preventDefault();

        const startX = event.clientX;
        const startWidth = column.width;
        const onPointerMove = (moveEvent: PointerEvent) => {
          onResize(startWidth + moveEvent.clientX - startX);
        };
        const onPointerUp = () => {
          window.removeEventListener("pointermove", onPointerMove);
          window.removeEventListener("pointerup", onPointerUp);
        };

        window.addEventListener("pointermove", onPointerMove);
        window.addEventListener("pointerup", onPointerUp);
      }}
      role="separator"
      title={`Resize ${column.label}`}
    >
      <span className="absolute right-[3px] top-1/2 h-5 -translate-y-1/2 rounded-full border-r border-white/12 opacity-0 transition-colors group-hover:border-bankops-accent/45 group-hover:opacity-100" />
    </span>
  );
}

function resizeHandleWasClicked(target: EventTarget | null) {
  return target instanceof HTMLElement && target.closest("[data-resize-handle='true']") !== null;
}
