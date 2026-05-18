import {
  DEFAULT_ROLLUP_LIMIT,
  getAuditSample,
  getBreakdown,
  getCustomerRiskRollup,
  getDatasetOverview,
  getLiquidityRollup,
  getRailHealthRollup,
  getReconciliationRollup,
  getTimeSeries,
  MAX_ROLLUP_LIMIT,
} from "@bankops/analyst-model";
import { getAuditLogEntries } from "@bankops/audit-log-model";
import type { AuditEntry } from "@bankops/contracts";
import { z } from "zod";

type AuditEntriesProvider = () => readonly AuditEntry[];

export type AnalystToolCatalogItem = {
  description: string;
  inputSchema: z.ZodType;
  inputSummary: (input: unknown) => string;
  name: string;
  run: (input: unknown) => { result: unknown; resultSummary: string };
};

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
const limitSchema = z.int().min(1).max(MAX_ROLLUP_LIMIT).optional();
const overviewInputSchema = z.object({ filters: filtersSchema.optional() });
const timeSeriesInputSchema = z.object({
  filters: filtersSchema.optional(),
  grain: z.enum(["hour", "day"]),
  metric: z.enum(["count", "amountMinor", "failedCount", "exceptionPressure", "pendingDepth"]),
});
const breakdownInputSchema = z.object({
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
});
const auditSampleInputSchema = z.object({
  filters: filtersSchema.optional(),
  limit: limitSchema,
  sort: z.enum(["newest", "oldest", "amountDesc", "severityDesc"]).optional(),
});
const filtersInputSchema = z.object({ filters: filtersSchema.optional() });
const customerRiskInputSchema = z.object({ filters: filtersSchema.optional(), limit: limitSchema });

export function createAnalystToolCatalog(
  entries: AuditEntriesProvider = getAuditLogEntries,
): AnalystToolCatalogItem[] {
  return [
    analystTool({
      name: "get_dataset_overview",
      description: "Return compact counts, time range, customer count, and amount totals.",
      inputSchema: overviewInputSchema,
      inputSummary: ({ filters }) =>
        filters ? "filtered audit-log overview" : "full audit-log overview",
      run: ({ filters }) => getDatasetOverview(entries(), filters),
      resultSummary: (result) =>
        `${result.totalEntries.toLocaleString()} entries, ${result.distinctCustomers.toLocaleString()} customers, ${Object.keys(result.byRail).length} rails`,
    }),
    analystTool({
      name: "get_time_series",
      description: "Return a compact time series for a supported metric and grain.",
      inputSchema: timeSeriesInputSchema,
      inputSummary: (input) => `${input.metric} by ${input.grain}`,
      run: (input) => getTimeSeries(entries(), input),
      resultSummary: (result, input) => `${result.length} points for ${input.metric}`,
    }),
    analystTool({
      name: "get_breakdown",
      description: "Return a capped breakdown with truncation metadata.",
      inputSchema: breakdownInputSchema,
      inputSummary: (input) => `${input.metric} by ${input.dimension}`,
      run: (input) => getBreakdown(entries(), input),
      resultSummary: (result) =>
        `${result.rows.length} rows${result.truncation.truncated ? " with truncation" : ""}`,
    }),
    analystTool({
      name: "get_audit_sample",
      description:
        "Return capped audit samples for investigation tables. Rows contain primitive table-ready fields; detail and detailSummary are safe string summaries, not raw detail objects. Default limit is 20; request 40-80 when you need evidence rows for a report table.",
      inputSchema: auditSampleInputSchema,
      inputSummary: (input) =>
        `${input.sort ?? "newest"} sample, limit ${input.limit ?? DEFAULT_ROLLUP_LIMIT}`,
      run: (input) => getAuditSample(entries(), input),
      resultSummary: (result) =>
        `${result.rows.length} capped sample rows${result.truncation.truncated ? " with truncation" : ""}`,
    }),
    analystTool({
      name: "get_reconciliation_rollup",
      description: "Return reconciliation matched/unmatched and exception rollups.",
      inputSchema: filtersInputSchema,
      inputSummary: ({ filters }) =>
        filters ? "filtered reconciliation rollup" : "full reconciliation rollup",
      run: ({ filters }) => getReconciliationRollup(entries(), filters),
      resultSummary: (result) =>
        `${result.runs.toLocaleString()} reconciliation events, ${result.unmatchedCount.toLocaleString()} unmatched`,
    }),
    analystTool({
      name: "get_liquidity_rollup",
      description: "Return liquidity reserve rollups with JSON-safe amount strings.",
      inputSchema: filtersInputSchema,
      inputSummary: ({ filters }) =>
        filters ? "filtered liquidity rollup" : "full liquidity rollup",
      run: ({ filters }) => getLiquidityRollup(entries(), filters),
      resultSummary: (result) =>
        `${result.events.toLocaleString()} liquidity events, latest reserve ${result.latestReserveAfterMinor ?? "unknown"}`,
    }),
    analystTool({
      name: "get_rail_health_rollup",
      description: "Return rail latency, error-rate, pending-depth, and rail counts.",
      inputSchema: filtersInputSchema,
      inputSummary: ({ filters }) =>
        filters ? "filtered rail-health rollup" : "full rail-health rollup",
      run: ({ filters }) => getRailHealthRollup(entries(), filters),
      resultSummary: (result) =>
        `${result.events.toLocaleString()} rail-health events across ${Object.keys(result.byRail).length} rails`,
    }),
    analystTool({
      name: "get_customer_risk_rollup",
      description:
        "Return capped customer risk rollups for prioritization views. Rows include risk and riskScore numeric aliases plus failedCount, exceptionPressure, riskReviewVolume, and customer attributes. Default limit is 20; request 40-80 for broad customer evidence.",
      inputSchema: customerRiskInputSchema,
      inputSummary: (input) =>
        `top customer risk rows, limit ${input.limit ?? DEFAULT_ROLLUP_LIMIT}`,
      run: (input) => getCustomerRiskRollup(entries(), input),
      resultSummary: (result) =>
        `${result.rows.length} customers${result.truncation.truncated ? " with truncation" : ""}`,
    }),
  ];
}

function analystTool<TInput, TResult>({
  description,
  inputSchema,
  inputSummary,
  name,
  run,
  resultSummary,
}: {
  description: string;
  inputSchema: z.ZodType<TInput>;
  inputSummary: (input: TInput) => string;
  name: string;
  run: (input: TInput) => TResult;
  resultSummary: (result: TResult, input: TInput) => string;
}): AnalystToolCatalogItem {
  const parseInput = (input: unknown) => inputSchema.parse(input);

  return {
    description,
    inputSchema,
    inputSummary: (input) => inputSummary(parseInput(input)),
    name,
    run: (input) => {
      const parsedInput = parseInput(input);
      const result = run(parsedInput);

      return {
        result,
        resultSummary: resultSummary(result, parsedInput),
      };
    },
  };
}
