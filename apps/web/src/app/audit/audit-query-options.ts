import { queryOptions } from "@tanstack/react-query";

import { fetchAuditFacets, fetchAuditPage } from "./audit-api";
import { serializeAuditQueryState, type AuditQueryState } from "./audit-query-state";
import type { AuditWindowRequest } from "./audit-window";

export const AUDIT_QUERY_STALE_MS = 30_000;

export function auditWindowOptions(state: AuditQueryState, request: AuditWindowRequest) {
  return queryOptions({
    queryKey: auditWindowQueryKey(state, request),
    queryFn: ({ signal }) => fetchAuditPage({ request, signal, state }),
    staleTime: AUDIT_QUERY_STALE_MS,
  });
}

export function auditFacetsOptions(state: AuditQueryState) {
  return queryOptions({
    queryKey: auditFacetsQueryKey(state),
    queryFn: ({ signal }) => fetchAuditFacets({ signal, state }),
    staleTime: AUDIT_QUERY_STALE_MS,
  });
}

function auditWindowQueryKey(state: AuditQueryState, request: AuditWindowRequest) {
  return ["audit-window", auditQueryStateKey(state), request] as const;
}

function auditFacetsQueryKey(state: AuditQueryState) {
  return ["audit-facets", auditQueryStateKey(state)] as const;
}

export function auditQueryStateKey(state: AuditQueryState) {
  return serializeAuditQueryState(state);
}
