import {
  auditEntryKindSchema,
  auditSeveritySchema,
  auditStatusSchema,
  railSchema,
} from "@bankops/contracts";
import { z } from "zod";

import { DEFAULT_ROLLUP_LIMIT, MAX_ROLLUP_LIMIT } from "./limits.js";
import type { AnalystFilters } from "./types.js";

const filtersSchema = z.object({
  tsFrom: z.number().finite().optional(),
  tsTo: z.number().finite().optional(),
  rail: z.array(railSchema).optional(),
  severity: z.array(auditSeveritySchema).optional(),
  status: z.array(auditStatusSchema).optional(),
  kind: z.array(auditEntryKindSchema).optional(),
  customerId: z.array(z.string()).optional(),
});

export const analystFiltersSchema = filtersSchema.default({}).transform(compactAnalystFilters);
export const analystToolLimitSchema = z
  .int()
  .min(1)
  .max(MAX_ROLLUP_LIMIT)
  .default(DEFAULT_ROLLUP_LIMIT);

export const datasetOverviewInputSchema = z.object({ filters: analystFiltersSchema });
export const timeSeriesInputSchema = z.object({
  filters: analystFiltersSchema,
  grain: z.enum(["hour", "day"]),
  metric: z.enum(["count", "amountMinor", "failedCount", "exceptionPressure", "pendingDepth"]),
});
export const breakdownInputSchema = z.object({
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
  filters: analystFiltersSchema,
  limit: analystToolLimitSchema,
  metric: z.enum(["count", "amountMinor", "failedCount", "exceptionPressure"]),
});
export const auditSampleInputSchema = z.object({
  filters: analystFiltersSchema,
  limit: analystToolLimitSchema,
  sort: z.enum(["newest", "oldest", "amountDesc", "severityDesc"]).default("newest"),
});
export const filtersInputSchema = z.object({ filters: analystFiltersSchema });
export const customerRiskInputSchema = z.object({
  filters: analystFiltersSchema,
  limit: analystToolLimitSchema,
});

export type DatasetOverviewInput = z.infer<typeof datasetOverviewInputSchema>;
export type TimeSeriesInput = z.infer<typeof timeSeriesInputSchema>;
export type BreakdownInput = z.infer<typeof breakdownInputSchema>;
export type AuditSampleInput = z.infer<typeof auditSampleInputSchema>;
export type FiltersInput = z.infer<typeof filtersInputSchema>;
export type CustomerRiskInput = z.infer<typeof customerRiskInputSchema>;

function compactAnalystFilters(filters: z.infer<typeof filtersSchema>): AnalystFilters {
  const compact: AnalystFilters = {};

  if (filters.tsFrom !== undefined) {
    compact.tsFrom = filters.tsFrom;
  }

  if (filters.tsTo !== undefined) {
    compact.tsTo = filters.tsTo;
  }

  if (filters.rail !== undefined) {
    compact.rail = filters.rail;
  }

  if (filters.severity !== undefined) {
    compact.severity = filters.severity;
  }

  if (filters.status !== undefined) {
    compact.status = filters.status;
  }

  if (filters.kind !== undefined) {
    compact.kind = filters.kind;
  }

  if (filters.customerId !== undefined) {
    compact.customerId = filters.customerId;
  }

  return compact;
}
