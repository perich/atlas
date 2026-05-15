import { parseAuditQueryStateSearch } from "@bankops/contracts";

export {
  DEFAULT_AUDIT_QUERY_STATE,
  auditSearchToQueryState,
  queryStateToAuditSearch,
  serializeAuditQueryState,
  validateAuditSearch,
  type AuditQueryState,
  type AuditSearch,
} from "@bankops/contracts";

export function readAuditQueryState(search = window.location.search) {
  return parseAuditQueryStateSearch(search);
}
