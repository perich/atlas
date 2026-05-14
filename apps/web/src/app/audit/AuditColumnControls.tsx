import React from "react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { ArrowDown, ArrowUp, Columns3, Copy, GripVertical } from "lucide-react";

import type { JsonAuditEntry } from "./audit-api";
import {
  AUDIT_COLUMNS,
  defaultAuditColumnLayout,
  setAuditColumnVisible,
  type AuditColumnId,
  type AuditColumnLayout,
  type SizedAuditColumn,
} from "./audit-column-layout";
import { cn } from "../../design/utils";

export type ColumnLayoutUpdate =
  | AuditColumnLayout
  | ((layout: AuditColumnLayout) => AuditColumnLayout);

export function AuditColumnLayoutMenu({
  layout,
  onChange,
}: {
  layout: AuditColumnLayout;
  onChange: (update: ColumnLayoutUpdate) => void;
}) {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          className="inline-flex h-9 items-center justify-center gap-2 rounded-[4px] border border-white/[0.1] bg-white/[0.035] px-3 text-xs font-medium text-bankops-text transition-colors hover:border-white/18 hover:bg-white/[0.065] focus:outline-none focus:ring-2 focus:ring-sky-300/35"
          type="button"
        >
          <Columns3 aria-hidden="true" className="size-4" />
          Columns
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          className="z-50 max-h-[70vh] w-72 overflow-y-auto rounded-[5px] border border-white/[0.1] bg-[#111315] p-2 text-sm text-bankops-text shadow-2xl shadow-black/45"
          sideOffset={8}
        >
          <DropdownMenu.Label className="px-2 py-1.5 text-[11px] font-semibold uppercase tracking-[0.13em] text-bankops-muted">
            Visible columns
          </DropdownMenu.Label>
          {AUDIT_COLUMNS.map((column) => (
            <DropdownMenu.CheckboxItem
              checked={!layout.hidden.includes(column.id)}
              className="flex cursor-default items-center gap-2 rounded-[4px] px-2 py-1.5 text-xs outline-none hover:bg-white/[0.055] focus:bg-white/[0.075] data-[disabled]:opacity-40"
              disabled={
                !layout.hidden.includes(column.id) &&
                AUDIT_COLUMNS.length - layout.hidden.length <= 1
              }
              key={column.id}
              onCheckedChange={(checked) =>
                onChange((current) => setAuditColumnVisible(current, column.id, checked))
              }
              onSelect={(event) => event.preventDefault()}
            >
              <span className="w-4 text-sky-200">
                <DropdownMenu.ItemIndicator>✓</DropdownMenu.ItemIndicator>
              </span>
              Show {column.label}
            </DropdownMenu.CheckboxItem>
          ))}
          <DropdownMenu.Separator className="my-2 h-px bg-white/[0.08]" />
          <DropdownMenu.Item
            className="cursor-pointer rounded-[4px] px-2 py-1.5 text-xs text-bankops-muted outline-none hover:bg-white/[0.055] hover:text-bankops-text focus:bg-white/[0.075] focus:text-bankops-text"
            onSelect={() => onChange(defaultAuditColumnLayout())}
          >
            Reset layout
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

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
        "group relative flex shrink-0 select-none items-center gap-2 overflow-hidden border-r border-white/[0.06] py-2 pr-3 transition-colors hover:bg-white/[0.035]",
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
        className="size-3 shrink-0 cursor-grab text-bankops-muted/70 transition-colors group-hover:text-sky-300/85"
      />
      <span className="min-w-0 truncate">{column.label}</span>
      {sortable ? (
        <span
          className={cn(
            "ml-auto inline-flex size-4 shrink-0 items-center justify-center rounded-[3px] text-bankops-muted/45 opacity-0 transition-colors group-hover:bg-white/[0.055] group-hover:text-bankops-muted group-hover:opacity-100",
            sorted && "bg-sky-300/10 text-sky-200 opacity-100",
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
      return <TextCell className={severityClass(row.severity)}>{row.severity}</TextCell>;
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
      return <TextCell>{row.rail ?? "-"}</TextCell>;
    case "status":
      return <TextCell>{row.status}</TextCell>;
    case "amountMinor":
      return <TextCell className="text-white">{formatMinor(row.amountMinor)}</TextCell>;
    case "traceId":
      return (
        <span className="flex min-w-0 items-center gap-2">
          <span className="truncate" title={row.traceId}>
            {row.traceId}
          </span>
          <button
            aria-label={`Copy trace ID ${row.traceId}`}
            className="inline-flex size-5 shrink-0 items-center justify-center rounded-[3px] border border-white/[0.08] text-bankops-muted opacity-70 transition-colors hover:border-white/18 hover:text-white focus:outline-none focus:ring-2 focus:ring-white/25"
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

function severityClass(severity: JsonAuditEntry["severity"]) {
  switch (severity) {
    case "critical":
      return "text-rose-300";
    case "warning":
      return "text-amber-200";
    case "notice":
      return "text-sky-200";
    default:
      return "text-bankops-muted";
  }
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
