import { describe, expect, it } from "vitest";

import {
  toJsonAuditEntry,
  toJsonAuditFacets,
  toJsonAuditPage,
  type AuditEntry,
  type AuditFacets,
  type AuditPage,
} from "./index.js";

const auditEntry = {
  action: "journal.posted",
  actor: "system",
  amountMinor: 125_00n,
  asset: "USD",
  customerId: "cus_0001",
  accountId: "acct_00001",
  detail: {
    journalId: "jrnl_1",
    reserveAfterMinor: 2_500_000_000_00n,
    lines: [{ amountMinor: -125_00n, accountId: "acct_00001", ignored: undefined }],
  },
  id: "aud_00000001",
  idempotencyKey: "idem_1",
  kind: "journal",
  rail: "wire",
  riskTier: 1,
  severity: "info",
  status: "posted",
  subjectId: "jrnl_1",
  subjectType: "journal",
  summary: "journal.posted on wire for cus_0001",
  traceId: "tr_1",
  ts: 1_778_600_000_000,
} satisfies AuditEntry;

describe("Audit Entry JSON Adapter", () => {
  it("converts domain Audit Entries to the API JSON shape with a named bigint policy", () => {
    expect(toJsonAuditEntry(auditEntry)).toMatchObject({
      amountMinor: "12500",
      detail: {
        reserveAfterMinor: "250000000000",
        lines: [{ amountMinor: "-12500", accountId: "acct_00001" }],
      },
    });
  });

  it("converts Audit Pages and Facets through their JSON contracts", () => {
    const page: AuditPage = {
      rows: [auditEntry],
      offset: 0,
      nextCursor: "next",
      totalMatched: 1,
      queryMs: 2,
    };
    const facets: AuditFacets = {
      rail: { wire: 1 },
      severity: { info: 1 },
      status: { posted: 1 },
    };

    expect(toJsonAuditPage(page).rows[0]?.amountMinor).toBe("12500");
    expect(toJsonAuditFacets(facets)).toEqual(facets);
  });
});
