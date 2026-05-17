import { parseAuditQueryStateSearch } from "@bankops/contracts";

export {
  auditSearchToQueryState,
  queryStateToAuditSearch,
  serializeAuditQueryState,
  validateAuditSearch,
  type AuditQueryState,
} from "@bankops/contracts";

export function readAuditQueryState(search = window.location.search) {
  return parseAuditQueryStateSearch(search);
}
