import type { AuditEntry } from "@bankops/contracts";

import { filteredEntries } from "./filters.js";
import { capped } from "./limits.js";
import {
  addMetric,
  compareRollupValues,
  jsonSafeNumber,
  metricValue,
  zeroForMetric,
} from "./metrics.js";
import { optionalDetailRecord, optionalStringField } from "./shared.js";
import type { AnalystFilters, BreakdownDimension, BreakdownMetric } from "./types.js";

const CUSTOMER_DIMENSION_PREFIX = "customer.";

type BreakdownOptions = {
  dimension: BreakdownDimension;
  filters: AnalystFilters;
  limit: number;
  metric: BreakdownMetric;
};

export function getBreakdown(
  entries: readonly AuditEntry[],
  { dimension, filters, limit, metric }: BreakdownOptions,
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

  const customerField = dimension.startsWith(CUSTOMER_DIMENSION_PREFIX)
    ? dimension.slice(CUSTOMER_DIMENSION_PREFIX.length)
    : undefined;

  return customerField === undefined
    ? "unknown"
    : (optionalStringField(optionalDetailRecord(entry, "customer"), customerField) ?? "unknown");
}
