import type { AuditEntry, AuditQuery } from "@bankops/contracts";
import { describe, expect, it } from "vitest";

import { getAuditFacets, queryAuditEntries } from "./query.js";

describe("audit query model", () => {
  it("defaults to newest entries first with an id tie breaker", () => {
    const page = queryAuditEntries(entries(), { limit: 4 });

    expect(page.rows.map((row) => row.id)).toEqual(["aud_f", "aud_d", "aud_c", "aud_b"]);
    expect(page.totalMatched).toBe(6);
    expect(page.nextCursor).toEqual(expect.any(String));
    expect(page.prevCursor).toBeUndefined();
  });

  it("filters by time range, severity, rail, and status", () => {
    const page = queryAuditEntries(entries(), {
      filters: {
        rail: ["wire"],
        severity: ["warning", "critical"],
        status: ["failed", "pending"],
        tsFrom: 1_000,
        tsTo: 2_000,
      },
      limit: 10,
    });

    expect(page.rows.map((row) => row.id)).toEqual(["aud_d", "aud_b"]);
  });

  it("sorts by one visible field with id as the implicit tie breaker", () => {
    const page = queryAuditEntries(entries(), {
      limit: 10,
      sort: { dir: "asc", field: "status" },
    });

    expect(page.rows.map((row) => `${row.status}:${row.id}`)).toEqual([
      "accepted:aud_a",
      "failed:aud_b",
      "failed:aud_d",
      "pending:aud_c",
      "posted:aud_e",
      "settled:aud_f",
    ]);
  });

  it("uses opaque cursors without duplicate rows when sort values repeat", () => {
    const query = { limit: 2 } satisfies AuditQuery;
    const first = queryAuditEntries(entries(), query);
    const second = queryAuditEntries(entries(), { ...query, after: first.nextCursor });
    const third = queryAuditEntries(entries(), { ...query, after: second.nextCursor });

    expect(first.rows.map((row) => row.id)).toEqual(["aud_f", "aud_d"]);
    expect(second.rows.map((row) => row.id)).toEqual(["aud_c", "aud_b"]);
    expect(third.rows.map((row) => row.id)).toEqual(["aud_a", "aud_e"]);

    const seen = new Set([...first.rows, ...second.rows, ...third.rows].map((row) => row.id));
    expect(seen.size).toBe(6);
  });

  it("pages backward from a cursor boundary", () => {
    const first = queryAuditEntries(entries(), { limit: 2 });
    const second = queryAuditEntries(entries(), { after: first.nextCursor, limit: 2 });
    const previous = queryAuditEntries(entries(), { before: second.prevCursor, limit: 2 });

    expect(previous.rows.map((row) => row.id)).toEqual(first.rows.map((row) => row.id));
  });

  it("computes facets inside the active filter context", () => {
    const facets = getAuditFacets(entries(), {
      rail: ["wire"],
    });

    expect(facets.rail).toEqual({ wire: 3 });
    expect(facets.severity).toEqual({ critical: 1, info: 1, warning: 1 });
    expect(facets.status).toEqual({ accepted: 1, failed: 2 });
  });

  it("rejects malformed cursors", () => {
    expect(() => queryAuditEntries(entries(), { after: "not-json", limit: 2 })).toThrow();
  });
});

function entries(): AuditEntry[] {
  return [
    makeEntry({ id: "aud_a", rail: "wire", severity: "info", status: "accepted", ts: 1_000 }),
    makeEntry({ id: "aud_b", rail: "wire", severity: "warning", status: "failed", ts: 2_000 }),
    makeEntry({ id: "aud_c", rail: "ach", severity: "warning", status: "pending", ts: 2_000 }),
    makeEntry({ id: "aud_d", rail: "wire", severity: "critical", status: "failed", ts: 2_000 }),
    makeEntry({ id: "aud_e", rail: "stablecoin", severity: "notice", status: "posted", ts: 900 }),
    makeEntry({ id: "aud_f", rail: "instant", severity: "info", status: "settled", ts: 3_000 }),
  ];
}

function makeEntry(overrides: Partial<AuditEntry>): AuditEntry {
  return {
    action: "payment.submitted",
    actor: "system",
    amountMinor: 100n,
    asset: "USD",
    customerId: "cus_0001",
    accountId: "acct_00001",
    detail: {},
    id: "aud_0",
    kind: "payment",
    rail: "wire",
    severity: "info",
    status: "accepted",
    subjectId: "pay_0",
    subjectType: "payment",
    summary: "payment.submitted on wire for cus_0001",
    traceId: "tr_0",
    ts: 1_000,
    ...overrides,
  };
}
