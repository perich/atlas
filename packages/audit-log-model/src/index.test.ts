import { RAILS, type AuditEntry } from "@bankops/contracts";
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
      expect(entry.detail).toMatchObject({
        account: {
          accountType: expect.any(String),
          id: entry.accountId,
          ledgerRegion: expect.any(String),
        },
        customer: {
          id: entry.customerId,
          monthlyVolumeBand: expect.any(String),
          name: expect.any(String),
          primaryRail: expect.any(String),
          region: expect.any(String),
          relationshipAgeDays: expect.any(Number),
          riskProfile: expect.any(String),
          segment: expect.any(String),
        },
      });
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

  it("keeps subject identifiers aligned with detail identifiers", () => {
    const entries = createAuditEntries(256);

    expectDetailSubjectId(entries, "paymentId");
    expectDetailSubjectId(entries, "journalId");
    expectDetailSubjectId(entries, "settlementBatchId");
    expectDetailSubjectId(entries, "cutoffId");
  });

  it("keeps high-pressure filtered slices varied enough for demos", () => {
    const entries = createAuditEntries(5_000);
    const critical = entries.filter((entry) => entry.severity === "critical").slice(0, 40);
    const failed = entries.filter((entry) => entry.status === "failed").slice(0, 40);
    const criticalActions = new Set(critical.map((entry) => entry.action));
    const failedActions = new Set(failed.map((entry) => entry.action));
    const cutoffRows = critical.filter((entry) => entry.action === "cutoff.window_opened");

    expect(criticalActions.size).toBeGreaterThanOrEqual(4);
    expect(failedActions.size).toBeGreaterThanOrEqual(3);
    expect(cutoffRows.length).toBeLessThan(critical.length / 2);
  });

  it("adds analyst-useful operational pressure without exposing scenario labels", () => {
    const entries = createAuditEntries(60_000);
    const serialized = JSON.stringify(entries, (_key, value: unknown) =>
      typeof value === "bigint" ? value.toString() : value,
    );

    expect(serialized).not.toMatch(/scenario|achReturnWave|stablecoinFinalityLag|wireCutoff/i);
    expect(maxDetailNumber(entries, "returnRiskBps")).toBeGreaterThanOrEqual(338);
    expect(maxDetailNumber(entries, "finalityLagMs")).toBeGreaterThanOrEqual(27_000);
    expect(maxDetailNumber(entries, "unmatchedCount")).toBeGreaterThanOrEqual(38);
    expect(maxDetailNumber(entries, "reviewQueueDepth")).toBeGreaterThanOrEqual(22);
    expect(minDetailBigInt(entries, "reserveDeltaMinor")).toBeLessThan(0n);
  });

  it("can generate the planned 250k-row scale without changing API shape", () => {
    const entries = createAuditEntries(AUDIT_LOG_TARGET_COUNT);
    const last = entries.at(-1);

    expect(entries).toHaveLength(250_000);
    expect(last?.id).toBe(`aud_${(AUDIT_LOG_TARGET_COUNT - 1).toString(36).padStart(8, "0")}`);
  });
});

function maxDetailNumber(entries: readonly AuditEntry[], key: string) {
  return Math.max(
    ...entries.map((entry) => {
      const value = entry.detail[key];
      return typeof value === "number" ? value : 0;
    }),
  );
}

function minDetailBigInt(entries: readonly AuditEntry[], key: string) {
  return entries.reduce<bigint>((minimum, entry) => {
    const value = entry.detail[key];
    return typeof value === "bigint" && value < minimum ? value : minimum;
  }, 0n);
}

function expectDetailSubjectId(entries: readonly AuditEntry[], detailKey: string) {
  const entry = entries.find((candidate) => detailKey in candidate.detail);

  if (entry === undefined) {
    throw new Error(`Missing generated audit detail: ${detailKey}`);
  }

  expect(entry.detail[detailKey]).toBe(entry.subjectId);
}
