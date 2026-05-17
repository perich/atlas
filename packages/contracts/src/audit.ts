import { z } from "zod";

import { assetSchema, railSchema, riskTierSchema, type Asset, type Rail } from "./domain.js";

export type HealthResponse = {
  ok: true;
  service: string;
  uptimeSec: number;
};

export const AUDIT_ENTRY_KINDS = [
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
] as const;
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

export const AUDIT_SUBJECT_TYPES = [
  "payment",
  "journal",
  "customer",
  "account",
  "rail",
  "settlement",
  "exception",
  "configuration",
  "cutoff",
  "operator",
] as const;
export const AUDIT_ACTORS = [
  "system",
  "operator",
  "rail",
  "api",
  "scheduler",
  "risk_engine",
] as const;

export const auditEntryKindSchema = z.enum(AUDIT_ENTRY_KINDS);
export const auditSeveritySchema = z.enum(AUDIT_SEVERITIES);
export const auditStatusSchema = z.enum(AUDIT_STATUSES);
export const auditSortFieldSchema = z.enum(AUDIT_SORT_FIELDS);
export const auditSortDirectionSchema = z.enum(AUDIT_SORT_DIRECTIONS);
export const auditSubjectTypeSchema = z.enum(AUDIT_SUBJECT_TYPES);
export const auditActorSchema = z.enum(AUDIT_ACTORS);

export type AuditEntryKind = (typeof AUDIT_ENTRY_KINDS)[number];
export type AuditSubjectType = (typeof AUDIT_SUBJECT_TYPES)[number];

export type AuditEntry = {
  id: string;
  ts: number;
  severity: (typeof AUDIT_SEVERITIES)[number];
  kind: AuditEntryKind;
  actor: (typeof AUDIT_ACTORS)[number];
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
  newestTs?: number;
  queryMs: number;
};

export type AuditFacets = {
  severity: Record<string, number>;
  rail: Record<string, number>;
  status: Record<string, number>;
};

export const auditSortSchema = z.object({
  field: auditSortFieldSchema,
  dir: auditSortDirectionSchema,
});

export const jsonAuditEntrySchema = z.object({
  id: z.string(),
  ts: z.number().finite(),
  severity: auditSeveritySchema,
  kind: auditEntryKindSchema,
  actor: auditActorSchema,
  action: z.string(),
  subjectType: auditSubjectTypeSchema,
  subjectId: z.string(),
  customerId: z.string().optional(),
  accountId: z.string().optional(),
  rail: railSchema.optional(),
  asset: assetSchema.optional(),
  amountMinor: z.string().optional(),
  status: auditStatusSchema,
  riskTier: riskTierSchema.optional(),
  traceId: z.string(),
  idempotencyKey: z.string().optional(),
  summary: z.string(),
  detail: z.record(z.string(), z.unknown()),
});

export const jsonAuditPageSchema = z.object({
  rows: z.array(jsonAuditEntrySchema),
  offset: z.int().nonnegative(),
  nextCursor: z.string().optional(),
  prevCursor: z.string().optional(),
  totalMatched: z.int().nonnegative(),
  newestTs: z.number().finite().optional(),
  queryMs: z.number().finite().nonnegative(),
});

const auditFacetCountSchema = z.record(z.string(), z.int().nonnegative());

export const jsonAuditFacetsSchema = z.object({
  severity: auditFacetCountSchema,
  rail: auditFacetCountSchema,
  status: auditFacetCountSchema,
});

export type JsonAuditEntry = z.infer<typeof jsonAuditEntrySchema>;
export type JsonAuditPage = z.infer<typeof jsonAuditPageSchema>;
export type JsonAuditFacets = z.infer<typeof jsonAuditFacetsSchema>;
