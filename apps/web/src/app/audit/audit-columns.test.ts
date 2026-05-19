import { beforeEach, describe, expect, it } from "vitest";

import {
  AUDIT_COLUMNS,
  AUDIT_COLUMN_LAYOUT_STORAGE_KEY,
  defaultAuditColumnLayout,
  moveAuditColumn,
  readAuditColumnLayout,
  resizeAuditColumn,
  setAuditColumnVisible,
  visibleAuditColumns,
  writeAuditColumnLayout,
} from "./audit-columns";

describe("audit column layout", () => {
  let storage = createMemoryStorage();

  beforeEach(() => {
    storage = createMemoryStorage();
  });

  it("defaults to the configured column order", () => {
    const layout = readAuditColumnLayout(storage);

    expect(visibleAuditColumns(layout).map((column) => column.id)).toEqual(
      defaultAuditColumnLayout().order,
    );
    expect(defaultAuditColumnLayout().order).toEqual(AUDIT_COLUMNS.map((column) => column.id));
  });

  it("persists visibility, order, and widths in localStorage", () => {
    const layout = setAuditColumnVisible(
      resizeAuditColumn(
        moveAuditColumn(defaultAuditColumnLayout(), "traceId", "ts"),
        "traceId",
        180,
      ),
      "actor",
      false,
    );

    writeAuditColumnLayout(layout, storage);

    const stored = readAuditColumnLayout(storage);

    expect(storage.getItem(AUDIT_COLUMN_LAYOUT_STORAGE_KEY)).not.toBeNull();
    expect(stored.hidden).toContain("actor");
    expect(stored.widths.traceId).toBe(180);
    expect(visibleAuditColumns(stored)[0].id).toBe("traceId");
  });

  it("normalizes stale saved columns without dropping known defaults", () => {
    storage.setItem(
      AUDIT_COLUMN_LAYOUT_STORAGE_KEY,
      JSON.stringify({
        hidden: ["missing", "rail"],
        order: ["traceId", "missing", "ts"],
        widths: { traceId: 1_000 },
      }),
    );

    const layout = readAuditColumnLayout(storage);

    expect(layout.order.slice(0, 2)).toEqual(["traceId", "ts"]);
    expect(layout.hidden).toEqual(["rail"]);
    expect(layout.widths.traceId).toBe(210);
    expect(layout.order).toHaveLength(defaultAuditColumnLayout().order.length);
  });

  it("falls back to the default layout when stored data is malformed", () => {
    storage.setItem(AUDIT_COLUMN_LAYOUT_STORAGE_KEY, JSON.stringify({ order: "traceId" }));

    expect(readAuditColumnLayout(storage)).toEqual(defaultAuditColumnLayout());
  });

  it("keeps sortable column metadata aligned with audit query fields", () => {
    const sortableColumnIds = [];

    for (const column of AUDIT_COLUMNS) {
      if (column.sortField !== undefined) {
        sortableColumnIds.push(column.id);
      }
    }

    expect(sortableColumnIds).toEqual(["ts", "severity", "kind", "rail", "status"]);
  });

  it("defines loading skeleton widths for every column", () => {
    for (const column of AUDIT_COLUMNS) {
      expect(column.loadingWidthClasses).toHaveLength(3);
      expect(column.loadingWidthClasses.every((className) => className.startsWith("w-"))).toBe(
        true,
      );
    }
  });
});

function createMemoryStorage(): Storage {
  const items = new Map<string, string>();

  return {
    get length() {
      return items.size;
    },
    clear: () => items.clear(),
    getItem: (key) => items.get(key) ?? null,
    key: (index) => Array.from(items.keys())[index] ?? null,
    removeItem: (key) => items.delete(key),
    setItem: (key, value) => items.set(key, value),
  };
}
