import { describe, expect, it } from "vitest";

import {
  auditQueryStateWithRailFilter,
  auditQueryStateWithSeverityFilter,
  auditQueryStateWithStatusFilter,
  auditQueryStateWithTimeBounds,
  auditQueryStateWithToggledSort,
  auditSearchToQueryState,
  readAuditQueryState,
  serializeAuditQueryState,
} from "./audit-query-state";

describe("audit query state", () => {
  it("serializes only filters and sort", () => {
    const search = serializeAuditQueryState({
      filters: {
        rail: ["wire"],
        status: ["failed"],
        tsFrom: 1_778_500_000_000,
      },
      sort: { dir: "asc", field: "severity" },
    });

    expect(search).toBe(
      "?rail=wire&status=failed&tsFrom=1778500000000&sortField=severity&sortDir=asc",
    );
    expect(search).not.toContain("cursor");
    expect(search).not.toContain("scroll");
    expect(search).not.toContain("column");
  });

  it("round-trips supported filters and sort from URL params", () => {
    const state = readAuditQueryState(
      "?status=failed,pending&rail=wire&severity=critical&sortField=rail&sortDir=asc",
    );

    expect(state).toEqual({
      filters: {
        rail: ["wire"],
        severity: ["critical"],
        status: ["failed", "pending"],
      },
      sort: { dir: "asc", field: "rail" },
    });
  });

  it("uses default sort and drops unsupported URL values", () => {
    const state = readAuditQueryState("?status=not_real&sortField=nope&sortDir=sideways");

    expect(state).toEqual({
      filters: {},
      sort: { dir: "desc", field: "ts" },
    });
  });

  it("normalizes unsupported route search values before querying the API", () => {
    const state = auditSearchToQueryState({
      sortDir: "sideways",
      sortField: "nope",
    });

    expect(state.sort).toEqual({ dir: "desc", field: "ts" });
  });

  it("applies named Audit Query state filter transitions", () => {
    const initial = readAuditQueryState("?rail=wire&severity=critical&tsFrom=100&tsTo=200");
    const withoutSeverity = auditQueryStateWithSeverityFilter(initial, undefined);
    const withRail = auditQueryStateWithRailFilter(withoutSeverity, "ach");
    const withStatus = auditQueryStateWithStatusFilter(withRail, "failed");
    const withTime = auditQueryStateWithTimeBounds(withStatus, { tsFrom: 500 });

    expect(withTime).toEqual({
      filters: {
        rail: ["ach"],
        status: ["failed"],
        tsFrom: 500,
      },
      sort: { dir: "desc", field: "ts" },
    });
  });

  it("toggles Audit Query sort direction for the selected field", () => {
    const state = readAuditQueryState("?sortField=status");

    expect(auditQueryStateWithToggledSort(state, "status").sort).toEqual({
      dir: "asc",
      field: "status",
    });
    expect(auditQueryStateWithToggledSort(state, "rail").sort).toEqual({
      dir: "desc",
      field: "rail",
    });
  });
});
