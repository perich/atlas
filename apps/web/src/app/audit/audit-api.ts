import type { AuditEntry } from "@bankops/contracts";

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
  offset: number;
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

  if (input.request.direction === "offset") {
    params.set("offset", String(input.request.offset));
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

function assertAuditPage(value: unknown): asserts value is JsonAuditPage {
  if (typeof value !== "object" || value === null) {
    throw new Error("Invalid audit page");
  }

  if (!("rows" in value) || !Array.isArray(value.rows)) {
    throw new Error("Invalid audit page");
  }

  if (!("offset" in value) || !("totalMatched" in value) || !("queryMs" in value)) {
    throw new Error("Invalid audit page");
  }
}
