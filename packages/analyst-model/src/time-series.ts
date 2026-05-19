import type { AuditEntry } from "@bankops/contracts";

import { filteredEntries } from "./filters.js";
import { addMetric, bucketTs, jsonSafeNumber, metricValue, zeroForMetric } from "./metrics.js";
import type { AnalystFilters, TimeGrain, TimeSeriesMetric } from "./types.js";

export function getTimeSeries(
  entries: readonly AuditEntry[],
  {
    filters = {},
    grain,
    metric,
  }: {
    metric: TimeSeriesMetric;
    grain: TimeGrain;
    filters?: AnalystFilters;
  },
) {
  const buckets = new Map<number, number | bigint>();

  for (const entry of filteredEntries(entries, filters)) {
    const key = bucketTs(entry.ts, grain);
    const current = buckets.get(key) ?? zeroForMetric(metric);
    buckets.set(key, addMetric(current, metricValue(entry, metric)));
  }

  return [...buckets.entries()]
    .sort(([left], [right]) => left - right)
    .map(([ts, value]) => ({ ts, value: jsonSafeNumber(value) }));
}
