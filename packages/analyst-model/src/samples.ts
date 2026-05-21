import type { AuditEntry } from "@bankops/contracts";

import { filteredEntries } from "./filters.js";
import { capped } from "./limits.js";
import { optionalRecordField, optionalStringField } from "./shared.js";
import type { AnalystFilters, AuditSampleSort } from "./types.js";

type AuditSampleOptions = {
  filters: AnalystFilters;
  limit: number;
  sort: AuditSampleSort;
};

export function getAuditSample(
  entries: readonly AuditEntry[],
  { filters, limit, sort }: AuditSampleOptions,
) {
  return capped(
    [...filteredEntries(entries, filters)]
      .sort((left, right) => compareSample(left, right, sort))
      .map(toSampleRow),
    limit,
  );
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
        const name = optionalStringField(optionalRecordField(detail, "customer"), "name");
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
