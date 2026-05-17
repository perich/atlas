import {
  parseAuditQueryStateSearch,
  type AuditEntry,
  type AuditFilters,
  type AuditQueryState,
  type AuditSort,
  type Rail,
} from "@bankops/contracts";

export {
  auditSearchToQueryState,
  queryStateToAuditSearch,
  serializeAuditQueryState,
  validateAuditSearch,
  type AuditQueryState,
} from "@bankops/contracts";

export function readAuditQueryState(search = window.location.search) {
  return parseAuditQueryStateSearch(search);
}

export function auditQueryStateWithTimeBounds(
  state: AuditQueryState,
  bounds: Pick<AuditFilters, "tsFrom" | "tsTo">,
): AuditQueryState {
  const filters = { ...state.filters };

  delete filters.tsFrom;
  delete filters.tsTo;

  if (bounds.tsFrom !== undefined) {
    filters.tsFrom = bounds.tsFrom;
  }

  if (bounds.tsTo !== undefined) {
    filters.tsTo = bounds.tsTo;
  }

  return { filters, sort: state.sort };
}

export function auditQueryStateWithSeverityFilter(
  state: AuditQueryState,
  severity: AuditEntry["severity"] | undefined,
): AuditQueryState {
  const filters: AuditFilters = { ...state.filters };

  if (severity === undefined) {
    delete filters.severity;
  } else {
    filters.severity = [severity];
  }

  return { filters, sort: state.sort };
}

export function auditQueryStateWithRailFilter(
  state: AuditQueryState,
  rail: Rail | undefined,
): AuditQueryState {
  const filters: AuditFilters = { ...state.filters };

  if (rail === undefined) {
    delete filters.rail;
  } else {
    filters.rail = [rail];
  }

  return { filters, sort: state.sort };
}

export function auditQueryStateWithStatusFilter(
  state: AuditQueryState,
  status: AuditEntry["status"] | undefined,
): AuditQueryState {
  const filters: AuditFilters = { ...state.filters };

  if (status === undefined) {
    delete filters.status;
  } else {
    filters.status = [status];
  }

  return { filters, sort: state.sort };
}

export function auditQueryStateWithToggledSort(
  state: AuditQueryState,
  field: AuditSort["field"],
): AuditQueryState {
  return {
    filters: state.filters,
    sort: {
      field,
      dir: state.sort.field === field && state.sort.dir === "desc" ? "asc" : "desc",
    },
  };
}
