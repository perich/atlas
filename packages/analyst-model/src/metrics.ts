import type { AuditEntry } from "@bankops/contracts";

import { optionalDetailNumber } from "./shared.js";
import type { BreakdownMetric, TimeGrain, TimeSeriesMetric } from "./types.js";

export function bucketTs(ts: number, grain: TimeGrain) {
  const size = grain === "hour" ? 3_600_000 : 86_400_000;
  return Math.floor(ts / size) * size;
}

export function metricValue(entry: AuditEntry, metric: TimeSeriesMetric | BreakdownMetric) {
  if (metric === "amountMinor") {
    return entry.amountMinor ?? 0n;
  }
  if (metric === "failedCount") {
    return entry.status === "failed" ? 1 : 0;
  }
  if (metric === "exceptionPressure") {
    return optionalDetailNumber(entry, "exceptionPressure") ?? 0;
  }
  if (metric === "pendingDepth") {
    return optionalDetailNumber(entry, "pendingDepth") ?? 0;
  }
  return 1;
}

export function zeroForMetric(metric: TimeSeriesMetric | BreakdownMetric) {
  return metric === "amountMinor" ? 0n : 0;
}

export function addMetric(left: number | bigint, right: number | bigint) {
  if (typeof left === "bigint" || typeof right === "bigint") {
    return BigInt(left) + BigInt(right);
  }
  return left + right;
}

export function jsonSafeNumber(value: number | bigint) {
  return typeof value === "bigint" ? value.toString() : value;
}

export function compareRollupValues(left: number | bigint, right: number | bigint) {
  const leftComparable = typeof left === "bigint" ? Number(left) : left;
  const rightComparable = typeof right === "bigint" ? Number(right) : right;
  return leftComparable - rightComparable;
}
