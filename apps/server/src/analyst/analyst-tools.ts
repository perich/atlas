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
import type { AnalystRunEvent } from "@bankops/contracts";
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
type EmitAnalystEvent = (event: AnalystRunEvent) => void;

export function createAnalystDataTools(emit?: EmitAnalystEvent) {
  return [
    toolDefinition({
      name: "get_dataset_overview",
      description: "Return compact counts, time range, customer count, and amount totals.",
      inputSchema: z.object({ filters: filtersSchema.optional() }),
    }).server(({ filters }) =>
      runAnalystTool({
        emit,
        inputSummary: filters ? "filtered audit-log overview" : "full audit-log overview",
        name: "get_dataset_overview",
        run: () => getDatasetOverview(entries(), filters),
        summarize: (result) =>
          `${result.totalEntries.toLocaleString()} entries, ${result.distinctCustomers.toLocaleString()} customers, ${Object.keys(result.byRail).length} rails`,
      }),
    ),
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
    }).server((input) =>
      runAnalystTool({
        emit,
        inputSummary: `${input.metric} by ${input.grain}`,
        name: "get_time_series",
        run: () => getTimeSeries(entries(), input),
        summarize: (result) => `${result.length} points for ${input.metric}`,
      }),
    ),
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
    }).server((input) =>
      runAnalystTool({
        emit,
        inputSummary: `${input.metric} by ${input.dimension}`,
        name: "get_breakdown",
        run: () => getBreakdown(entries(), input),
        summarize: (result) =>
          `${result.rows.length} rows${result.truncation.truncated ? " with truncation" : ""}`,
      }),
    ),
    toolDefinition({
      name: "get_audit_sample",
      description: "Return capped JSON-safe audit samples for investigation tables.",
      inputSchema: z.object({
        filters: filtersSchema.optional(),
        limit: limitSchema,
        sort: z.enum(["newest", "oldest", "amountDesc", "severityDesc"]).optional(),
      }),
    }).server((input) =>
      runAnalystTool({
        emit,
        inputSummary: `${input.sort ?? "newest"} sample, limit ${input.limit ?? 80}`,
        name: "get_audit_sample",
        run: () => getAuditSample(entries(), input),
        summarize: (result) =>
          `${result.rows.length} capped sample rows${result.truncation.truncated ? " with truncation" : ""}`,
      }),
    ),
    toolDefinition({
      name: "get_reconciliation_rollup",
      description: "Return reconciliation matched/unmatched and exception rollups.",
      inputSchema: z.object({ filters: filtersSchema.optional() }),
    }).server(({ filters }) =>
      runAnalystTool({
        emit,
        inputSummary: filters ? "filtered reconciliation rollup" : "full reconciliation rollup",
        name: "get_reconciliation_rollup",
        run: () => getReconciliationRollup(entries(), filters),
        summarize: (result) =>
          `${result.runs.toLocaleString()} reconciliation events, ${result.unmatchedCount.toLocaleString()} unmatched`,
      }),
    ),
    toolDefinition({
      name: "get_liquidity_rollup",
      description: "Return liquidity reserve rollups with JSON-safe amount strings.",
      inputSchema: z.object({ filters: filtersSchema.optional() }),
    }).server(({ filters }) =>
      runAnalystTool({
        emit,
        inputSummary: filters ? "filtered liquidity rollup" : "full liquidity rollup",
        name: "get_liquidity_rollup",
        run: () => getLiquidityRollup(entries(), filters),
        summarize: (result) =>
          `${result.events.toLocaleString()} liquidity events, latest reserve ${result.latestReserveAfterMinor ?? "unknown"}`,
      }),
    ),
    toolDefinition({
      name: "get_rail_health_rollup",
      description: "Return rail latency, error-rate, pending-depth, and rail counts.",
      inputSchema: z.object({ filters: filtersSchema.optional() }),
    }).server(({ filters }) =>
      runAnalystTool({
        emit,
        inputSummary: filters ? "filtered rail-health rollup" : "full rail-health rollup",
        name: "get_rail_health_rollup",
        run: () => getRailHealthRollup(entries(), filters),
        summarize: (result) =>
          `${result.events.toLocaleString()} rail-health events across ${Object.keys(result.byRail).length} rails`,
      }),
    ),
    toolDefinition({
      name: "get_customer_risk_rollup",
      description: "Return capped customer risk rollups for prioritization views.",
      inputSchema: z.object({ filters: filtersSchema.optional(), limit: limitSchema }),
    }).server((input) =>
      runAnalystTool({
        emit,
        inputSummary: `top customer risk rows, limit ${input.limit ?? 80}`,
        name: "get_customer_risk_rollup",
        run: () => getCustomerRiskRollup(entries(), input),
        summarize: (result) =>
          `${result.rows.length} customers${result.truncation.truncated ? " with truncation" : ""}`,
      }),
    ),
  ];
}

function runAnalystTool<T>({
  emit,
  inputSummary,
  name,
  run,
  summarize,
}: {
  emit?: EmitAnalystEvent;
  inputSummary: string;
  name: string;
  run: () => T;
  summarize: (result: T) => string;
}) {
  emitProgress(emit, `Calling ${name}`, inputSummary);
  emitTrace(emit, "tool", name, inputSummary);

  const started = performance.now();
  const result = run();
  const detail = `${summarize(result)} in ${Math.round(performance.now() - started)}ms`;

  emitProgress(emit, `Loaded ${toolLabel(name)}`, detail);
  emitTrace(emit, "tool", `${name} result`, detail);

  return result;
}

function emitProgress(emit: EmitAnalystEvent | undefined, label: string, detail?: string) {
  emit?.({
    at: new Date().toISOString(),
    detail: detail?.slice(0, 500),
    label: label.slice(0, 160),
    type: "progress",
  });
}

function emitTrace(
  emit: EmitAnalystEvent | undefined,
  source: Extract<AnalystRunEvent, { type: "trace" }>["source"],
  label: string,
  detail?: string,
) {
  emit?.({
    at: new Date().toISOString(),
    detail: detail?.slice(0, 1_500),
    label: label.slice(0, 160),
    source,
    type: "trace",
  });
}

function toolLabel(name: string) {
  return name.replace(/^get_/, "").replaceAll("_", " ");
}
