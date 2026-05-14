import type { Asset, Rail } from "./domain.js";

export type HealthResponse = {
  ok: true;
  service: string;
  uptimeSec: number;
};

export type AuditEntryKind =
  | "payment"
  | "journal"
  | "settlement"
  | "reconciliation"
  | "risk"
  | "liquidity"
  | "rail_health"
  | "cutoff"
  | "configuration"
  | "operator_action";

export const AUDIT_SEVERITIES = ["info", "notice", "warning", "critical"] as const;
export const AUDIT_STATUSES = [
  "accepted",
  "pending",
  "posted",
  "settled",
  "failed",
  "reversed",
] as const;
export const AUDIT_SORT_FIELDS = ["ts", "severity", "rail", "status", "kind"] as const;
export const AUDIT_SORT_DIRECTIONS = ["asc", "desc"] as const;

export type AuditSubjectType =
  | "payment"
  | "journal"
  | "customer"
  | "account"
  | "rail"
  | "settlement"
  | "exception"
  | "configuration"
  | "cutoff"
  | "operator";

export type AuditEntry = {
  id: string;
  ts: number;
  severity: (typeof AUDIT_SEVERITIES)[number];
  kind: AuditEntryKind;
  actor: "system" | "operator" | "rail" | "api" | "scheduler" | "risk_engine";
  action: string;
  subjectType: AuditSubjectType;
  subjectId: string;
  customerId?: string;
  accountId?: string;
  rail?: Rail;
  asset?: Asset;
  amountMinor?: bigint;
  status: (typeof AUDIT_STATUSES)[number];
  riskTier?: 0 | 1 | 2 | 3;
  traceId: string;
  idempotencyKey?: string;
  summary: string;
  detail: Record<string, unknown>;
};

export type AuditSortField = (typeof AUDIT_SORT_FIELDS)[number];

export type AuditSort = {
  field: AuditSortField;
  dir: (typeof AUDIT_SORT_DIRECTIONS)[number];
};

export type AuditQuery = {
  filters?: {
    tsFrom?: number;
    tsTo?: number;
    severity?: AuditEntry["severity"][];
    rail?: Rail[];
    status?: AuditEntry["status"][];
  };
  sort?: AuditSort;
  after?: string;
  before?: string;
  offset?: number;
  limit: number;
};

export type AuditPage = {
  rows: AuditEntry[];
  offset: number;
  nextCursor?: string;
  prevCursor?: string;
  totalMatched: number;
  queryMs: number;
};

export type AuditFacets = {
  severity: Record<string, number>;
  rail: Record<string, number>;
  status: Record<string, number>;
};
