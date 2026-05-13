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
  severity: "info" | "notice" | "warning" | "critical";
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
  status: "accepted" | "pending" | "posted" | "settled" | "failed" | "reversed";
  riskTier?: 0 | 1 | 2 | 3;
  traceId: string;
  idempotencyKey?: string;
  summary: string;
  detail: Record<string, unknown>;
};

export type AuditSortField = "ts" | "severity" | "rail" | "status" | "kind";

export type AuditSort = {
  field: AuditSortField;
  dir: "asc" | "desc";
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
  limit: number;
};

export type AuditPage = {
  rows: AuditEntry[];
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
