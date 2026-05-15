import React from "react";
import type { AuditSort } from "@bankops/contracts";
import { Copy } from "lucide-react";

import type { JsonAuditEntry } from "./audit-api";
import { cn } from "../../design/utils";

export type AuditColumnId =
  | "ts"
  | "severity"
  | "kind"
  | "actor"
  | "action"
  | "subject"
  | "customerId"
  | "rail"
  | "status"
  | "amountMinor"
  | "traceId";

export type AuditColumn = {
  id: AuditColumnId;
  label: string;
  defaultWidth: number;
  minWidth: number;
  maxWidth: number;
  loadingWidthClasses: readonly string[];
  renderCell: (row: JsonAuditEntry) => React.ReactNode;
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

const AUDIT_COLUMN_BY_ID = {
  ts: {
    id: "ts",
    label: "Timestamp",
    defaultWidth: 162,
    minWidth: 142,
    maxWidth: 220,
    loadingWidthClasses: ["w-3/4", "w-4/5", "w-11/12"],
    renderCell: (row) => {
      const timestamp = formatTimestamp(row.ts);

      return <TextCell title={timestamp}>{timestamp}</TextCell>;
    },
    sortField: "ts",
  },
  severity: {
    id: "severity",
    label: "Severity",
    defaultWidth: 146,
    minWidth: 92,
    maxWidth: 170,
    loadingWidthClasses: ["w-1/2", "w-3/5", "w-2/3"],
    renderCell: (row) => <SeverityChip severity={row.severity} />,
    sortField: "severity",
  },
  kind: {
    id: "kind",
    label: "Kind",
    defaultWidth: 92,
    minWidth: 70,
    maxWidth: 132,
    loadingWidthClasses: ["w-1/2", "w-3/5", "w-2/3"],
    renderCell: (row) => <TextCell>{row.kind}</TextCell>,
    sortField: "kind",
  },
  actor: {
    id: "actor",
    label: "Actor",
    defaultWidth: 84,
    minWidth: 74,
    maxWidth: 140,
    loadingWidthClasses: ["w-2/5", "w-1/2", "w-3/5"],
    renderCell: (row) => <TextCell>{row.actor}</TextCell>,
  },
  action: {
    id: "action",
    label: "Action",
    defaultWidth: 136,
    minWidth: 124,
    maxWidth: 280,
    loadingWidthClasses: ["w-2/3", "w-3/4", "w-4/5"],
    renderCell: (row) => <TextCell title={row.action}>{row.action}</TextCell>,
  },
  subject: {
    id: "subject",
    label: "Subject",
    defaultWidth: 138,
    minWidth: 120,
    maxWidth: 260,
    loadingWidthClasses: ["w-2/3", "w-3/4", "w-4/5"],
    renderCell: (row) => (
      <TextCell title={`${row.subjectType}:${row.subjectId}`}>
        {row.subjectType}:{row.subjectId}
      </TextCell>
    ),
  },
  customerId: {
    id: "customerId",
    label: "Customer",
    defaultWidth: 104,
    minWidth: 78,
    maxWidth: 140,
    loadingWidthClasses: ["w-1/2", "w-3/5", "w-2/3"],
    renderCell: (row) => <TextCell>{row.customerId ?? "-"}</TextCell>,
  },
  rail: {
    id: "rail",
    label: "Rail",
    defaultWidth: 110,
    minWidth: 84,
    maxWidth: 150,
    loadingWidthClasses: ["w-2/5", "w-1/2", "w-3/5"],
    renderCell: (row) => <RailChip rail={row.rail} />,
    sortField: "rail",
  },
  status: {
    id: "status",
    label: "Status",
    defaultWidth: 108,
    minWidth: 76,
    maxWidth: 132,
    loadingWidthClasses: ["w-1/2", "w-3/5", "w-2/3"],
    renderCell: (row) => <TextCell className={statusClass(row.status)}>{row.status}</TextCell>,
    sortField: "status",
  },
  amountMinor: {
    id: "amountMinor",
    label: "Amount",
    defaultWidth: 124,
    minWidth: 100,
    maxWidth: 180,
    loadingWidthClasses: ["w-2/3", "w-3/4", "w-4/5"],
    renderCell: (row) => (
      <TextCell className={amountClass(row.amountMinor)}>{formatMinor(row.amountMinor)}</TextCell>
    ),
  },
  traceId: {
    id: "traceId",
    label: "Trace ID",
    defaultWidth: 118,
    minWidth: 96,
    maxWidth: 210,
    loadingWidthClasses: ["w-2/3", "w-3/4", "w-4/5"],
    renderCell: (row) => (
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
    ),
  },
} satisfies Record<AuditColumnId, AuditColumn>;

export const AUDIT_COLUMNS: readonly AuditColumn[] = Object.values(AUDIT_COLUMN_BY_ID);
export const AUDIT_COLUMN_IDS = AUDIT_COLUMNS.map((column) => column.id);

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

    return raw === null ? defaultAuditColumnLayout() : normalizeAuditColumnLayout(JSON.parse(raw));
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
  const normalized = normalizeAuditColumnLayout(layout);
  const visibleIds = normalized.order.filter((id) => !normalized.hidden.includes(id));

  return visibleIds.map((id) => {
    const column = AUDIT_COLUMN_BY_ID[id];

    return {
      ...column,
      width: normalized.widths[id] ?? column.defaultWidth,
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

export function normalizeAuditColumnLayout(value: unknown): AuditColumnLayout {
  const layout =
    value !== null && typeof value === "object" ? (value as Partial<AuditColumnLayout>) : {};
  const order = knownIds(layout.order);
  const fullOrder = [...order, ...AUDIT_COLUMN_IDS.filter((id) => !order.includes(id))];
  const hidden = knownIds(layout.hidden);
  const widths: AuditColumnLayout["widths"] = {};

  for (const id of AUDIT_COLUMN_IDS) {
    const width = layout.widths?.[id];

    if (typeof width === "number" && Number.isFinite(width)) {
      widths[id] = clampWidth(width, AUDIT_COLUMN_BY_ID[id]);
    }
  }

  return {
    hidden,
    order: fullOrder,
    widths,
  };
}

export function auditColumnStyle(column: SizedAuditColumn): React.CSSProperties {
  return {
    maxWidth: `${column.width}px`,
    minWidth: `${column.width}px`,
    width: `${column.width}px`,
  };
}

export function isAuditColumnSortable(column: AuditColumn): boolean {
  return column.sortField !== undefined;
}

export function auditColumnSortDir(
  column: AuditColumn,
  sort: AuditSort,
): AuditSort["dir"] | undefined {
  return column.sortField !== undefined && sort.field === column.sortField ? sort.dir : undefined;
}

export function nextAuditColumnSort(column: AuditColumn, sort: AuditSort): AuditSort | undefined {
  if (column.sortField === undefined) {
    return undefined;
  }

  return {
    field: column.sortField,
    dir: sort.field === column.sortField && sort.dir === "desc" ? "asc" : "desc",
  };
}

export function auditColumnLoadingClassName(column: AuditColumn, rowIndex: number): string {
  return column.loadingWidthClasses[rowIndex % column.loadingWidthClasses.length];
}

export function renderAuditColumnCell(column: AuditColumn, row: JsonAuditEntry): React.ReactNode {
  return column.renderCell(row);
}

function clampWidth(width: number, column: AuditColumn) {
  return Math.min(column.maxWidth, Math.max(column.minWidth, Math.round(width)));
}

function knownIds(value: unknown) {
  if (!Array.isArray(value)) {
    return [] as AuditColumnId[];
  }

  const ids: AuditColumnId[] = [];

  for (const item of value) {
    for (const id of AUDIT_COLUMN_IDS) {
      if (item === id && !ids.includes(id)) {
        ids.push(id);
      }
    }
  }

  return ids;
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

  const exhaustive: never = severity;
  return exhaustive;
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

  const exhaustive: never = status;
  return exhaustive;
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
