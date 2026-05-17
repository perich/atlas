import {
  jsonAuditFacetsSchema,
  jsonAuditPageSchema,
  type JsonAuditFacets,
  type JsonAuditPage,
} from "@bankops/contracts";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { buildServer } from "./main.js";

let app: Awaited<ReturnType<typeof buildServer>>;

describe("/api/audit", () => {
  beforeEach(async () => {
    app = await buildServer(false);
    await app.ready();
  });

  afterEach(async () => {
    await app.close();
  });

  it("returns newest audit entries by default", async () => {
    const page = await getAuditPage("/api/audit?limit=5");

    expect(page.rows).toHaveLength(5);
    expect(page.totalMatched).toBeGreaterThan(90_000);
    expect(page.queryMs).toEqual(expect.any(Number));
    expect(page.nextCursor).toEqual(expect.any(String));
    expect(page.prevCursor).toBeUndefined();
    expect(page.newestTs).toEqual(expect.any(Number));
    expect(page.rows[0].ts).toBeGreaterThan(page.rows[1].ts);
    expect(typeof page.rows[0].amountMinor).toBe("string");
  });

  it("filters by sparse audit facets", async () => {
    const page = await getAuditPage(
      "/api/audit?limit=50&severity=notice,warning&rail=wire&status=failed,reversed",
    );

    expect(page.rows.length).toBeGreaterThan(0);
    expect(page.rows.every((row) => row.rail === "wire")).toBe(true);
    expect(page.rows.every((row) => row.severity === "notice" || row.severity === "warning")).toBe(
      true,
    );
    expect(page.rows.every((row) => row.status === "failed" || row.status === "reversed")).toBe(
      true,
    );
  });

  it("changes the single sort column while keeping stable id ordering", async () => {
    const page = await getAuditPage("/api/audit?limit=40&sortField=status&sortDir=asc");
    const statusValues = page.rows.map((row) => row.status);

    expect(statusValues).toEqual([...statusValues].sort());
  });

  it("uses cursors for forward and backward paging", async () => {
    const first = await getAuditPage("/api/audit?limit=25");
    const second = await getAuditPage(
      `/api/audit?limit=25&after=${encodeURIComponent(first.nextCursor!)}`,
    );
    const previous = await getAuditPage(
      `/api/audit?limit=25&before=${encodeURIComponent(second.prevCursor!)}`,
    );

    const firstIds = first.rows.map((row) => row.id);
    const secondIds = second.rows.map((row) => row.id);

    expect(new Set([...firstIds, ...secondIds]).size).toBe(firstIds.length + secondIds.length);
    expect(previous.rows.map((row) => row.id)).toEqual(firstIds);
  });

  it("jumps directly to an offset for virtualized scrollbar seeks", async () => {
    const page = await getAuditPage("/api/audit?limit=25&offset=500");

    expect(page.rows).toHaveLength(25);
    expect(page.offset).toBe(500);
    expect(page.prevCursor).toEqual(expect.any(String));
    expect(page.nextCursor).toEqual(expect.any(String));
  });

  it("returns facets without audit rows", async () => {
    const page = await getAuditPage("/api/audit?limit=1&severity=critical&rail=stablecoin");
    const facets = await getAuditFacets("/api/audit/facets?severity=critical&rail=stablecoin");

    expect(facets.severity).toEqual({ critical: page.totalMatched });
    expect(facets.rail).toEqual({ stablecoin: page.totalMatched });
    expect(Object.values(facets.status).reduce((sum, count) => sum + count, 0)).toBe(
      page.totalMatched,
    );
  });

  it("rejects malformed query input", async () => {
    const invalidLimit = await app.inject({ method: "GET", url: "/api/audit?limit=0" });
    const invalidFilter = await app.inject({ method: "GET", url: "/api/audit?severity=urgent" });

    expect(invalidLimit.statusCode).toBe(400);
    expect(invalidFilter.statusCode).toBe(400);
  });
});

async function getAuditPage(url: string): Promise<JsonAuditPage> {
  const response = await app.inject({ method: "GET", url });

  expect(response.statusCode).toBe(200);
  return jsonAuditPageSchema.parse(JSON.parse(response.body));
}

async function getAuditFacets(url: string): Promise<JsonAuditFacets> {
  const response = await app.inject({ method: "GET", url });

  expect(response.statusCode).toBe(200);
  return jsonAuditFacetsSchema.parse(JSON.parse(response.body));
}
