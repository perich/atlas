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
  return jsonAuditEntrySchema.parse(toAuditApiJson(entry));
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

function toAuditApiJson(value: unknown): unknown {
  return JSON.parse(
    JSON.stringify(value, (_key, item: unknown) =>
      typeof item === "bigint" ? item.toString() : item,
    ),
  );
}
