import React from "react";
import { ArrowDown, ArrowUp, Copy, GripVertical } from "lucide-react";

import type { JsonAuditEntry } from "./audit-api";
import type { AuditColumnId, SizedAuditColumn } from "./audit-column-layout";
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
      style={columnStyle(column)}
      tabIndex={sortable ? 0 : undefined}
      title={
        sortable
          ? "Click to sort. Drag to reorder. Drag the right edge to resize."
          : "Drag to reorder. Drag the right edge to resize."
      }
    >
      <GripVertical
        aria-hidden="true"
        className="size-3 shrink-0 cursor-grab text-[#5a6272]/70 transition-colors group-hover:text-bankops-muted"
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
      style={columnStyle(column)}
    >
      {children}
    </span>
  );
}

export function AuditCellValue({
  columnId,
  row,
}: {
  columnId: AuditColumnId;
  row: JsonAuditEntry;
}) {
  switch (columnId) {
    case "ts": {
      const timestamp = formatTimestamp(row.ts);

      return <TextCell title={timestamp}>{timestamp}</TextCell>;
    }
    case "severity":
      return <SeverityChip severity={row.severity} />;
    case "kind":
      return <TextCell>{row.kind}</TextCell>;
    case "actor":
      return <TextCell>{row.actor}</TextCell>;
    case "action":
      return <TextCell title={row.action}>{row.action}</TextCell>;
    case "subject":
      return (
        <TextCell title={`${row.subjectType}:${row.subjectId}`}>
          {row.subjectType}:{row.subjectId}
        </TextCell>
      );
    case "customerId":
      return <TextCell>{row.customerId ?? "-"}</TextCell>;
    case "rail":
      return <RailChip rail={row.rail} />;
    case "status":
      return <TextCell className={statusClass(row.status)}>{row.status}</TextCell>;
    case "amountMinor":
      return (
        <TextCell className={amountClass(row.amountMinor)}>{formatMinor(row.amountMinor)}</TextCell>
      );
    case "traceId":
      return (
        <span className="flex min-w-0 items-center gap-2">
          <span className="truncate" title={row.traceId}>
            {row.traceId}
          </span>
          <button
            aria-label={`Copy trace ID ${row.traceId}`}
            className="inline-flex size-4 shrink-0 items-center justify-center rounded border border-white/[0.08] bg-white/[0.04] text-[#5a6272] opacity-80 transition-colors hover:bg-white/[0.08] hover:text-bankops-muted focus:outline-none focus:ring-2 focus:ring-white/25"
            onClick={() => void navigator.clipboard?.writeText(row.traceId)}
            type="button"
          >
            <Copy aria-hidden="true" className="size-3" />
          </button>
        </span>
      );
  }

  return null;
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
      <span className="absolute right-[3px] top-1/2 h-5 -translate-y-1/2 rounded-full border-r border-white/12 opacity-0 transition-colors group-hover:opacity-100 group-hover:border-sky-300/45" />
    </span>
  );
}

function TextCell({
  children,
  className,
  title,
}: {
  children: React.ReactNode;
  className?: string;
  title?: string;
}) {
  return (
    <span className={cn("min-w-0 truncate", className)} title={title}>
      {children}
    </span>
  );
}

function SeverityChip({ severity }: { severity: JsonAuditEntry["severity"] }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-sm border px-1.5 py-0.5 font-mono text-[10px] font-medium lowercase leading-none tracking-wide",
        severityChipClass(severity),
      )}
    >
      {severity}
    </span>
  );
}

function RailChip({ rail }: { rail: JsonAuditEntry["rail"] }) {
  return (
    <span className="inline-flex max-w-full items-center overflow-hidden text-ellipsis whitespace-nowrap rounded-sm border border-white/[0.08] bg-white/[0.04] px-1.5 py-0.5 font-mono text-[9px] font-medium uppercase leading-none tracking-wider text-[#5a6272]">
      {rail ?? "-"}
    </span>
  );
}

function columnStyle(column: SizedAuditColumn): React.CSSProperties {
  return {
    maxWidth: `${column.width}px`,
    minWidth: `${column.width}px`,
    width: `${column.width}px`,
  };
}

function resizeHandleWasClicked(target: EventTarget | null) {
  return target instanceof HTMLElement && target.closest("[data-resize-handle='true']") !== null;
}

function formatTimestamp(timestamp: number) {
  const date = new Date(timestamp);

  return [
    date.getUTCFullYear(),
    "-",
    String(date.getUTCMonth() + 1).padStart(2, "0"),
    "-",
    String(date.getUTCDate()).padStart(2, "0"),
    " ",
    String(date.getUTCHours()).padStart(2, "0"),
    ":",
    String(date.getUTCMinutes()).padStart(2, "0"),
    ":",
    String(date.getUTCSeconds()).padStart(2, "0"),
  ].join("");
}

function severityChipClass(severity: JsonAuditEntry["severity"]) {
  switch (severity) {
    case "critical":
      return "border-rose-300/20 bg-rose-400/[0.12] text-rose-300";
    case "info":
      return "border-white/[0.08] bg-white/[0.04] text-bankops-muted";
    case "notice":
      return "border-sky-300/20 bg-sky-300/[0.12] text-sky-300";
    case "warning":
      return "border-amber-300/20 bg-amber-300/[0.12] text-amber-200";
  }
}

function statusClass(status: JsonAuditEntry["status"]) {
  switch (status) {
    case "failed":
      return "text-rose-300";
    case "pending":
      return "text-amber-300";
    case "posted":
    case "settled":
      return "text-emerald-300";
    case "accepted":
      return "text-bankops-muted";
    case "reversed":
      return "text-rose-300";
  }
}

function amountClass(value: string | undefined) {
  if (value === undefined) {
    return "text-bankops-muted";
  }

  return Number(value) < 0 ? "font-medium text-rose-300" : "font-medium text-bankops-text";
}

function formatMinor(value: string | undefined) {
  if (value === undefined) {
    return "-";
  }

  return `$${(Number(value) / 100).toLocaleString(undefined, {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  })}`;
}
