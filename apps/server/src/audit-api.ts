import { getAuditFacets, getAuditLogEntries, queryAuditEntries } from "@bankops/audit-log-model";
import {
  parseAuditFilterParams,
  parseAuditQueryParams,
  type AuditQueryParams,
} from "@bankops/contracts";
import type { FastifyInstance, FastifyReply } from "fastify";

export function registerAuditApi(app: FastifyInstance) {
  app.get<{ Querystring: AuditQueryParams }>("/api/audit", async (request, reply) => {
    try {
      return sendJson(
        reply,
        queryAuditEntries(getAuditLogEntries(), parseAuditQueryParams(request.query)),
      );
    } catch (error) {
      return reply.code(400).send(errorResponse(error));
    }
  });

  app.get<{ Querystring: AuditQueryParams }>("/api/audit/facets", async (request, reply) => {
    try {
      return sendJson(
        reply,
        getAuditFacets(getAuditLogEntries(), parseAuditFilterParams(request.query)),
      );
    } catch (error) {
      return reply.code(400).send(errorResponse(error));
    }
  });
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
