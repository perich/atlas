import { describe, expect, it } from "vitest";

import type { JsonAuditPage } from "./audit-api";
import {
  AUDIT_MAX_WINDOWS,
  EMPTY_AUDIT_WINDOW_CACHE,
  mergeAuditWindow,
  nextAuditWindowRequest,
} from "./audit-window";
import type { AuditWindowRequest } from "./audit-window";

describe("audit window cache", () => {
  it("keeps row windows bounded while scrolling forward", () => {
    let cache = EMPTY_AUDIT_WINDOW_CACHE;
    let request: AuditWindowRequest = { direction: "initial" };

    for (let index = 0; index < AUDIT_MAX_WINDOWS + 2; index += 1) {
      cache = mergeAuditWindow(cache, request, page(index));
      request = { cursor: `next-${index}`, direction: "after" };
    }

    expect(cache.windows).toHaveLength(AUDIT_MAX_WINDOWS);
    expect(cache.windows[0].start).toBe(2);
    expect(cache.windows.flatMap((window) => window.rows).map((entry) => entry.id)).toEqual([
      "row-2",
      "row-3",
      "row-4",
      "row-5",
      "row-6",
    ]);
  });

  it("requests the next page near the bottom of the loaded window", () => {
    const cache = mergeAuditWindow(
      EMPTY_AUDIT_WINDOW_CACHE,
      { direction: "initial" },
      page(0, 100),
    );

    expect(nextAuditWindowRequest(cache, { start: 70, end: 99 })).toEqual({
      cursor: "next-0",
      direction: "after",
    });
  });

  it("jumps directly when the visible range is far outside the cached windows", () => {
    const cache = mergeAuditWindow(EMPTY_AUDIT_WINDOW_CACHE, { direction: "initial" }, page(0));

    expect(nextAuditWindowRequest(cache, { start: 100, end: 130 })).toEqual({
      direction: "offset",
      offset: 10,
    });
  });

  it("replaces the cache after a direct jump", () => {
    const initialCache = mergeAuditWindow(
      EMPTY_AUDIT_WINDOW_CACHE,
      { direction: "initial" },
      page(0),
    );
    const jumpedCache = mergeAuditWindow(
      initialCache,
      { direction: "offset", offset: 870 },
      page(870),
    );

    expect(jumpedCache.windows).toHaveLength(1);
    expect(jumpedCache.windows[0].start).toBe(870);
    expect(jumpedCache.windows[0].rows[0].id).toBe("row-870");
  });

  it("keeps the newest matching Audit Entry timestamp from the server page", () => {
    const cache = mergeAuditWindow(
      EMPTY_AUDIT_WINDOW_CACHE,
      { direction: "initial" },
      page(0, 1, 1_778_600_000_000),
    );

    expect(cache.newestTs).toBe(1_778_600_000_000);
  });

  it("can refetch a pruned previous region from the first retained cursor", () => {
    const cache = {
      ...EMPTY_AUDIT_WINDOW_CACHE,
      windows: [
        { nextCursor: "next-3", prevCursor: "prev-3", rows: [makeRow(3)], start: 3 },
        { nextCursor: "next-4", prevCursor: "prev-4", rows: [makeRow(4)], start: 4 },
      ],
    };

    expect(nextAuditWindowRequest(cache, { start: 3, end: 4 })).toEqual({
      cursor: "prev-3",
      direction: "before",
    });
  });
});

function page(index: number, rowCount = 1, newestTs?: number): JsonAuditPage {
  return {
    nextCursor: `next-${index}`,
    ...(newestTs === undefined ? {} : { newestTs }),
    offset: index,
    prevCursor: index === 0 ? undefined : `prev-${index}`,
    queryMs: 1,
    rows: Array.from({ length: rowCount }, (_value, offset) => makeRow(index + offset)),
    totalMatched: 1_000,
  };
}

function makeRow(index: number): JsonAuditPage["rows"][number] {
  return {
    action: "payment.submitted",
    actor: "system",
    amountMinor: "100",
    asset: "USD",
    customerId: "cus_0001",
    accountId: "acct_00001",
    detail: {},
    id: `row-${index}`,
    kind: "payment",
    rail: "wire",
    severity: "info",
    status: "posted",
    subjectId: `pay_${index}`,
    subjectType: "payment",
    summary: "payment submitted",
    traceId: `trace-${index}`,
    ts: 1_778_500_000_000 - index,
  };
}
