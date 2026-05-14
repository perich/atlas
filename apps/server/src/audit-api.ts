import {
  getAuditFacets,
  getAuditLogEntries,
  queryAuditEntries,
  type AuditFilters,
} from "@bankops/audit-log-model";
import type { AuditQuery } from "@bankops/contracts";
import { RAILS } from "@bankops/contracts";
import type { FastifyInstance, FastifyReply } from "fastify";

type AuditQueryParams = Record<string, string | string[] | undefined>;
type QueryParam = string | string[] | undefined;

const DEFAULT_AUDIT_LIMIT = 100;
const MAX_AUDIT_LIMIT = 500;
const AUDIT_SEVERITIES = ["info", "notice", "warning", "critical"] as const;
const AUDIT_STATUSES = ["accepted", "pending", "posted", "settled", "failed", "reversed"] as const;
const AUDIT_SORT_FIELDS = ["ts", "severity", "rail", "status", "kind"] as const;
const AUDIT_SORT_DIRECTIONS = ["asc", "desc"] as const;

export function registerAuditApi(app: FastifyInstance) {
  app.get<{ Querystring: AuditQueryParams }>("/api/audit", async (request, reply) => {
    try {
      return sendJson(
        reply,
        queryAuditEntries(getAuditLogEntries(), parseAuditQuery(request.query)),
      );
    } catch (error) {
      return reply.code(400).send(errorResponse(error));
    }
  });

  app.get<{ Querystring: AuditQueryParams }>("/api/audit/facets", async (request, reply) => {
    try {
      return sendJson(
        reply,
        getAuditFacets(getAuditLogEntries(), parseAuditFilters(request.query)),
      );
    } catch (error) {
      return reply.code(400).send(errorResponse(error));
    }
  });
}

function parseAuditQuery(params: AuditQueryParams): AuditQuery {
  const limit = parseLimit(params.limit);
  const after = single(params.after, "after");
  const before = single(params.before, "before");
  const sortField = single(params.sortField, "sortField");
  const sortDir = single(params.sortDir, "sortDir");

  if (after !== undefined && before !== undefined) {
    throw new Error("Use either after or before, not both");
  }

  const filters = parseAuditFilters(params);
  const query: AuditQuery = { limit };
  query.filters = filters;

  if (sortField !== undefined || sortDir !== undefined) {
    const field = sortField ?? "ts";
    const dir = sortDir ?? "desc";

    assertOneOf(field, "sortField", AUDIT_SORT_FIELDS);
    assertOneOf(dir, "sortDir", AUDIT_SORT_DIRECTIONS);

    query.sort = { field, dir };
  } else {
    query.sort = { field: "ts", dir: "desc" };
  }

  if (after !== undefined) {
    query.after = after;
  }

  if (before !== undefined) {
    query.before = before;
  }

  return query;
}

function parseAuditFilters(params: AuditQueryParams): AuditFilters {
  const rawTsFrom = single(params.tsFrom, "tsFrom");
  const rawTsTo = single(params.tsTo, "tsTo");
  const tsFrom = rawTsFrom === undefined ? undefined : Number(rawTsFrom);
  const tsTo = rawTsTo === undefined ? undefined : Number(rawTsTo);
  const rail = list(params.rail, "rail");
  const severity = list(params.severity, "severity");
  const status = list(params.status, "status");

  if (tsFrom !== undefined && !Number.isSafeInteger(tsFrom)) {
    throw new Error("tsFrom must be an integer");
  }

  if (tsTo !== undefined && !Number.isSafeInteger(tsTo)) {
    throw new Error("tsTo must be an integer");
  }

  if (tsFrom !== undefined && tsTo !== undefined && tsFrom > tsTo) {
    throw new Error("tsFrom must be less than or equal to tsTo");
  }

  const filters: AuditFilters = {};

  if (rail !== undefined) {
    filters.rail = rail.map((value) => {
      assertOneOf(value, "rail", RAILS);
      return value;
    });
  }

  if (severity !== undefined) {
    filters.severity = severity.map((value) => {
      assertOneOf(value, "severity", AUDIT_SEVERITIES);
      return value;
    });
  }

  if (status !== undefined) {
    filters.status = status.map((value) => {
      assertOneOf(value, "status", AUDIT_STATUSES);
      return value;
    });
  }

  if (tsFrom !== undefined) {
    filters.tsFrom = tsFrom;
  }

  if (tsTo !== undefined) {
    filters.tsTo = tsTo;
  }

  return filters;
}

function parseLimit(value: QueryParam): number {
  if (value === undefined) {
    return DEFAULT_AUDIT_LIMIT;
  }

  const parsed = Number(single(value, "limit"));

  if (!Number.isSafeInteger(parsed) || parsed < 1 || parsed > MAX_AUDIT_LIMIT) {
    throw new Error(`limit must be between 1 and ${MAX_AUDIT_LIMIT}`);
  }

  return parsed;
}

function assertOneOf<const T extends string>(
  value: string,
  name: string,
  allowed: readonly T[],
): asserts value is T {
  if (!allowed.some((item) => item === value)) {
    throw new Error(`${name} must be one of: ${allowed.join(", ")}`);
  }
}

function list(value: QueryParam, name: string): string[] | undefined {
  if (value === undefined) {
    return undefined;
  }

  const rawValues = Array.isArray(value) ? value : [value];
  const values = rawValues.flatMap((item) => item.split(","));
  const trimmed = values.map((item) => item.trim()).filter((item) => item.length > 0);

  if (trimmed.length === 0) {
    throw new Error(`${name} must not be empty`);
  }

  return trimmed;
}

function single(value: QueryParam, name: string): string | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (Array.isArray(value)) {
    if (value.length !== 1) {
      throw new Error(`${name} must have a single value`);
    }

    return single(value[0], name);
  }

  const trimmed = value.trim();

  if (trimmed.length === 0) {
    throw new Error(`${name} must not be empty`);
  }

  return trimmed;
}

function sendJson(reply: FastifyReply, value: unknown) {
  return reply.type("application/json").send(JSON.stringify(value, jsonReplacer));
}

function jsonReplacer(_key: string, value: unknown) {
  return typeof value === "bigint" ? value.toString() : value;
}

function errorResponse(error: unknown) {
  return {
    error: "bad_request",
    message: error instanceof Error ? error.message : "Invalid audit query",
  };
}
