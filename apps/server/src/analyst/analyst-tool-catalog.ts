import {
  auditSampleInputSchema,
  breakdownInputSchema,
  customerRiskInputSchema,
  datasetOverviewInputSchema,
  filtersInputSchema,
  getAuditSample,
  getBreakdown,
  getCustomerRiskRollup,
  getDatasetOverview,
  getLiquidityRollup,
  getRailHealthRollup,
  getReconciliationRollup,
  getTimeSeries,
  timeSeriesInputSchema,
} from "@bankops/analyst-model";
import { getAuditLogEntries } from "@bankops/audit-log-model";
import { type AuditEntry } from "@bankops/contracts";
import type { z } from "zod";

export type AnalystToolCatalogItem = {
  description: string;
  inputSchema: z.ZodType;
  name: string;
  prepare: (input: unknown) => {
    inputSummary: string;
    run: () => {
      result: unknown;
      resultSummary: string;
    };
  };
};

export function createAnalystToolCatalog(
  entries: () => readonly AuditEntry[] = getAuditLogEntries,
): AnalystToolCatalogItem[] {
  return [
    analystTool({
      name: "get_dataset_overview",
      description: "Return compact counts, time range, customer count, and amount totals.",
      inputSchema: datasetOverviewInputSchema,
      inputSummary: ({ filters }) =>
        hasAnalystFilters(filters) ? "filtered audit-log overview" : "full audit-log overview",
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
      inputSummary: (input) => `${input.sort} sample, limit ${input.limit}`,
      run: (input) => getAuditSample(entries(), input),
      resultSummary: (result) =>
        `${result.rows.length} capped sample rows${result.truncation.truncated ? " with truncation" : ""}`,
    }),
    analystTool({
      name: "get_reconciliation_rollup",
      description: "Return reconciliation matched/unmatched and exception rollups.",
      inputSchema: filtersInputSchema,
      inputSummary: ({ filters }) =>
        hasAnalystFilters(filters)
          ? "filtered reconciliation rollup"
          : "full reconciliation rollup",
      run: ({ filters }) => getReconciliationRollup(entries(), filters),
      resultSummary: (result) =>
        `${result.runs.toLocaleString()} reconciliation events, ${result.unmatchedCount.toLocaleString()} unmatched`,
    }),
    analystTool({
      name: "get_liquidity_rollup",
      description: "Return liquidity reserve rollups with JSON-safe amount strings.",
      inputSchema: filtersInputSchema,
      inputSummary: ({ filters }) =>
        hasAnalystFilters(filters) ? "filtered liquidity rollup" : "full liquidity rollup",
      run: ({ filters }) => getLiquidityRollup(entries(), filters),
      resultSummary: (result) =>
        `${result.events.toLocaleString()} liquidity events, latest reserve ${result.latestReserveAfterMinor ?? "unknown"}`,
    }),
    analystTool({
      name: "get_rail_health_rollup",
      description: "Return rail latency, error-rate, pending-depth, and rail counts.",
      inputSchema: filtersInputSchema,
      inputSummary: ({ filters }) =>
        hasAnalystFilters(filters) ? "filtered rail-health rollup" : "full rail-health rollup",
      run: ({ filters }) => getRailHealthRollup(entries(), filters),
      resultSummary: (result) =>
        `${result.events.toLocaleString()} rail-health events across ${Object.keys(result.byRail).length} rails`,
    }),
    analystTool({
      name: "get_customer_risk_rollup",
      description:
        "Return capped customer risk rollups for prioritization views. Rows include risk and riskScore numeric aliases plus failedCount, exceptionPressure, riskReviewVolume, and customer attributes. Default limit is 20; request 40-80 for broad customer evidence.",
      inputSchema: customerRiskInputSchema,
      inputSummary: (input) => `top customer risk rows, limit ${input.limit}`,
      run: (input) => getCustomerRiskRollup(entries(), input),
      resultSummary: (result) =>
        `${result.rows.length} customers${result.truncation.truncated ? " with truncation" : ""}`,
    }),
  ];
}

function hasAnalystFilters(filters: object) {
  return Object.keys(filters).length > 0;
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
    name,
    prepare: (input) => {
      const parsedInput = parseInput(input);

      return {
        inputSummary: inputSummary(parsedInput),
        run: () => {
          const result = run(parsedInput);

          return {
            result,
            resultSummary: resultSummary(result, parsedInput),
          };
        },
      };
    },
  };
}
