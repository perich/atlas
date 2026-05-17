import { getAuditFacets, getAuditLogEntries, queryAuditEntries } from "@bankops/audit-log-model";
import {
  parseAuditFilterParams,
  parseAuditQueryParams,
  toJsonAuditFacets,
  toJsonAuditPage,
  type AuditQueryParams,
} from "@bankops/contracts";
import type { FastifyInstance } from "fastify";

export function registerAuditApi(app: FastifyInstance) {
  app.get<{ Querystring: AuditQueryParams }>("/api/audit", async (request, reply) => {
    try {
      return reply.send(
        toJsonAuditPage(
          queryAuditEntries(getAuditLogEntries(), parseAuditQueryParams(request.query)),
        ),
      );
    } catch (error) {
      return reply.code(400).send(errorResponse(error));
    }
  });

  app.get<{ Querystring: AuditQueryParams }>("/api/audit/facets", async (request, reply) => {
    try {
      return reply.send(
        toJsonAuditFacets(
          getAuditFacets(getAuditLogEntries(), parseAuditFilterParams(request.query)),
        ),
      );
    } catch (error) {
      return reply.code(400).send(errorResponse(error));
    }
  });
}

function errorResponse(error: unknown) {
  return {
    error: "bad_request",
    message: error instanceof Error ? error.message : "Invalid audit query",
  };
}
