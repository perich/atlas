import type { AuditEntry } from "@bankops/contracts";

import type { AnalystFilters } from "./types.js";

export function filteredEntries(
  entries: readonly AuditEntry[],
  filters: AnalystFilters,
): AuditEntry[] {
  return entries.filter((entry) => {
    if (filters.tsFrom !== undefined && entry.ts < filters.tsFrom) {
      return false;
    }
    if (filters.tsTo !== undefined && entry.ts > filters.tsTo) {
      return false;
    }
    if (
      filters.rail !== undefined &&
      (entry.rail === undefined || !filters.rail.includes(entry.rail))
    ) {
      return false;
    }
    if (filters.severity !== undefined && !filters.severity.includes(entry.severity)) {
      return false;
    }
    if (filters.status !== undefined && !filters.status.includes(entry.status)) {
      return false;
    }
    if (filters.kind !== undefined && !filters.kind.includes(entry.kind)) {
      return false;
    }
    if (filters.customerId !== undefined && !filters.customerId.includes(entry.customerId ?? "")) {
      return false;
    }
    return true;
  });
}
