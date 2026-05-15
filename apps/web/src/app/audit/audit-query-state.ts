import type { AuditQuery, AuditSort } from "@bankops/contracts";
import {
  auditSeveritySchema,
  auditSortDirectionSchema,
  auditSortFieldSchema,
  auditStatusSchema,
  railSchema,
} from "@bankops/contracts";
import { z } from "zod";

type AuditSearchValue = string | string[] | number | undefined;
type AuditSearchInput = Record<string, AuditSearchValue>;
type StringSchema<T extends string> = z.ZodType<T>;

const safeIntegerSchema = z.int();
const searchStringsSchema = z.union([
  z.array(z.union([z.string(), z.number()])).transform((values) => values.map(String)),
  z.string().transform((value) => [value]),
  z.number().transform((value) => [String(value)]),
  z.undefined().transform(() => [] as string[]),
]);

export type AuditSearch = {
  severity?: string;
  rail?: string;
  status?: string;
  tsFrom?: number;
  tsTo?: number;
  sortField?: AuditSort["field"];
  sortDir?: AuditSort["dir"];
};

export type AuditQueryState = {
  filters: NonNullable<AuditQuery["filters"]>;
  sort: AuditSort;
};

export const DEFAULT_AUDIT_QUERY_STATE = {
  filters: {},
  sort: { field: "ts", dir: "desc" },
} satisfies AuditQueryState;

export function validateAuditSearch(search: AuditSearchInput): AuditSearch {
  const tsFrom = parseNumber(search.tsFrom);
  const tsTo = parseNumber(search.tsTo);
  const severity = enumList(search.severity, auditSeveritySchema);
  const rail = enumList(search.rail, railSchema);
  const status = enumList(search.status, auditStatusSchema);
  const sortField = enumList(search.sortField, auditSortFieldSchema)[0];
  const sortDir = enumList(search.sortDir, auditSortDirectionSchema)[0];

  return {
    ...(severity.length > 0 ? { severity: severity.join(",") } : {}),
    ...(rail.length > 0 ? { rail: rail.join(",") } : {}),
    ...(status.length > 0 ? { status: status.join(",") } : {}),
    ...(tsFrom === undefined ? {} : { tsFrom }),
    ...(tsTo === undefined ? {} : { tsTo }),
    ...(sortField === undefined ? {} : { sortField }),
    ...(sortDir === undefined ? {} : { sortDir }),
  };
}

export function auditSearchToQueryState(search: AuditSearch): AuditQueryState {
  return {
    filters: {
      ...(search.severity === undefined
        ? {}
        : { severity: enumList(search.severity, auditSeveritySchema) }),
      ...(search.rail === undefined ? {} : { rail: enumList(search.rail, railSchema) }),
      ...(search.status === undefined
        ? {}
        : { status: enumList(search.status, auditStatusSchema) }),
      ...(search.tsFrom === undefined ? {} : { tsFrom: search.tsFrom }),
      ...(search.tsTo === undefined ? {} : { tsTo: search.tsTo }),
    },
    sort: {
      field: search.sortField ?? DEFAULT_AUDIT_QUERY_STATE.sort.field,
      dir: search.sortDir ?? DEFAULT_AUDIT_QUERY_STATE.sort.dir,
    },
  };
}

export function queryStateToAuditSearch(state: AuditQueryState): Partial<AuditSearch> {
  return {
    ...(state.filters.severity === undefined ? {} : { severity: state.filters.severity.join(",") }),
    ...(state.filters.rail === undefined ? {} : { rail: state.filters.rail.join(",") }),
    ...(state.filters.status === undefined ? {} : { status: state.filters.status.join(",") }),
    ...(state.filters.tsFrom === undefined ? {} : { tsFrom: state.filters.tsFrom }),
    ...(state.filters.tsTo === undefined ? {} : { tsTo: state.filters.tsTo }),
    ...(state.sort.field === DEFAULT_AUDIT_QUERY_STATE.sort.field
      ? {}
      : { sortField: state.sort.field }),
    ...(state.sort.dir === DEFAULT_AUDIT_QUERY_STATE.sort.dir ? {} : { sortDir: state.sort.dir }),
  };
}

export function readAuditQueryState(search = window.location.search): AuditQueryState {
  const params = new URLSearchParams(search);
  const filters: AuditQueryState["filters"] = {};
  const severity = enumList(params.getAll("severity"), auditSeveritySchema);
  const rail = enumList(params.getAll("rail"), railSchema);
  const status = enumList(params.getAll("status"), auditStatusSchema);
  const sortField = enumList(params.getAll("sortField"), auditSortFieldSchema)[0];
  const sortDir = enumList(params.getAll("sortDir"), auditSortDirectionSchema)[0];
  const tsFrom = params.get("tsFrom");
  const tsTo = params.get("tsTo");

  if (severity.length > 0) {
    filters.severity = severity;
  }

  if (rail.length > 0) {
    filters.rail = rail;
  }

  if (status.length > 0) {
    filters.status = status;
  }

  if (tsFrom !== null) {
    const parsed = parseNumber(tsFrom);

    if (parsed !== undefined) {
      filters.tsFrom = parsed;
    }
  }

  if (tsTo !== null) {
    const parsed = parseNumber(tsTo);

    if (parsed !== undefined) {
      filters.tsTo = parsed;
    }
  }

  return {
    filters,
    sort: {
      field: sortField ?? DEFAULT_AUDIT_QUERY_STATE.sort.field,
      dir: sortDir ?? DEFAULT_AUDIT_QUERY_STATE.sort.dir,
    },
  };
}

export function serializeAuditQueryState(state: AuditQueryState): string {
  const params = new URLSearchParams();

  appendList(params, "severity", state.filters.severity);
  appendList(params, "rail", state.filters.rail);
  appendList(params, "status", state.filters.status);

  if (state.filters.tsFrom !== undefined) {
    params.set("tsFrom", String(state.filters.tsFrom));
  }

  if (state.filters.tsTo !== undefined) {
    params.set("tsTo", String(state.filters.tsTo));
  }

  if (state.sort.field !== DEFAULT_AUDIT_QUERY_STATE.sort.field) {
    params.set("sortField", state.sort.field);
  }

  if (state.sort.dir !== DEFAULT_AUDIT_QUERY_STATE.sort.dir) {
    params.set("sortDir", state.sort.dir);
  }

  const serialized = params.toString();
  return serialized.length === 0 ? "" : `?${serialized}`;
}

function appendList(params: URLSearchParams, key: string, items: readonly string[] | undefined) {
  if (items !== undefined && items.length > 0) {
    params.set(key, items.join(","));
  }
}

function enumList<const T extends string>(
  input: AuditSearchValue | string[],
  schema: StringSchema<T>,
): T[] {
  return toSearchStrings(input)
    .flatMap((value) => value.split(","))
    .map((value) => value.trim())
    .filter((value): value is T => schema.safeParse(value).success);
}

function parseNumber(input: AuditSearchValue) {
  const value = toSearchStrings(input)[0];

  if (value === undefined) {
    return undefined;
  }

  const parsed = Number(value);
  return safeIntegerSchema.safeParse(parsed).success ? parsed : undefined;
}

function toSearchStrings(input: AuditSearchValue | string[]) {
  return searchStringsSchema.parse(input);
}
