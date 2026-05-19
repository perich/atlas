import { z } from "zod";

import {
  AUDIT_SEVERITIES,
  AUDIT_SORT_DIRECTIONS,
  AUDIT_SORT_FIELDS,
  AUDIT_STATUSES,
  auditSeveritySchema,
  auditSortDirectionSchema,
  auditSortFieldSchema,
  auditSortSchema,
  auditStatusSchema,
  type AuditEntry,
  type AuditQuery,
  type AuditSort,
} from "./audit.js";
import { RAILS, railSchema } from "./domain.js";

export type AuditFilters = NonNullable<AuditQuery["filters"]>;
export type AuditQueryParams = Record<string, string | string[] | undefined>;
export type AuditSearch = {
  severity?: string;
  rail?: string;
  status?: string;
  tsFrom?: number;
  tsTo?: number;
  sortField?: string;
  sortDir?: string;
};
export type AuditQueryState = {
  filters: AuditFilters;
  sort: AuditSort;
};

type QueryParam = string | string[] | undefined;
type AuditSearchListInput = string | string[] | undefined;
type AuditSearchNumberInput = string | number | undefined;
export type AuditSearchInput = {
  severity?: AuditSearchListInput;
  rail?: AuditSearchListInput;
  status?: AuditSearchListInput;
  tsFrom?: AuditSearchNumberInput;
  tsTo?: AuditSearchNumberInput;
  sortField?: AuditSearchListInput;
  sortDir?: AuditSearchListInput;
};
type StringSchema<T extends string> = z.ZodType<T>;
type AuditQueryStringParams = {
  get(name: string): string | null;
  getAll(name: string): string[];
  set(name: string, value: string): void;
  toString(): string;
};

declare const URLSearchParams: {
  new (init?: string): AuditQueryStringParams;
};

export const DEFAULT_AUDIT_SORT = {
  dir: "desc",
  field: "ts",
} satisfies AuditSort;
export const DEFAULT_AUDIT_QUERY_STATE = {
  filters: {},
  sort: DEFAULT_AUDIT_SORT,
} satisfies AuditQueryState;
export const DEFAULT_AUDIT_LIMIT = 100;
export const MAX_AUDIT_LIMIT = 500;

export const auditFiltersSchema = z
  .object({
    tsFrom: z.int().optional(),
    tsTo: z.int().optional(),
    severity: z.array(auditSeveritySchema).optional(),
    rail: z.array(railSchema).optional(),
    status: z.array(auditStatusSchema).optional(),
  })
  .refine(
    (filters) =>
      filters.tsFrom === undefined || filters.tsTo === undefined || filters.tsFrom <= filters.tsTo,
    { message: "tsFrom must be less than or equal to tsTo" },
  );

export const auditQuerySchema = z
  .object({
    filters: auditFiltersSchema.optional(),
    sort: auditSortSchema.optional(),
    after: z.string().optional(),
    before: z.string().optional(),
    offset: z.int().nonnegative().optional(),
    limit: z.int().min(1).max(MAX_AUDIT_LIMIT),
  })
  .refine((query) => query.after === undefined || query.before === undefined, {
    message: "Use only one paging anchor",
  })
  .refine(
    (query) =>
      query.offset === undefined || (query.after === undefined && query.before === undefined),
    { message: "Use only one paging anchor" },
  );

export const auditCursorSchema = z.object({
  dir: auditSortDirectionSchema,
  field: auditSortFieldSchema,
  id: z.string(),
});

export type AuditCursor = z.infer<typeof auditCursorSchema>;

const safeIntegerSchema = z.int();
const limitSchema = z.int().min(1).max(MAX_AUDIT_LIMIT);
const offsetSchema = z.int().nonnegative();

export function validateAuditSearch(search: AuditSearchInput): AuditSearch {
  const tsFrom = parseSearchNumber(search.tsFrom);
  const tsTo = parseSearchNumber(search.tsTo);
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
  const sortField = enumList(search.sortField, auditSortFieldSchema)[0];
  const sortDir = enumList(search.sortDir, auditSortDirectionSchema)[0];

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
      field: sortField ?? DEFAULT_AUDIT_QUERY_STATE.sort.field,
      dir: sortDir ?? DEFAULT_AUDIT_QUERY_STATE.sort.dir,
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

export function parseAuditQueryStateSearchString(search: string): AuditQueryState {
  return parseAuditQueryStateSearchParams(new URLSearchParams(search));
}

export function parseAuditQueryStateSearchParams(params: AuditQueryStringParams): AuditQueryState {
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
    const parsed = parseSearchNumber(tsFrom);

    if (parsed !== undefined) {
      filters.tsFrom = parsed;
    }
  }

  if (tsTo !== null) {
    const parsed = parseSearchNumber(tsTo);

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

export function parseAuditQueryParams(params: AuditQueryParams): AuditQuery {
  const limit = parseLimit(params["limit"]);
  const after = single(params["after"], "after");
  const before = single(params["before"], "before");
  const rawOffset = single(params["offset"], "offset");
  const offset = rawOffset === undefined ? undefined : Number(rawOffset);
  const sortField = single(params["sortField"], "sortField");
  const sortDir = single(params["sortDir"], "sortDir");

  if (after !== undefined && before !== undefined) {
    throw new Error("Use only one paging anchor");
  }

  if (offset !== undefined && (after !== undefined || before !== undefined)) {
    throw new Error("Use only one paging anchor");
  }

  if (offset !== undefined && !offsetSchema.safeParse(offset).success) {
    throw new Error("offset must be a non-negative integer");
  }

  const field = sortField ?? DEFAULT_AUDIT_SORT.field;
  const dir = sortDir ?? DEFAULT_AUDIT_SORT.dir;
  const query: AuditQuery = {
    filters: parseAuditFilterParams(params),
    limit,
    sort: {
      field: parseOneOf(auditSortFieldSchema, field, "sortField", AUDIT_SORT_FIELDS),
      dir: parseOneOf(auditSortDirectionSchema, dir, "sortDir", AUDIT_SORT_DIRECTIONS),
    },
  };

  if (after !== undefined) {
    query.after = after;
  }

  if (before !== undefined) {
    query.before = before;
  }

  if (offset !== undefined) {
    query.offset = offset;
  }

  return auditQuerySchema.parse(query);
}

export function parseAuditFilterParams(params: AuditQueryParams): AuditFilters {
  const rawTsFrom = single(params["tsFrom"], "tsFrom");
  const rawTsTo = single(params["tsTo"], "tsTo");
  const tsFrom = rawTsFrom === undefined ? undefined : Number(rawTsFrom);
  const tsTo = rawTsTo === undefined ? undefined : Number(rawTsTo);
  const rail = list(params["rail"], "rail");
  const severity = list(params["severity"], "severity");
  const status = list(params["status"], "status");

  if (tsFrom !== undefined && !safeIntegerSchema.safeParse(tsFrom).success) {
    throw new Error("tsFrom must be an integer");
  }

  if (tsTo !== undefined && !safeIntegerSchema.safeParse(tsTo).success) {
    throw new Error("tsTo must be an integer");
  }

  if (tsFrom !== undefined && tsTo !== undefined && tsFrom > tsTo) {
    throw new Error("tsFrom must be less than or equal to tsTo");
  }

  const filters: AuditFilters = {};

  if (rail !== undefined) {
    filters.rail = rail.map((value) => parseOneOf(railSchema, value, "rail", RAILS));
  }

  if (severity !== undefined) {
    filters.severity = severity.map((value) =>
      parseOneOf(auditSeveritySchema, value, "severity", AUDIT_SEVERITIES),
    );
  }

  if (status !== undefined) {
    filters.status = status.map((value) =>
      parseOneOf(auditStatusSchema, value, "status", AUDIT_STATUSES),
    );
  }

  if (tsFrom !== undefined) {
    filters.tsFrom = tsFrom;
  }

  if (tsTo !== undefined) {
    filters.tsTo = tsTo;
  }

  return auditFiltersSchema.parse(filters);
}

export function auditCursorForEntry(entry: Pick<AuditEntry, "id">, sort: AuditSort): string {
  return encodeAuditCursor({
    dir: sort.dir,
    field: sort.field,
    id: entry.id,
  });
}

export function encodeAuditCursor(cursor: AuditCursor): string {
  return encodeURIComponent(JSON.stringify(cursor));
}

export function decodeAuditCursor(cursor: string): AuditCursor {
  try {
    return auditCursorSchema.parse(JSON.parse(decodeURIComponent(cursor)));
  } catch {
    throw new Error("Invalid audit cursor");
  }
}

function appendList(
  params: AuditQueryStringParams,
  key: string,
  items: readonly string[] | undefined,
) {
  if (items !== undefined && items.length > 0) {
    params.set(key, items.join(","));
  }
}

function enumList<const T extends string>(
  input: AuditSearchListInput,
  schema: StringSchema<T>,
): T[] {
  return toSearchList(input)
    .flatMap((value) => value.split(","))
    .map((value) => value.trim())
    .filter((value): value is T => schema.safeParse(value).success);
}

function parseSearchNumber(input: AuditSearchNumberInput) {
  if (input === undefined) {
    return undefined;
  }

  const parsed = Number(input);
  return safeIntegerSchema.safeParse(parsed).success ? parsed : undefined;
}

function toSearchList(input: AuditSearchListInput) {
  if (input === undefined) {
    return [];
  }

  return Array.isArray(input) ? input : [input];
}

function parseLimit(value: QueryParam): number {
  if (value === undefined) {
    return DEFAULT_AUDIT_LIMIT;
  }

  const parsed = Number(single(value, "limit"));
  const result = limitSchema.safeParse(parsed);

  if (!result.success) {
    throw new Error(`limit must be between 1 and ${MAX_AUDIT_LIMIT}`);
  }

  return result.data;
}

function parseOneOf<const T extends string>(
  schema: StringSchema<T>,
  value: string,
  name: string,
  allowed: readonly T[],
): T {
  const result = schema.safeParse(value);

  if (!result.success) {
    throw new Error(`${name} must be one of: ${allowed.join(", ")}`);
  }

  return result.data;
}

function list(value: QueryParam, name: string): string[] | undefined {
  const rawValues = queryParamValues(value);

  if (rawValues.length === 0) {
    return undefined;
  }

  const values = rawValues.flatMap((item) => item.split(","));
  const trimmed = values.map((item) => item.trim()).filter((item) => item.length > 0);

  if (trimmed.length === 0) {
    throw new Error(`${name} must not be empty`);
  }

  return trimmed;
}

function single(value: QueryParam, name: string): string | undefined {
  const values = queryParamValues(value);

  if (values.length === 0) {
    return undefined;
  }

  if (values.length !== 1) {
    throw new Error(`${name} must have a single value`);
  }

  const trimmed = values[0].trim();

  if (trimmed.length === 0) {
    throw new Error(`${name} must not be empty`);
  }

  return trimmed;
}

function queryParamValues(value: QueryParam) {
  if (value === undefined) {
    return [];
  }

  return Array.isArray(value) ? value : [value];
}
