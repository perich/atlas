import { jsonAuditFacetsSchema, jsonAuditPageSchema } from "@bankops/contracts";
import type { JsonAuditEntry, JsonAuditFacets, JsonAuditPage } from "@bankops/contracts";

import type { AuditQueryState } from "./audit-query-state";
import { serializeAuditQueryState } from "./audit-query-state";
import type { AuditWindowRequest } from "./audit-window";
import { AUDIT_PAGE_SIZE } from "./audit-window";

export type { JsonAuditEntry, JsonAuditFacets, JsonAuditPage };

export async function fetchAuditPage(input: {
  state: AuditQueryState;
  request: AuditWindowRequest;
  signal: AbortSignal;
}): Promise<JsonAuditPage> {
  const params = auditWindowSearchParams(input.state, input.request);

  const response = await fetch(`/api/audit?${params.toString()}`, {
    signal: input.signal,
  });

  if (!response.ok) {
    throw new Error("Failed to load audit rows");
  }

  const page: unknown = await response.json();
  return jsonAuditPageSchema.parse(page);
}

export async function fetchAuditFacets(input: {
  state: AuditQueryState;
  signal: AbortSignal;
}): Promise<JsonAuditFacets> {
  const params = new URLSearchParams(serializeAuditQueryState(input.state));
  const response = await fetch(`/api/audit/facets?${params.toString()}`, {
    signal: input.signal,
  });

  if (!response.ok) {
    throw new Error("Failed to load audit facets");
  }

  const facets: unknown = await response.json();
  return jsonAuditFacetsSchema.parse(facets);
}

function auditWindowSearchParams(
  state: AuditQueryState,
  request: AuditWindowRequest,
): URLSearchParams {
  const params = new URLSearchParams(serializeAuditQueryState(state));
  params.set("limit", String(AUDIT_PAGE_SIZE));

  if (request.direction === "after") {
    params.set("after", request.cursor);
  }

  if (request.direction === "before") {
    params.set("before", request.cursor);
  }

  if (request.direction === "offset") {
    params.set("offset", String(request.offset));
  }

  return params;
}
