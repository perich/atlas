import type { AuditEntry } from "@bankops/contracts";

import { filteredEntries } from "./filters.js";
import { capped, DEFAULT_ROLLUP_LIMIT } from "./limits.js";
import {
  addMetric,
  compareRollupValues,
  jsonSafeNumber,
  metricValue,
  zeroForMetric,
} from "./metrics.js";
import { detailRecord, stringField } from "./shared.js";
import type { AnalystFilters, BreakdownDimension, BreakdownMetric } from "./types.js";

export function getBreakdown(
  entries: readonly AuditEntry[],
  {
    dimension,
    filters = {},
    limit = DEFAULT_ROLLUP_LIMIT,
    metric,
  }: {
    dimension: BreakdownDimension;
    metric: BreakdownMetric;
    filters?: AnalystFilters;
    limit?: number;
  },
) {
  const totals = new Map<string, number | bigint>();

  for (const entry of filteredEntries(entries, filters)) {
    const key = dimensionValue(entry, dimension);
    const current = totals.get(key) ?? zeroForMetric(metric);
    totals.set(key, addMetric(current, metricValue(entry, metric)));
  }

  return capped(
    [...totals.entries()]
      .sort((left, right) => compareRollupValues(right[1], left[1]))
      .map(([key, value]) => ({ key, value: jsonSafeNumber(value) })),
    limit,
  );
}

function dimensionValue(entry: AuditEntry, dimension: BreakdownDimension) {
  if (dimension === "rail") {
    return entry.rail ?? "none";
  }
  if (dimension === "severity") {
    return entry.severity;
  }
  if (dimension === "status") {
    return entry.status;
  }
  if (dimension === "kind") {
    return entry.kind;
  }

  return stringField(detailRecord(entry, "customer"), dimension.split(".")[1]) ?? "unknown";
}
