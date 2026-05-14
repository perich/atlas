import type { AuditQuery, AuditSort } from "@bankops/contracts";
import { RAILS } from "@bankops/contracts";

type AuditSearchValue = string | string[] | number | undefined;
type AuditSearchInput = Record<string, AuditSearchValue>;

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

const SEVERITIES = ["info", "notice", "warning", "critical"] as const;
const STATUSES = ["accepted", "pending", "posted", "settled", "failed", "reversed"] as const;
const SORT_FIELDS = ["ts", "severity", "rail", "status", "kind"] as const;
const SORT_DIRS = ["asc", "desc"] as const;

export function validateAuditSearch(search: AuditSearchInput): AuditSearch {
  const tsFrom = parseNumber(search.tsFrom);
  const tsTo = parseNumber(search.tsTo);
  const severity = enumList(search.severity, SEVERITIES);
  const rail = enumList(search.rail, RAILS);
  const status = enumList(search.status, STATUSES);
  const sortField = enumList(search.sortField, SORT_FIELDS)[0];
  const sortDir = enumList(search.sortDir, SORT_DIRS)[0];

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
      ...(search.severity === undefined ? {} : { severity: enumList(search.severity, SEVERITIES) }),
      ...(search.rail === undefined ? {} : { rail: enumList(search.rail, RAILS) }),
      ...(search.status === undefined ? {} : { status: enumList(search.status, STATUSES) }),
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
  const severity = enumList(params.getAll("severity"), SEVERITIES);
  const rail = enumList(params.getAll("rail"), RAILS);
  const status = enumList(params.getAll("status"), STATUSES);
  const sortField = enumList(params.getAll("sortField"), SORT_FIELDS)[0];
  const sortDir = enumList(params.getAll("sortDir"), SORT_DIRS)[0];
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
    const parsed = Number(tsFrom);

    if (Number.isSafeInteger(parsed)) {
      filters.tsFrom = parsed;
    }
  }

  if (tsTo !== null) {
    const parsed = Number(tsTo);

    if (Number.isSafeInteger(parsed)) {
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
  allowed: readonly T[],
): T[] {
  return toSearchStrings(input)
    .flatMap((value) => value.split(","))
    .map((value) => value.trim())
    .filter((value): value is T => allowed.some((allowedValue) => allowedValue === value));
}

function parseNumber(input: AuditSearchValue) {
  const value = toSearchStrings(input)[0];

  if (value === undefined) {
    return undefined;
  }

  const parsed = Number(value);
  return Number.isSafeInteger(parsed) ? parsed : undefined;
}

function toSearchStrings(input: AuditSearchValue | string[]) {
  if (Array.isArray(input)) {
    return input.map(String);
  }

  if (input === undefined) {
    return [];
  }

  return [String(input)];
}
