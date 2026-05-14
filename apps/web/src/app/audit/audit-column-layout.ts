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
  ts: { id: "ts", label: "Timestamp", defaultWidth: 162, minWidth: 142, maxWidth: 220 },
  severity: { id: "severity", label: "Severity", defaultWidth: 146, minWidth: 92, maxWidth: 170 },
  kind: { id: "kind", label: "Kind", defaultWidth: 92, minWidth: 70, maxWidth: 132 },
  actor: { id: "actor", label: "Actor", defaultWidth: 84, minWidth: 74, maxWidth: 140 },
  action: { id: "action", label: "Action", defaultWidth: 136, minWidth: 124, maxWidth: 280 },
  subject: { id: "subject", label: "Subject", defaultWidth: 138, minWidth: 120, maxWidth: 260 },
  customerId: {
    id: "customerId",
    label: "Customer",
    defaultWidth: 104,
    minWidth: 78,
    maxWidth: 140,
  },
  rail: { id: "rail", label: "Rail", defaultWidth: 110, minWidth: 84, maxWidth: 150 },
  status: { id: "status", label: "Status", defaultWidth: 108, minWidth: 76, maxWidth: 132 },
  amountMinor: {
    id: "amountMinor",
    label: "Amount",
    defaultWidth: 124,
    minWidth: 100,
    maxWidth: 180,
  },
  traceId: { id: "traceId", label: "Trace ID", defaultWidth: 118, minWidth: 96, maxWidth: 210 },
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
