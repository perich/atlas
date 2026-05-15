import { beforeEach, describe, expect, it } from "vitest";

import {
  AUDIT_COLUMNS,
  AUDIT_COLUMN_LAYOUT_STORAGE_KEY,
  auditColumnLoadingClassName,
  defaultAuditColumnLayout,
  isAuditColumnSortable,
  moveAuditColumn,
  readAuditColumnLayout,
  resizeAuditColumn,
  setAuditColumnVisible,
  visibleAuditColumns,
  writeAuditColumnLayout,
} from "./audit-columns";

describe("audit column layout", () => {
  beforeEach(() => localStorage.clear());

  it("defaults to the configured column order", () => {
    const layout = readAuditColumnLayout();

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

    writeAuditColumnLayout(layout);

    const stored = readAuditColumnLayout();

    expect(localStorage.getItem(AUDIT_COLUMN_LAYOUT_STORAGE_KEY)).not.toBeNull();
    expect(stored.hidden).toContain("actor");
    expect(stored.widths.traceId).toBe(180);
    expect(visibleAuditColumns(stored)[0].id).toBe("traceId");
  });

  it("normalizes stale saved columns without dropping known defaults", () => {
    localStorage.setItem(
      AUDIT_COLUMN_LAYOUT_STORAGE_KEY,
      JSON.stringify({
        hidden: ["missing", "rail"],
        order: ["traceId", "missing", "ts"],
        widths: { traceId: 1_000 },
      }),
    );

    const layout = readAuditColumnLayout();

    expect(layout.order.slice(0, 2)).toEqual(["traceId", "ts"]);
    expect(layout.hidden).toEqual(["rail"]);
    expect(layout.widths.traceId).toBe(210);
    expect(layout.order).toHaveLength(defaultAuditColumnLayout().order.length);
  });

  it("keeps sortable column metadata aligned with audit query fields", () => {
    expect(AUDIT_COLUMNS.filter(isAuditColumnSortable).map((column) => column.id)).toEqual([
      "ts",
      "severity",
      "kind",
      "rail",
      "status",
    ]);
  });

  it("defines loading skeleton widths for every column", () => {
    for (const column of AUDIT_COLUMNS) {
      expect(auditColumnLoadingClassName(column, 0)).toMatch(/^w-/);
      expect(auditColumnLoadingClassName(column, 1)).toMatch(/^w-/);
      expect(auditColumnLoadingClassName(column, 2)).toMatch(/^w-/);
    }
  });
});
