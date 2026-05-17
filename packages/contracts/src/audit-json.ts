import {
  jsonAuditEntrySchema,
  jsonAuditFacetsSchema,
  jsonAuditPageSchema,
  type AuditEntry,
  type AuditFacets,
  type AuditPage,
  type JsonAuditEntry,
  type JsonAuditFacets,
  type JsonAuditPage,
} from "./audit.js";

export function toJsonAuditEntry(entry: AuditEntry): JsonAuditEntry {
  return jsonAuditEntrySchema.parse({
    ...entry,
    amountMinor: entry.amountMinor?.toString(),
    detail: toJsonAuditDetail(entry.detail),
  });
}

export function toJsonAuditPage(page: AuditPage): JsonAuditPage {
  return jsonAuditPageSchema.parse({
    ...page,
    rows: page.rows.map(toJsonAuditEntry),
  });
}

export function toJsonAuditFacets(facets: AuditFacets): JsonAuditFacets {
  return jsonAuditFacetsSchema.parse(facets);
}

function toJsonAuditDetail(detail: AuditEntry["detail"]): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(detail)
      .filter(([, item]) => item !== undefined)
      .map(([key, item]) => [key, toJsonValue(item)]),
  );
}

function toJsonValue(value: unknown): unknown {
  if (typeof value === "bigint") {
    return value.toString();
  }

  if (Array.isArray(value)) {
    return value.map(toJsonValue);
  }

  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([, item]) => item !== undefined)
        .map(([key, item]) => [key, toJsonValue(item)]),
    );
  }

  return value;
}
