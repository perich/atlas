import type { AuditEntry, AuditEntryKind, Rail } from "@bankops/contracts";

export type AnalystWindow = {
  tsFrom?: number;
  tsTo?: number;
};

export type AnalystFilters = AnalystWindow & {
  rail?: Rail[];
  severity?: AuditEntry["severity"][];
  status?: AuditEntry["status"][];
  kind?: AuditEntryKind[];
  customerId?: string[];
};

export type Truncation = {
  truncated: boolean;
  limit: number;
  total: number;
};

export type TimeGrain = "hour" | "day";

export type TimeSeriesMetric =
  | "count"
  | "amountMinor"
  | "failedCount"
  | "exceptionPressure"
  | "pendingDepth";

export type BreakdownDimension =
  | "rail"
  | "severity"
  | "status"
  | "kind"
  | "customer.segment"
  | "customer.region"
  | "customer.riskProfile"
  | "customer.monthlyVolumeBand";

export type BreakdownMetric = "count" | "amountMinor" | "failedCount" | "exceptionPressure";

export type AuditSampleSort = "newest" | "oldest" | "amountDesc" | "severityDesc";
