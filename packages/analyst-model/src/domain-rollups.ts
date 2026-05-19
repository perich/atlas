import type { AuditEntry } from "@bankops/contracts";

import { filteredEntries } from "./filters.js";
import {
  countBy,
  groupedByRail,
  latestOptionalDetailBigInt,
  maxOptionalDetailNumber,
  optionalDetailString,
  sumOptionalDetailBigInts,
  sumOptionalDetailNumbers,
} from "./shared.js";
import type { AnalystFilters } from "./types.js";

export function getReconciliationRollup(entries: readonly AuditEntry[], filters: AnalystFilters) {
  const rows = filteredEntries(entries, { ...filters, kind: ["reconciliation"] });
  const byRail = groupedByRail(rows, (railRows) => ({
    events: railRows.length,
    exceptionPressure: sumOptionalDetailNumbers(railRows, "exceptionPressure"),
    matchedCount: sumOptionalDetailNumbers(railRows, "matchedCount"),
    unmatchedCount: sumOptionalDetailNumbers(railRows, "unmatchedCount"),
  }));

  return {
    runs: rows.length,
    matchedCount: sumOptionalDetailNumbers(rows, "matchedCount"),
    unmatchedCount: sumOptionalDetailNumbers(rows, "unmatchedCount"),
    exceptionPressure: sumOptionalDetailNumbers(rows, "exceptionPressure"),
    byRail,
  };
}

export function getLiquidityRollup(entries: readonly AuditEntry[], filters: AnalystFilters) {
  const rows = filteredEntries(entries, { ...filters, kind: ["liquidity"] });
  const byRail = groupedByRail(rows, (railRows) => ({
    events: railRows.length,
    latestReserveAfterMinor: latestOptionalDetailBigInt(railRows, "reserveAfterMinor")?.toString(),
    reserveDeltaMinor: sumOptionalDetailBigInts(railRows, "reserveDeltaMinor").toString(),
    stress: countBy(
      railRows,
      (entry) => optionalDetailString(entry, "liquidityStress") ?? "unknown",
    ),
  }));

  return {
    events: rows.length,
    reserveDeltaMinor: sumOptionalDetailBigInts(rows, "reserveDeltaMinor").toString(),
    latestReserveAfterMinor: latestOptionalDetailBigInt(rows, "reserveAfterMinor")?.toString(),
    byStress: countBy(rows, (entry) => optionalDetailString(entry, "liquidityStress") ?? "unknown"),
    byRail,
  };
}

export function getRailHealthRollup(entries: readonly AuditEntry[], filters: AnalystFilters) {
  const rows = filteredEntries(entries, { ...filters, kind: ["rail_health"] });
  const byRail = groupedByRail(rows, (railRows) => ({
    events: railRows.length,
    errorRateBpsMax: maxOptionalDetailNumber(railRows, "errorRateBps"),
    p95LatencyMsMax: maxOptionalDetailNumber(railRows, "p95LatencyMs"),
    pendingDepthMax: maxOptionalDetailNumber(railRows, "pendingDepth"),
  }));

  return {
    events: rows.length,
    p95LatencyMsMax: maxOptionalDetailNumber(rows, "p95LatencyMs"),
    errorRateBpsMax: maxOptionalDetailNumber(rows, "errorRateBps"),
    pendingDepthMax: maxOptionalDetailNumber(rows, "pendingDepth"),
    byRail,
  };
}
