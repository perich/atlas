import {
  auditSortDirectionSchema,
  auditSortFieldSchema,
  type AuditEntry,
  type AuditFacets,
  type AuditPage,
  type AuditQuery,
  type AuditSort,
} from "@bankops/contracts";
import { z } from "zod";

export type AuditFilters = NonNullable<AuditQuery["filters"]>;

const cursorSchema = z.object({
  dir: auditSortDirectionSchema,
  field: auditSortFieldSchema,
  id: z.string(),
});

type Cursor = z.infer<typeof cursorSchema>;

const DEFAULT_SORT = {
  dir: "desc",
  field: "ts",
} satisfies AuditSort;

export function queryAuditEntries(entries: readonly AuditEntry[], query: AuditQuery): AuditPage {
  const startedAt = Date.now();
  const sort = query.sort ?? DEFAULT_SORT;
  const sorted = filterEntries(entries, query.filters).toSorted((left, right) =>
    compareEntries(left, right, sort),
  );
  const start = pageStart(sorted, query, sort);
  const rows = sorted.slice(start, start + query.limit);

  return {
    rows,
    offset: start,
    nextCursor:
      start + query.limit < sorted.length && rows.length > 0
        ? encodeCursor(rows[rows.length - 1], sort)
        : undefined,
    prevCursor: start > 0 && rows.length > 0 ? encodeCursor(rows[0], sort) : undefined,
    totalMatched: sorted.length,
    queryMs: Date.now() - startedAt,
  };
}

export function getAuditFacets(entries: readonly AuditEntry[], filters: AuditFilters): AuditFacets {
  const facets: AuditFacets = {
    rail: {},
    severity: {},
    status: {},
  };

  for (const entry of filterEntries(entries, filters)) {
    increment(facets.severity, entry.severity);
    increment(facets.status, entry.status);

    if (entry.rail !== undefined) {
      increment(facets.rail, entry.rail);
    }
  }

  return facets;
}

function filterEntries(
  entries: readonly AuditEntry[],
  filters: AuditFilters | undefined,
): AuditEntry[] {
  if (filters === undefined) {
    return [...entries];
  }

  return entries.filter((entry) => {
    if (filters.tsFrom !== undefined && entry.ts < filters.tsFrom) {
      return false;
    }

    if (filters.tsTo !== undefined && entry.ts > filters.tsTo) {
      return false;
    }

    if (filters.severity !== undefined && !filters.severity.includes(entry.severity)) {
      return false;
    }

    if (
      filters.rail !== undefined &&
      (entry.rail === undefined || !filters.rail.includes(entry.rail))
    ) {
      return false;
    }

    if (filters.status !== undefined && !filters.status.includes(entry.status)) {
      return false;
    }

    return true;
  });
}

function pageStart(entries: readonly AuditEntry[], query: AuditQuery, sort: AuditSort): number {
  if (query.offset !== undefined) {
    return Math.min(query.offset, entries.length);
  }

  if (query.after !== undefined) {
    return cursorIndex(entries, query.after, sort) + 1;
  }

  if (query.before !== undefined) {
    return Math.max(0, cursorIndex(entries, query.before, sort) - query.limit);
  }

  return 0;
}

function cursorIndex(entries: readonly AuditEntry[], cursor: string, sort: AuditSort): number {
  const decoded = decodeCursor(cursor);

  if (decoded.field !== sort.field || decoded.dir !== sort.dir) {
    throw new Error("Cursor sort does not match query sort");
  }

  const index = entries.findIndex((entry) => entry.id === decoded.id);

  if (index === -1) {
    throw new Error("Cursor row is outside the query result");
  }

  return index;
}

function compareEntries(left: AuditEntry, right: AuditEntry, sort: AuditSort): number {
  const valueComparison = compareValues(sortValue(left, sort.field), sortValue(right, sort.field));
  const idComparison = compareValues(left.id, right.id);
  const direction = sort.dir === "asc" ? 1 : -1;

  return (valueComparison || idComparison) * direction;
}

function sortValue(entry: AuditEntry, field: AuditSort["field"]): string | number {
  switch (field) {
    case "ts":
      return entry.ts;
    case "severity":
      return entry.severity;
    case "rail":
      return entry.rail ?? "";
    case "status":
      return entry.status;
    case "kind":
      return entry.kind;
  }

  const exhaustive: never = field;
  return exhaustive;
}

function compareValues(left: string | number, right: string | number): number {
  if (left < right) {
    return -1;
  }

  if (left > right) {
    return 1;
  }

  return 0;
}

function encodeCursor(entry: AuditEntry, sort: AuditSort): string {
  const cursor: Cursor = {
    dir: sort.dir,
    field: sort.field,
    id: entry.id,
  };

  return encodeURIComponent(JSON.stringify(cursor));
}

function decodeCursor(cursor: string): Cursor {
  try {
    return cursorSchema.parse(JSON.parse(decodeURIComponent(cursor)));
  } catch {
    throw new Error("Invalid audit cursor");
  }
}

function increment(counts: Record<string, number>, key: string) {
  counts[key] = (counts[key] ?? 0) + 1;
}
