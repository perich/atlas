import type { AuditQuery, AuditSort } from "@bankops/contracts";
import { RAILS } from "@bankops/contracts";

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

export function readAuditQueryState(search = window.location.search): AuditQueryState {
  const params = new URLSearchParams(search);
  const filters: AuditQueryState["filters"] = {};
  const severity = enumList(params, "severity", SEVERITIES);
  const rail = enumList(params, "rail", RAILS);
  const status = enumList(params, "status", STATUSES);
  const sortField = enumList(params, "sortField", SORT_FIELDS)[0];
  const sortDir = enumList(params, "sortDir", SORT_DIRS)[0];
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

export function writeAuditQueryState(state: AuditQueryState) {
  const search = serializeAuditQueryState(state);
  const nextUrl = `${window.location.pathname}${search}${window.location.hash}`;

  window.history.replaceState(null, "", nextUrl);
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
  params: URLSearchParams,
  key: string,
  allowed: readonly T[],
): T[] {
  return params
    .getAll(key)
    .flatMap((value) => value.split(","))
    .map((value) => value.trim())
    .filter((value): value is T => allowed.some((allowedValue) => allowedValue === value));
}
