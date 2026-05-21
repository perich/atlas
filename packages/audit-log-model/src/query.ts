import {
  DEFAULT_AUDIT_SORT,
  auditCursorForEntry,
  decodeAuditCursor,
  type AuditEntry,
  type AuditFacets,
  type AuditFilters,
  type AuditPage,
  type AuditQuery,
  type AuditSort,
} from "@bankops/contracts";

export type { AuditFilters };

export function queryAuditEntries(entries: readonly AuditEntry[], query: AuditQuery): AuditPage {
  const startedAt = Date.now();
  const sort = query.sort ?? DEFAULT_AUDIT_SORT;
  const filtered = filterEntries(entries, query.filters);
  const sorted = filtered.toSorted((left, right) => compareEntries(left, right, sort));
  const start = pageStart(sorted, query, sort);
  const rows = sorted.slice(start, start + query.limit);
  const newestTs = newestAuditEntryTs(filtered);
  const nextCursor =
    start + query.limit < sorted.length && rows.length > 0
      ? auditCursorForEntry(rows[rows.length - 1], sort)
      : undefined;
  const prevCursor = start > 0 && rows.length > 0 ? auditCursorForEntry(rows[0], sort) : undefined;
  const page: AuditPage = {
    rows,
    offset: start,
    totalMatched: sorted.length,
    queryMs: Date.now() - startedAt,
  };

  if (newestTs !== undefined) {
    page.newestTs = newestTs;
  }

  if (nextCursor !== undefined) {
    page.nextCursor = nextCursor;
  }

  if (prevCursor !== undefined) {
    page.prevCursor = prevCursor;
  }

  return page;
}

function newestAuditEntryTs(entries: readonly AuditEntry[]): number | undefined {
  return entries.reduce<number | undefined>((newestTs, entry) => {
    if (newestTs === undefined || entry.ts > newestTs) {
      return entry.ts;
    }

    return newestTs;
  }, undefined);
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
): readonly AuditEntry[] {
  if (filters === undefined) {
    return entries;
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
  const decoded = decodeAuditCursor(cursor);

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

function increment(counts: Record<string, number>, key: string) {
  counts[key] = (counts[key] ?? 0) + 1;
}
