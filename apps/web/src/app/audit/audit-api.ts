import type { AuditEntry, AuditFacets } from "@bankops/contracts";

import type { AuditQueryState } from "./audit-query-state";
import { serializeAuditQueryState } from "./audit-query-state";
import type { AuditWindowRequest } from "./audit-window";
import { AUDIT_PAGE_SIZE } from "./audit-window";

export type JsonAuditEntry = Omit<AuditEntry, "amountMinor" | "detail"> & {
  amountMinor?: string;
  detail: Record<string, unknown>;
};

export type JsonAuditPage = {
  rows: JsonAuditEntry[];
  nextCursor?: string;
  prevCursor?: string;
  totalMatched: number;
  queryMs: number;
};

export async function fetchAuditPage(input: {
  state: AuditQueryState;
  request: AuditWindowRequest;
  signal: AbortSignal;
}): Promise<JsonAuditPage> {
  const params = new URLSearchParams(serializeAuditQueryState(input.state));
  params.set("limit", String(AUDIT_PAGE_SIZE));

  if (input.request.direction === "after") {
    params.set("after", input.request.cursor);
  }

  if (input.request.direction === "before") {
    params.set("before", input.request.cursor);
  }

  const response = await fetch(`/api/audit?${params.toString()}`, {
    signal: input.signal,
  });

  if (!response.ok) {
    throw new Error("Failed to load audit rows");
  }

  const page: unknown = await response.json();
  assertAuditPage(page);
  return page;
}

export async function fetchAuditFacets(input: {
  state: AuditQueryState;
  signal: AbortSignal;
}): Promise<AuditFacets> {
  const response = await fetch(`/api/audit/facets${serializeAuditQueryState(input.state)}`, {
    signal: input.signal,
  });

  if (!response.ok) {
    throw new Error("Failed to load audit facets");
  }

  const facets: unknown = await response.json();
  assertAuditFacets(facets);
  return facets;
}

function assertAuditPage(value: unknown): asserts value is JsonAuditPage {
  if (typeof value !== "object" || value === null) {
    throw new Error("Invalid audit page");
  }

  if (!("rows" in value) || !Array.isArray(value.rows)) {
    throw new Error("Invalid audit page");
  }

  if (!("totalMatched" in value) || !("queryMs" in value)) {
    throw new Error("Invalid audit page");
  }
}

function assertAuditFacets(value: unknown): asserts value is AuditFacets {
  if (typeof value !== "object" || value === null) {
    throw new Error("Invalid audit facets");
  }

  if (!("severity" in value) || !("rail" in value) || !("status" in value)) {
    throw new Error("Invalid audit facets");
  }
}
