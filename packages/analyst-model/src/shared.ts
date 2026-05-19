import type { AuditEntry } from "@bankops/contracts";

export function countBy(entries: readonly AuditEntry[], keyFor: (entry: AuditEntry) => string) {
  const counts: Record<string, number> = {};

  for (const entry of entries) {
    const key = keyFor(entry);
    counts[key] = (counts[key] ?? 0) + 1;
  }

  return counts;
}

export function groupedByRail<T>(
  entries: readonly AuditEntry[],
  summarize: (rows: AuditEntry[]) => T,
) {
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

export function amountTotal(entries: readonly AuditEntry[]) {
  return entries.reduce((total, entry) => total + (entry.amountMinor ?? 0n), 0n);
}

export function sumOptionalDetailNumbers(entries: readonly AuditEntry[], key: string) {
  return entries.reduce((total, entry) => total + (optionalDetailNumber(entry, key) ?? 0), 0);
}

export function maxOptionalDetailNumber(entries: readonly AuditEntry[], key: string) {
  return entries.reduce(
    (maximum, entry) => Math.max(maximum, optionalDetailNumber(entry, key) ?? 0),
    0,
  );
}

export function sumOptionalDetailBigInts(entries: readonly AuditEntry[], key: string) {
  return entries.reduce((total, entry) => {
    const value = entry.detail[key];
    return total + (typeof value === "bigint" ? value : 0n);
  }, 0n);
}

export function latestOptionalDetailBigInt(entries: readonly AuditEntry[], key: string) {
  const entry = [...entries].sort((left, right) => right.ts - left.ts)[0];
  const value = entry?.detail[key];
  return typeof value === "bigint" ? value : undefined;
}

export function optionalDetailNumber(entry: AuditEntry, key: string) {
  const value = entry.detail[key];
  return typeof value === "number" ? value : undefined;
}

export function optionalDetailString(entry: AuditEntry, key: string) {
  const value = entry.detail[key];
  return typeof value === "string" ? value : undefined;
}

export function optionalDetailRecord(entry: AuditEntry, key: string) {
  const value = entry.detail[key];
  if (value !== null && typeof value === "object" && !Array.isArray(value)) {
    return Object.fromEntries(Object.entries(value));
  }

  return undefined;
}

export function optionalStringField(record: Record<string, unknown> | undefined, key: string) {
  const value = record?.[key];
  return typeof value === "string" ? value : undefined;
}
