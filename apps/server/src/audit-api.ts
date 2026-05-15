import {
  getAuditFacets,
  getAuditLogEntries,
  queryAuditEntries,
  type AuditFilters,
} from "@bankops/audit-log-model";
import type { AuditQuery, AuditSort } from "@bankops/contracts";
import {
  AUDIT_SEVERITIES,
  AUDIT_SORT_DIRECTIONS,
  AUDIT_SORT_FIELDS,
  AUDIT_STATUSES,
  RAILS,
  auditSeveritySchema,
  auditSortDirectionSchema,
  auditSortFieldSchema,
  auditStatusSchema,
  railSchema,
} from "@bankops/contracts";
import type { FastifyInstance, FastifyReply } from "fastify";
import { z } from "zod";

type AuditQueryParams = Record<string, string | string[] | undefined>;
type QueryParam = string | string[] | undefined;

const DEFAULT_AUDIT_SORT = { field: "ts", dir: "desc" } satisfies AuditSort;
const DEFAULT_AUDIT_LIMIT = 100;
const MAX_AUDIT_LIMIT = 500;
const queryParamValuesSchema = z.union([
  z.array(z.string()),
  z.string().transform((value) => [value]),
  z.undefined().transform(() => [] as string[]),
]);
const safeIntegerSchema = z.int();
const limitSchema = z.int().min(1).max(MAX_AUDIT_LIMIT);
const offsetSchema = z.int().nonnegative();

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
  const rawOffset = single(params.offset, "offset");
  const offset = rawOffset === undefined ? undefined : Number(rawOffset);
  const sortField = single(params.sortField, "sortField");
  const sortDir = single(params.sortDir, "sortDir");

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

  const parsedSort = {
    field: parseOneOf(auditSortFieldSchema, field, "sortField", AUDIT_SORT_FIELDS),
    dir: parseOneOf(auditSortDirectionSchema, dir, "sortDir", AUDIT_SORT_DIRECTIONS),
  };

  const query: AuditQuery = { filters: parseAuditFilters(params), limit, sort: parsedSort };

  if (after !== undefined) {
    query.after = after;
  }

  if (before !== undefined) {
    query.before = before;
  }

  if (offset !== undefined) {
    query.offset = offset;
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

  return filters;
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
  schema: z.ZodType<T>,
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
  const rawValues = queryParamValuesSchema.parse(value);

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
  const values = queryParamValuesSchema.parse(value);

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
