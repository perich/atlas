import type { AuditEntry } from "@bankops/contracts";

import { filteredEntries } from "./filters.js";
import {
  countBy,
  detailString,
  groupedByRail,
  latestDetailBigInt,
  maxDetailNumber,
  sumDetailBigInt,
  sumDetailNumber,
} from "./shared.js";
import type { AnalystFilters } from "./types.js";

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
