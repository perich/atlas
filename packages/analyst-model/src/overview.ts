import type { AuditEntry } from "@bankops/contracts";

import { filteredEntries } from "./filters.js";
import { amountTotal, countBy } from "./shared.js";
import type { AnalystFilters } from "./types.js";

export function getDatasetOverview(entries: readonly AuditEntry[], filters: AnalystFilters) {
  const rows = filteredEntries(entries, filters);
  const distinctCustomers = new Set<string>();
  let tsFrom: number | undefined;
  let tsTo: number | undefined;

  for (const entry of rows) {
    if (entry.customerId) {
      distinctCustomers.add(entry.customerId);
    }
    tsFrom = tsFrom === undefined ? entry.ts : Math.min(tsFrom, entry.ts);
    tsTo = tsTo === undefined ? entry.ts : Math.max(tsTo, entry.ts);
  }

  return {
    totalEntries: rows.length,
    timeRange: {
      from: tsFrom,
      to: tsTo,
    },
    distinctCustomers: distinctCustomers.size,
    amountMinorTotal: amountTotal(rows).toString(),
    byRail: countBy(rows, (entry) => entry.rail ?? "none"),
    bySeverity: countBy(rows, (entry) => entry.severity),
    byStatus: countBy(rows, (entry) => entry.status),
    byKind: countBy(rows, (entry) => entry.kind),
  };
}
