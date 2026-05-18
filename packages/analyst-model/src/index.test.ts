import type { AuditEntry } from "@bankops/contracts";
import { describe, expect, it } from "vitest";

import {
  getAuditSample,
  getBreakdown,
  getCustomerRiskRollup,
  getDatasetOverview,
  getLiquidityRollup,
  getRailHealthRollup,
  getReconciliationRollup,
  getTimeSeries,
} from "./index.js";

describe("analyst rollups", () => {
  const rows = entries();

  it("summarizes a filtered dataset with JSON-safe amounts", () => {
    const overview = getDatasetOverview(rows, { rail: ["ach"] });

    expect(overview.totalEntries).toBe(3);
    expect(overview.distinctCustomers).toBe(2);
    expect(overview.amountMinorTotal).toBe("8000");
    expect(overview.bySeverity).toMatchObject({ critical: 1, warning: 2 });
  });

  it("builds time series and breakdowns with truncation metadata", () => {
    expect(
      getTimeSeries(rows, { grain: "hour", metric: "amountMinor" }).map((point) => point.value),
    ).toEqual(["8000", "6000"]);

    const breakdown = getBreakdown(rows, {
      dimension: "customer.segment",
      limit: 1,
      metric: "count",
    });

    expect(breakdown.rows).toEqual([{ key: "payroll", value: 5 }]);
    expect(breakdown.truncation).toEqual({ limit: 1, total: 2, truncated: true });
  });

  it("returns capped JSON-safe audit samples", () => {
    const sample = getAuditSample(rows, { limit: 2, sort: "amountDesc" });

    expect(sample.rows.map((row) => row.amountMinor)).toEqual(["5000", "4000"]);
    expect(sample.rows[0]?.detail.reserveDeltaMinor).toBeUndefined();
    expect(sample.truncation.truncated).toBe(true);
  });

  it("rolls up reconciliation, liquidity, and rail health facts", () => {
    expect(getReconciliationRollup(rows)).toMatchObject({
      exceptionPressure: 7,
      matchedCount: 90,
      unmatchedCount: 12,
    });
    expect(getLiquidityRollup(rows)).toMatchObject({
      reserveDeltaMinor: "-2500",
      latestReserveAfterMinor: "98000",
    });
    expect(getRailHealthRollup(rows)).toMatchObject({
      errorRateBpsMax: 92,
      p95LatencyMsMax: 1200,
      pendingDepthMax: 40,
    });
  });

  it("caps customer risk rollups and preserves amount strings", () => {
    const rollup = getCustomerRiskRollup(rows, { limit: 1 });

    expect(rollup.rows).toEqual([
      expect.objectContaining({
        amountMinor: "7000",
        customerId: "cus_a",
        exceptionPressure: 26,
        failedCount: 1,
        riskProfile: "elevated",
        segment: "payroll",
      }),
    ]);
    expect(rollup.truncation).toEqual({ limit: 1, total: 3, truncated: true });
  });
});

function entries(): AuditEntry[] {
  return [
    makeEntry({
      amountMinor: 5_000n,
      customerId: "cus_a",
      detail: customerDetail({ exceptionPressure: 12, pendingDepth: 40 }),
      id: "aud_1",
      rail: "ach",
      severity: "warning",
      status: "failed",
      ts: 3_600_000,
    }),
    makeEntry({
      amountMinor: 2_000n,
      customerId: "cus_a",
      detail: customerDetail({ exceptionPressure: 14, reviewQueueDepth: 18 }),
      id: "aud_2",
      kind: "risk",
      rail: "ach",
      severity: "critical",
      status: "pending",
      ts: 3_620_000,
    }),
    makeEntry({
      customerId: "cus_b",
      detail: customerDetail({
        exceptionPressure: 7,
        matchedCount: 90,
        unmatchedCount: 12,
      }),
      id: "aud_3",
      kind: "reconciliation",
      rail: "wire",
      ts: 3_630_000,
    }),
    makeEntry({
      amountMinor: 4_000n,
      customerId: "cus_c",
      detail: customerDetail({
        reserveAfterMinor: 98_000n,
        reserveDeltaMinor: -2_500n,
        liquidityStress: "startup_outflow",
      }),
      id: "aud_4",
      kind: "liquidity",
      rail: "stablecoin",
      status: "posted",
      ts: 7_200_000,
    }),
    makeEntry({
      customerId: "cus_b",
      detail: customerDetail({ errorRateBps: 92, p95LatencyMs: 1200, pendingDepth: 40 }),
      id: "aud_5",
      kind: "rail_health",
      rail: "wire",
      status: "pending",
      ts: 7_210_000,
    }),
    makeEntry({
      customerId: "cus_b",
      detail: customerDetail({ exceptionPressure: 2 }),
      id: "aud_6",
      rail: "ach",
      severity: "warning",
      status: "accepted",
      ts: 7_220_000,
    }),
  ];
}

function makeEntry(overrides: Partial<AuditEntry>): AuditEntry {
  return {
    action: "payment.submitted",
    actor: "system",
    amountMinor: 1_000n,
    asset: "USD",
    customerId: "cus_fixture",
    accountId: "acct_fixture",
    detail: customerDetail({}),
    id: "aud_fixture",
    kind: "payment",
    rail: "ach",
    severity: "info",
    status: "accepted",
    subjectId: "pay_fixture",
    subjectType: "payment",
    summary: "fixture",
    traceId: "tr_fixture",
    ts: 0,
    ...overrides,
  };
}

function customerDetail(detail: Record<string, unknown>) {
  return {
    ...detail,
    customer: {
      id: "cus_fixture",
      name: "Fixture Customer",
      region: "west",
      riskProfile: detail.exceptionPressure === 2 ? "standard" : "elevated",
      segment: detail.exceptionPressure === 2 ? "marketplace" : "payroll",
    },
  };
}
