import {
  getAuditSample,
  getBreakdown,
  getCustomerRiskRollup,
  getDatasetOverview,
  getLiquidityRollup,
  getRailHealthRollup,
  getReconciliationRollup,
  getTimeSeries,
} from "@bankops/analyst-model";
import { getAuditLogEntries } from "@bankops/audit-log-model";
import { toolDefinition } from "@tanstack/ai";
import { z } from "zod";

const filtersSchema = z.object({
  tsFrom: z.number().finite().optional(),
  tsTo: z.number().finite().optional(),
  rail: z
    .array(z.enum(["ach", "wire", "instant", "card", "internal_ledger", "stablecoin"]))
    .optional(),
  severity: z.array(z.enum(["info", "notice", "warning", "critical"])).optional(),
  status: z
    .array(z.enum(["accepted", "pending", "posted", "settled", "failed", "reversed"]))
    .optional(),
  kind: z
    .array(
      z.enum([
        "payment",
        "journal",
        "settlement",
        "reconciliation",
        "risk",
        "liquidity",
        "rail_health",
        "cutoff",
        "configuration",
        "operator_action",
      ]),
    )
    .optional(),
  customerId: z.array(z.string()).optional(),
});
const limitSchema = z.int().min(1).max(80).optional();
const entries = () => getAuditLogEntries();

export function createAnalystDataTools() {
  return [
    toolDefinition({
      name: "get_dataset_overview",
      description: "Return compact counts, time range, customer count, and amount totals.",
      inputSchema: z.object({ filters: filtersSchema.optional() }),
    }).server(({ filters }) => getDatasetOverview(entries(), filters)),
    toolDefinition({
      name: "get_time_series",
      description: "Return a compact time series for a supported metric and grain.",
      inputSchema: z.object({
        filters: filtersSchema.optional(),
        grain: z.enum(["hour", "day"]),
        metric: z.enum([
          "count",
          "amountMinor",
          "failedCount",
          "exceptionPressure",
          "pendingDepth",
        ]),
      }),
    }).server((input) => getTimeSeries(entries(), input)),
    toolDefinition({
      name: "get_breakdown",
      description: "Return a capped breakdown with truncation metadata.",
      inputSchema: z.object({
        dimension: z.enum([
          "rail",
          "severity",
          "status",
          "kind",
          "customer.segment",
          "customer.region",
          "customer.riskProfile",
          "customer.monthlyVolumeBand",
        ]),
        filters: filtersSchema.optional(),
        limit: limitSchema,
        metric: z.enum(["count", "amountMinor", "failedCount", "exceptionPressure"]),
      }),
    }).server((input) => getBreakdown(entries(), input)),
    toolDefinition({
      name: "get_audit_sample",
      description: "Return capped JSON-safe audit samples for investigation tables.",
      inputSchema: z.object({
        filters: filtersSchema.optional(),
        limit: limitSchema,
        sort: z.enum(["newest", "oldest", "amountDesc", "severityDesc"]).optional(),
      }),
    }).server((input) => getAuditSample(entries(), input)),
    toolDefinition({
      name: "get_reconciliation_rollup",
      description: "Return reconciliation matched/unmatched and exception rollups.",
      inputSchema: z.object({ filters: filtersSchema.optional() }),
    }).server(({ filters }) => getReconciliationRollup(entries(), filters)),
    toolDefinition({
      name: "get_liquidity_rollup",
      description: "Return liquidity reserve rollups with JSON-safe amount strings.",
      inputSchema: z.object({ filters: filtersSchema.optional() }),
    }).server(({ filters }) => getLiquidityRollup(entries(), filters)),
    toolDefinition({
      name: "get_rail_health_rollup",
      description: "Return rail latency, error-rate, pending-depth, and rail counts.",
      inputSchema: z.object({ filters: filtersSchema.optional() }),
    }).server(({ filters }) => getRailHealthRollup(entries(), filters)),
    toolDefinition({
      name: "get_customer_risk_rollup",
      description: "Return capped customer risk rollups for prioritization views.",
      inputSchema: z.object({ filters: filtersSchema.optional(), limit: limitSchema }),
    }).server((input) => getCustomerRiskRollup(entries(), input)),
  ];
}
