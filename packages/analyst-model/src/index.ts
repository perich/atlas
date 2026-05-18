import type { AuditEntry, AuditEntryKind, Rail } from "@bankops/contracts";

export type AnalystWindow = {
  tsFrom?: number;
  tsTo?: number;
};
export type AnalystFilters = AnalystWindow & {
  rail?: Rail[];
  severity?: AuditEntry["severity"][];
  status?: AuditEntry["status"][];
  kind?: AuditEntryKind[];
  customerId?: string[];
};
export type Truncation = {
  truncated: boolean;
  limit: number;
  total: number;
};
export type TimeGrain = "hour" | "day";
export type TimeSeriesMetric =
  | "count"
  | "amountMinor"
  | "failedCount"
  | "exceptionPressure"
  | "pendingDepth";
export type BreakdownDimension =
  | "rail"
  | "severity"
  | "status"
  | "kind"
  | "customer.segment"
  | "customer.region"
  | "customer.riskProfile"
  | "customer.monthlyVolumeBand";
export type BreakdownMetric = "count" | "amountMinor" | "failedCount" | "exceptionPressure";
export type AuditSampleSort = "newest" | "oldest" | "amountDesc" | "severityDesc";

export const DEFAULT_ROLLUP_LIMIT = 20;
export const MAX_ROLLUP_LIMIT = 80;

export function getDatasetOverview(entries: readonly AuditEntry[], filters: AnalystFilters = {}) {
  const rows = filteredEntries(entries, filters);
  const tsValues = rows.map((entry) => entry.ts);

  return {
    totalEntries: rows.length,
    timeRange: {
      from: tsValues.length ? Math.min(...tsValues) : undefined,
      to: tsValues.length ? Math.max(...tsValues) : undefined,
    },
    distinctCustomers: new Set(
      rows.flatMap((entry) => (entry.customerId ? [entry.customerId] : [])),
    ).size,
    amountMinorTotal: amountTotal(rows).toString(),
    byRail: countBy(rows, (entry) => entry.rail ?? "none"),
    bySeverity: countBy(rows, (entry) => entry.severity),
    byStatus: countBy(rows, (entry) => entry.status),
    byKind: countBy(rows, (entry) => entry.kind),
  };
}

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

export function getAuditSample(
  entries: readonly AuditEntry[],
  {
    filters = {},
    limit = DEFAULT_ROLLUP_LIMIT,
    sort = "newest",
  }: {
    filters?: AnalystFilters;
    limit?: number;
    sort?: AuditSampleSort;
  } = {},
) {
  return capped(
    [...filteredEntries(entries, filters)]
      .sort((left, right) => compareSample(left, right, sort))
      .map(toSampleRow),
    limit,
  );
}

export function getReconciliationRollup(
  entries: readonly AuditEntry[],
  filters: AnalystFilters = {},
) {
  const rows = filteredEntries(entries, { ...filters, kind: ["reconciliation"] });
  const byRail = groupedByRail(rows, (railRows) => ({
    events: railRows.length,
    exceptionPressure: sumDetailNumber(railRows, "exceptionPressure"),
    matchedCount: sumDetailNumber(railRows, "matchedCount"),
    unmatchedCount: sumDetailNumber(railRows, "unmatchedCount"),
  }));

  return {
    runs: rows.length,
    matchedCount: sumDetailNumber(rows, "matchedCount"),
    unmatchedCount: sumDetailNumber(rows, "unmatchedCount"),
    exceptionPressure: sumDetailNumber(rows, "exceptionPressure"),
    byRail,
  };
}

export function getLiquidityRollup(entries: readonly AuditEntry[], filters: AnalystFilters = {}) {
  const rows = filteredEntries(entries, { ...filters, kind: ["liquidity"] });
  const byRail = groupedByRail(rows, (railRows) => ({
    events: railRows.length,
    latestReserveAfterMinor: latestDetailBigInt(railRows, "reserveAfterMinor")?.toString(),
    reserveDeltaMinor: sumDetailBigInt(railRows, "reserveDeltaMinor").toString(),
    stress: countBy(railRows, (entry) => detailString(entry, "liquidityStress")),
  }));

  return {
    events: rows.length,
    reserveDeltaMinor: sumDetailBigInt(rows, "reserveDeltaMinor").toString(),
    latestReserveAfterMinor: latestDetailBigInt(rows, "reserveAfterMinor")?.toString(),
    byStress: countBy(rows, (entry) => detailString(entry, "liquidityStress")),
    byRail,
  };
}

export function getRailHealthRollup(entries: readonly AuditEntry[], filters: AnalystFilters = {}) {
  const rows = filteredEntries(entries, { ...filters, kind: ["rail_health"] });
  const byRail = groupedByRail(rows, (railRows) => ({
    events: railRows.length,
    errorRateBpsMax: maxDetailNumber(railRows, "errorRateBps"),
    p95LatencyMsMax: maxDetailNumber(railRows, "p95LatencyMs"),
    pendingDepthMax: maxDetailNumber(railRows, "pendingDepth"),
  }));

  return {
    events: rows.length,
    p95LatencyMsMax: maxDetailNumber(rows, "p95LatencyMs"),
    errorRateBpsMax: maxDetailNumber(rows, "errorRateBps"),
    pendingDepthMax: maxDetailNumber(rows, "pendingDepth"),
    byRail,
  };
}

export function getCustomerRiskRollup(
  entries: readonly AuditEntry[],
  {
    filters = {},
    limit = DEFAULT_ROLLUP_LIMIT,
  }: {
    filters?: AnalystFilters;
    limit?: number;
  } = {},
) {
  const grouped = new Map<
    string,
    {
      customerId: string;
      name: string;
      segment: string;
      riskProfile: string;
      entries: number;
      failedCount: number;
      amountMinor: bigint;
      exceptionPressure: number;
      riskReviewVolume: number;
    }
  >();

  for (const entry of filteredEntries(entries, filters)) {
    const customerId = entry.customerId ?? "unknown";
    const customer = detailRecord(entry, "customer");
    const current = grouped.get(customerId) ?? {
      amountMinor: 0n,
      customerId,
      entries: 0,
      exceptionPressure: 0,
      failedCount: 0,
      name: stringField(customer, "name") ?? customerId,
      riskProfile: stringField(customer, "riskProfile") ?? "unknown",
      riskReviewVolume: 0,
      segment: stringField(customer, "segment") ?? "unknown",
    };

    current.entries += 1;
    current.failedCount += entry.status === "failed" ? 1 : 0;
    current.amountMinor += entry.amountMinor ?? 0n;
    current.exceptionPressure += detailNumber(entry, "exceptionPressure");
    current.riskReviewVolume += detailNumber(entry, "reviewQueueDepth");
    grouped.set(customerId, current);
  }

  return capped(
    [...grouped.values()]
      .sort((left, right) => right.exceptionPressure - left.exceptionPressure)
      .map((customer) => {
        const riskScore =
          customer.exceptionPressure + customer.failedCount * 10 + customer.riskReviewVolume;

        return {
          ...customer,
          amountMinor: customer.amountMinor.toString(),
          risk: riskScore,
          riskScore,
        };
      }),
    limit,
  );
}

function filteredEntries(entries: readonly AuditEntry[], filters: AnalystFilters): AuditEntry[] {
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

function capped<T>(rows: T[], requestedLimit: number) {
  const limit = Math.min(requestedLimit, MAX_ROLLUP_LIMIT);

  return {
    rows: rows.slice(0, limit),
    truncation: {
      limit,
      total: rows.length,
      truncated: rows.length > limit,
    } satisfies Truncation,
  };
}

function countBy(entries: readonly AuditEntry[], keyFor: (entry: AuditEntry) => string) {
  const counts: Record<string, number> = {};

  for (const entry of entries) {
    const key = keyFor(entry);
    counts[key] = (counts[key] ?? 0) + 1;
  }

  return counts;
}

function groupedByRail<T>(entries: readonly AuditEntry[], summarize: (rows: AuditEntry[]) => T) {
  const groups = new Map<string, AuditEntry[]>();

  for (const entry of entries) {
    const rail = entry.rail ?? "none";
    const rows = groups.get(rail) ?? [];
    rows.push(entry);
    groups.set(rail, rows);
  }

  return Object.fromEntries(
    [...groups.entries()]
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([rail, railRows]) => [rail, summarize(railRows)]),
  );
}

function amountTotal(entries: readonly AuditEntry[]) {
  return entries.reduce((total, entry) => total + (entry.amountMinor ?? 0n), 0n);
}

function bucketTs(ts: number, grain: TimeGrain) {
  const size = grain === "hour" ? 3_600_000 : 86_400_000;
  return Math.floor(ts / size) * size;
}

function metricValue(entry: AuditEntry, metric: TimeSeriesMetric | BreakdownMetric) {
  if (metric === "amountMinor") {
    return entry.amountMinor ?? 0n;
  }
  if (metric === "failedCount") {
    return entry.status === "failed" ? 1 : 0;
  }
  if (metric === "exceptionPressure") {
    return detailNumber(entry, "exceptionPressure");
  }
  if (metric === "pendingDepth") {
    return detailNumber(entry, "pendingDepth");
  }
  return 1;
}

function zeroForMetric(metric: TimeSeriesMetric | BreakdownMetric) {
  return metric === "amountMinor" ? 0n : 0;
}

function addMetric(left: number | bigint, right: number | bigint) {
  if (typeof left === "bigint" || typeof right === "bigint") {
    return BigInt(left) + BigInt(right);
  }
  return left + right;
}

function jsonSafeNumber(value: number | bigint) {
  return typeof value === "bigint" ? value.toString() : value;
}

function compareRollupValues(left: number | bigint, right: number | bigint) {
  const leftComparable = typeof left === "bigint" ? Number(left) : left;
  const rightComparable = typeof right === "bigint" ? Number(right) : right;
  return leftComparable - rightComparable;
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

function compareSample(left: AuditEntry, right: AuditEntry, sort: AuditSampleSort) {
  if (sort === "oldest") {
    return left.ts - right.ts;
  }
  if (sort === "amountDesc") {
    return Number(right.amountMinor ?? 0n) - Number(left.amountMinor ?? 0n);
  }
  if (sort === "severityDesc") {
    return severityScore(right.severity) - severityScore(left.severity);
  }
  return right.ts - left.ts;
}

function severityScore(severity: AuditEntry["severity"]) {
  return { critical: 4, warning: 3, notice: 2, info: 1 }[severity];
}

function toSampleRow(entry: AuditEntry) {
  const detail = sampleDetailSummary(entry.detail);

  return {
    id: entry.id,
    ts: entry.ts,
    severity: entry.severity,
    kind: entry.kind,
    action: entry.action,
    customerId: entry.customerId,
    rail: entry.rail,
    status: entry.status,
    amountMinor: entry.amountMinor?.toString(),
    summary: entry.summary,
    detail,
    detailSummary: detail,
  };
}

function sampleDetailSummary(detail: Record<string, unknown>) {
  const parts = Object.entries(detail)
    .flatMap(([key, value]) => {
      if (key === "customer") {
        const name =
          value !== null && typeof value === "object" && !Array.isArray(value)
            ? stringField(Object.fromEntries(Object.entries(value)), "name")
            : undefined;
        return name === undefined ? [] : [`customer=${name}`];
      }
      if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
        return [`${key}=${String(value)}`];
      }
      if (typeof value === "bigint") {
        return [`${key}=${value.toString()}`];
      }
      return [];
    })
    .slice(0, 6);

  return parts.join("; ");
}

function sumDetailNumber(entries: readonly AuditEntry[], key: string) {
  return entries.reduce((total, entry) => total + detailNumber(entry, key), 0);
}

function maxDetailNumber(entries: readonly AuditEntry[], key: string) {
  return entries.reduce((maximum, entry) => Math.max(maximum, detailNumber(entry, key)), 0);
}

function sumDetailBigInt(entries: readonly AuditEntry[], key: string) {
  return entries.reduce((total, entry) => {
    const value = entry.detail[key];
    return total + (typeof value === "bigint" ? value : 0n);
  }, 0n);
}

function latestDetailBigInt(entries: readonly AuditEntry[], key: string) {
  const entry = [...entries].sort((left, right) => right.ts - left.ts)[0];
  const value = entry?.detail[key];
  return typeof value === "bigint" ? value : undefined;
}

function detailNumber(entry: AuditEntry, key: string) {
  const value = entry.detail[key];
  return typeof value === "number" ? value : 0;
}

function detailString(entry: AuditEntry, key: string) {
  const value = entry.detail[key];
  return typeof value === "string" ? value : "unknown";
}

function detailRecord(entry: AuditEntry, key: string) {
  const value = entry.detail[key];
  if (value !== null && typeof value === "object" && !Array.isArray(value)) {
    return Object.fromEntries(Object.entries(value));
  }

  return undefined;
}

function stringField(record: Record<string, unknown> | undefined, key: string) {
  const value = record?.[key];
  return typeof value === "string" ? value : undefined;
}
