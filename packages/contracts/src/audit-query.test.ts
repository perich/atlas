import { describe, expect, it } from "vitest";

import {
  DEFAULT_AUDIT_LIMIT,
  auditCursorForEntry,
  auditSearchToQueryState,
  decodeAuditCursor,
  parseAuditFilterParams,
  parseAuditQueryParams,
  parseAuditQueryStateSearch,
  serializeAuditQueryState,
  validateAuditSearch,
} from "./audit-query.js";

describe("Audit Query Module", () => {
  it("normalizes browser search params without leaking UI-only state", () => {
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

  it("drops unsupported browser search values and keeps Audit Query defaults", () => {
    const search = validateAuditSearch({
      rail: ["wire", "not_real"],
      sortDir: "sideways",
      sortField: "nope",
      tsFrom: "1778500000000",
    });

    expect(auditSearchToQueryState(search)).toEqual({
      filters: {
        rail: ["wire"],
        tsFrom: 1_778_500_000_000,
      },
      sort: { dir: "desc", field: "ts" },
    });
  });

  it("round-trips supported filters and sort from URL params", () => {
    const state = parseAuditQueryStateSearch(
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

  it("parses strict HTTP query params for the audit API", () => {
    expect(
      parseAuditQueryParams({
        limit: "25",
        offset: "500",
        rail: "wire,ach",
        sortDir: "asc",
        sortField: "status",
      }),
    ).toEqual({
      filters: { rail: ["wire", "ach"] },
      limit: 25,
      offset: 500,
      sort: { dir: "asc", field: "status" },
    });

    expect(parseAuditQueryParams({})).toEqual({
      filters: {},
      limit: DEFAULT_AUDIT_LIMIT,
      sort: { dir: "desc", field: "ts" },
    });
  });

  it("rejects malformed strict HTTP query params", () => {
    expect(() => parseAuditQueryParams({ limit: "0" })).toThrow("limit must be between 1 and 500");
    expect(() => parseAuditFilterParams({ severity: "urgent" })).toThrow(
      "severity must be one of: info, notice, warning, critical",
    );
    expect(() => parseAuditQueryParams({ after: "a", before: "b" })).toThrow(
      "Use only one paging anchor",
    );
  });

  it("encodes and decodes opaque audit cursors", () => {
    const cursor = auditCursorForEntry({ id: "aud_1" }, { dir: "desc", field: "ts" });

    expect(decodeAuditCursor(cursor)).toEqual({
      dir: "desc",
      field: "ts",
      id: "aud_1",
    });
    expect(() => decodeAuditCursor("not-json")).toThrow("Invalid audit cursor");
  });
});
