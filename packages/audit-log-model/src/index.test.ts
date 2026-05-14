import { RAILS } from "@bankops/contracts";
import { describe, expect, it } from "vitest";

import {
  AUDIT_LOG_TARGET_COUNT,
  createAuditEntries,
  DEFAULT_AUDIT_ENTRY_COUNT,
  getAuditLogEntries,
} from "./index.js";

describe("audit log generator", () => {
  it("creates the default static server dataset once per process", () => {
    const first = getAuditLogEntries();
    const second = getAuditLogEntries();

    expect(first).toBe(second);
    expect(first).toHaveLength(DEFAULT_AUDIT_ENTRY_COUNT);
    expect(AUDIT_LOG_TARGET_COUNT).toBeGreaterThan(DEFAULT_AUDIT_ENTRY_COUNT);
  });

  it("emits deterministic entries", () => {
    const first = createAuditEntries(256);
    const second = createAuditEntries(256);

    expect(first).toEqual(second);
    expect(first[0]).toEqual({
      ...second[0],
      id: "aud_00000000",
      traceId: expect.stringMatching(/^tr_00000000_/),
    });
  });

  it("sorts naturally as newest first", () => {
    const entries = createAuditEntries(1_000);

    for (let index = 1; index < entries.length; index += 1) {
      expect(entries[index].ts).toBeLessThan(entries[index - 1].ts);
    }
  });

  it("uses a valid audit envelope", () => {
    const entries = createAuditEntries(512);

    for (const entry of entries) {
      expect(entry.id).toMatch(/^aud_/);
      expect(entry.ts).toBeGreaterThan(0);
      expect(entry.action.length).toBeGreaterThan(0);
      expect(entry.subjectId.length).toBeGreaterThan(0);
      expect(entry.customerId).toMatch(/^cus_/);
      expect(entry.accountId).toMatch(/^acct_/);
      expect(entry.traceId).toMatch(/^tr_/);
      expect(entry.summary).toContain(entry.customerId);
      expect(entry.detail).toEqual(expect.any(Object));
    }
  });

  it("covers the heterogeneous bank audit vocabulary", () => {
    const entries = createAuditEntries(1_200);
    const kinds = new Set(entries.map((entry) => entry.kind));
    const severities = new Set(entries.map((entry) => entry.severity));
    const statuses = new Set(entries.map((entry) => entry.status));
    const rails = new Set(entries.map((entry) => entry.rail));
    const riskEntries = entries.filter((entry) => entry.riskTier !== undefined);
    const idempotentEntries = entries.filter((entry) => entry.idempotencyKey !== undefined);

    expect(kinds).toEqual(
      new Set([
        "payment",
        "journal",
        "settlement",
        "reconciliation",
        "risk",
        "liquidity",
        "rail_health",
        "cutoff",
        "configuration",
        "operator_action",
      ]),
    );
    expect(severities).toEqual(new Set(["critical", "info", "notice", "warning"]));
    expect(statuses).toEqual(
      new Set(["accepted", "failed", "pending", "posted", "reversed", "settled"]),
    );
    expect(rails).toEqual(new Set(RAILS));
    expect(riskEntries.length).toBeGreaterThan(0);
    expect(idempotentEntries.length).toBeGreaterThan(0);
  });

  it("can generate the planned 250k-row scale without changing API shape", () => {
    const entries = createAuditEntries(AUDIT_LOG_TARGET_COUNT);
    const last = entries.at(-1);

    expect(entries).toHaveLength(250_000);
    expect(last?.id).toBe(`aud_${(AUDIT_LOG_TARGET_COUNT - 1).toString(36).padStart(8, "0")}`);
  });
});
