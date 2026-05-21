import React from "react";
import type { AuditSort } from "@bankops/contracts";
import { Copy } from "lucide-react";
import { z } from "zod";

import type { JsonAuditEntry } from "./audit-api";
import { cn } from "../../design/utils";

const AUDIT_COLUMN_IDS = [
  "ts",
  "severity",
  "kind",
  "actor",
  "action",
  "subject",
  "customerId",
  "rail",
  "status",
  "amountMinor",
  "traceId",
] as const;

export type AuditColumnId = (typeof AUDIT_COLUMN_IDS)[number];

export type AuditColumn = {
  id: AuditColumnId;
  label: string;
  defaultWidth: number;
  minWidth: number;
  maxWidth: number;
  loadingWidthClasses: readonly string[];
  sortField?: AuditSort["field"];
};

export type SizedAuditColumn = AuditColumn & {
  width: number;
};

export type AuditColumnLayout = {
  order: AuditColumnId[];
  widths: Partial<Record<AuditColumnId, number>>;
  hidden: AuditColumnId[];
};

export const AUDIT_COLUMN_LAYOUT_STORAGE_KEY = "bankops.audit.column-layout.v1";

const loadingWidths = {
  narrow: ["w-2/5", "w-1/2", "w-3/5"],
  medium: ["w-1/2", "w-3/5", "w-2/3"],
  timestamp: ["w-3/4", "w-4/5", "w-11/12"],
  wide: ["w-2/3", "w-3/4", "w-4/5"],
} as const;

const AUDIT_COLUMN_BY_ID = {
  ts: col("ts", "Timestamp", 162, 142, 220, loadingWidths.timestamp, "ts"),
  severity: col("severity", "Severity", 146, 92, 170, loadingWidths.medium, "severity"),
  kind: col("kind", "Kind", 92, 70, 132, loadingWidths.medium, "kind"),
  actor: col("actor", "Actor", 84, 74, 140, loadingWidths.narrow),
  action: col("action", "Action", 136, 124, 280, loadingWidths.wide),
  subject: col("subject", "Subject", 138, 120, 260, loadingWidths.wide),
  customerId: col("customerId", "Customer", 104, 78, 140, loadingWidths.medium),
  rail: col("rail", "Rail", 110, 84, 150, loadingWidths.narrow, "rail"),
  status: col("status", "Status", 108, 76, 132, loadingWidths.medium, "status"),
  amountMinor: col("amountMinor", "Amount", 124, 100, 180, loadingWidths.wide),
  traceId: col("traceId", "Trace ID", 118, 96, 210, loadingWidths.wide),
} satisfies Record<AuditColumnId, AuditColumn>;

function col(
  id: AuditColumnId,
  label: string,
  defaultWidth: number,
  minWidth: number,
  maxWidth: number,
  loadingWidthClasses: readonly string[],
  sortField?: AuditSort["field"],
): AuditColumn {
  return {
    defaultWidth,
    id,
    label,
    loadingWidthClasses,
    maxWidth,
    minWidth,
    ...(sortField === undefined ? {} : { sortField }),
  };
}

export const AUDIT_COLUMNS: readonly AuditColumn[] = Object.values(AUDIT_COLUMN_BY_ID);
const auditColumnIdSchema = z.enum(AUDIT_COLUMN_IDS);
const auditColumnWidthSchema = z.number().finite();
const storedAuditColumnLayoutSchema = z.object({
  order: z.array(z.unknown()).optional(),
  hidden: z.array(z.unknown()).optional(),
  widths: z.record(z.string(), z.unknown()).optional(),
});

export function defaultAuditColumnLayout(): AuditColumnLayout {
  return {
    hidden: [],
    order: [...AUDIT_COLUMN_IDS],
    widths: {},
  };
}

export function readAuditColumnLayout(storage = window.localStorage): AuditColumnLayout {
  try {
    const raw = storage.getItem(AUDIT_COLUMN_LAYOUT_STORAGE_KEY);

    return raw === null ? defaultAuditColumnLayout() : readStoredColumnLayout(JSON.parse(raw));
  } catch {
    return defaultAuditColumnLayout();
  }
}

export function writeAuditColumnLayout(layout: AuditColumnLayout, storage = window.localStorage) {
  storage.setItem(
    AUDIT_COLUMN_LAYOUT_STORAGE_KEY,
    JSON.stringify(normalizeAuditColumnLayout(layout)),
  );
}

export function visibleAuditColumns(layout: AuditColumnLayout): SizedAuditColumn[] {
  const visibleIds = layout.order.filter((id) => !layout.hidden.includes(id));

  return visibleIds.map((id) => {
    const column = AUDIT_COLUMN_BY_ID[id];

    return {
      ...column,
      width: layout.widths[id] ?? column.defaultWidth,
    };
  });
}

export function resizeAuditColumn(
  layout: AuditColumnLayout,
  columnId: AuditColumnId,
  width: number,
): AuditColumnLayout {
  const column = AUDIT_COLUMN_BY_ID[columnId];

  return normalizeAuditColumnLayout({
    ...layout,
    widths: {
      ...layout.widths,
      [columnId]: clampWidth(width, column),
    },
  });
}

export function moveAuditColumn(
  layout: AuditColumnLayout,
  columnId: AuditColumnId,
  beforeColumnId: AuditColumnId,
): AuditColumnLayout {
  if (columnId === beforeColumnId) {
    return layout;
  }

  const order = layout.order.filter((id) => id !== columnId);
  const insertAt = order.indexOf(beforeColumnId);

  order.splice(insertAt === -1 ? order.length : insertAt, 0, columnId);

  return normalizeAuditColumnLayout({ ...layout, order });
}

export function setAuditColumnVisible(
  layout: AuditColumnLayout,
  columnId: AuditColumnId,
  visible: boolean,
): AuditColumnLayout {
  if (visible) {
    return normalizeAuditColumnLayout({
      ...layout,
      hidden: layout.hidden.filter((id) => id !== columnId),
    });
  }

  const visibleCount = AUDIT_COLUMN_IDS.length - layout.hidden.length;

  if (visibleCount <= 1) {
    return layout;
  }

  return normalizeAuditColumnLayout({
    ...layout,
    hidden: [...layout.hidden, columnId],
  });
}

function readStoredColumnLayout(value: unknown): AuditColumnLayout {
  const stored = storedAuditColumnLayoutSchema.parse(value);

  return normalizeAuditColumnLayout({
    hidden: parseStoredColumnIds(stored.hidden ?? []),
    order: parseStoredColumnIds(stored.order ?? []),
    widths: parseStoredWidths(stored.widths ?? {}),
  });
}

function normalizeAuditColumnLayout(layout: AuditColumnLayout): AuditColumnLayout {
  const order = uniqueColumnIds(layout.order);
  const orderedIds = new Set(order);
  const fullOrder = [...order, ...AUDIT_COLUMN_IDS.filter((id) => !orderedIds.has(id))];
  const hidden = uniqueColumnIds(layout.hidden);
  const widths: AuditColumnLayout["widths"] = {};

  for (const id of AUDIT_COLUMN_IDS) {
    const width = layout.widths[id];

    if (width !== undefined) {
      widths[id] = clampWidth(width, AUDIT_COLUMN_BY_ID[id]);
    }
  }

  return {
    hidden: hidden.length >= AUDIT_COLUMN_IDS.length ? [] : hidden,
    order: fullOrder,
    widths,
  };
}

function parseStoredColumnIds(values: readonly unknown[]): AuditColumnId[] {
  const ids: AuditColumnId[] = [];

  for (const value of values) {
    const parsed = auditColumnIdSchema.safeParse(value);

    if (parsed.success) {
      ids.push(parsed.data);
    }
  }

  return uniqueColumnIds(ids);
}

function parseStoredWidths(values: Record<string, unknown>): AuditColumnLayout["widths"] {
  const widths: AuditColumnLayout["widths"] = {};

  for (const [key, value] of Object.entries(values)) {
    const id = auditColumnIdSchema.safeParse(key);
    const width = auditColumnWidthSchema.safeParse(value);

    if (id.success && width.success) {
      widths[id.data] = width.data;
    }
  }

  return widths;
}

function uniqueColumnIds(ids: readonly AuditColumnId[]) {
  return [...new Set(ids)];
}

export function auditColumnStyle(column: SizedAuditColumn): React.CSSProperties {
  return {
    maxWidth: `${column.width}px`,
    minWidth: `${column.width}px`,
    width: `${column.width}px`,
  };
}

export function AuditColumnCellContent({
  column,
  row,
}: {
  column: AuditColumn;
  row: JsonAuditEntry;
}) {
  switch (column.id) {
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
            className="inline-flex size-4 shrink-0 items-center justify-center rounded-[2px] border border-white/[0.06] bg-white/[0.04] text-bankops-subtle opacity-80 transition-colors hover:bg-white/[0.08] hover:text-bankops-muted focus:outline-none focus:ring-2 focus:ring-bankops-accent/30"
            onClick={() => void navigator.clipboard?.writeText(row.traceId).catch(() => undefined)}
            type="button"
          >
            <Copy aria-hidden="true" className="size-3" />
          </button>
        </span>
      );
  }

  const exhaustive: never = column.id;
  return exhaustive;
}

function clampWidth(width: number, column: AuditColumn) {
  return Math.min(column.maxWidth, Math.max(column.minWidth, Math.round(width)));
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
        "inline-flex items-center rounded-[2px] px-1.5 py-0.5 font-mono text-[9px] font-medium uppercase leading-none tracking-[0.08em]",
        severityChipClass(severity),
      )}
    >
      {severity}
    </span>
  );
}

function RailChip({ rail }: { rail: JsonAuditEntry["rail"] }) {
  return (
    <span className="inline-flex max-w-full items-center overflow-hidden text-ellipsis whitespace-nowrap rounded-[2px] border border-white/[0.06] bg-bankops-surface px-1.5 py-0.5 font-mono text-[9px] font-medium uppercase leading-none tracking-[0.06em] text-bankops-muted">
      {rail ?? "-"}
    </span>
  );
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
      return "bg-bankops-negative-strong/[0.10] text-bankops-negative-strong";
    case "info":
      return "bg-bankops-muted/[0.10] text-bankops-muted";
    case "notice":
      return "bg-bankops-accent/[0.10] text-bankops-accent";
    case "warning":
      return "bg-amber-400/[0.10] text-amber-300";
  }

  const exhaustive: never = severity;
  return exhaustive;
}

function statusClass(status: JsonAuditEntry["status"]) {
  switch (status) {
    case "failed":
      return "text-bankops-negative";
    case "pending":
      return "text-amber-300";
    case "posted":
    case "settled":
      return "text-bankops-positive";
    case "accepted":
      return "text-bankops-muted";
    case "reversed":
      return "text-bankops-negative";
  }

  const exhaustive: never = status;
  return exhaustive;
}

function amountClass(value: string | undefined) {
  if (value === undefined) {
    return "text-bankops-muted";
  }

  return Number(value) < 0 ? "font-medium text-bankops-negative" : "font-medium text-bankops-text";
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
