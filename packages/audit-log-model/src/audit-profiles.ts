import {
  type Asset,
  type AuditEntry,
  type AuditEntryKind,
  type AuditSubjectType,
  type Rail,
  type RiskTier,
} from "@bankops/contracts";

import type { EnrichedEntityContext, OperationalPressure } from "./enrichment.js";

const SETTLEMENT_BATCH_SIZE = 48;
const RECONCILIATION_RUN_SIZE = 96;
const CUTOFF_BATCH_SIZE = 1_000;
const OPERATOR_COUNT = 24;
const RISK_RULE_COUNT = 12;
const RESERVE_TARGET_MINOR = 2_500_000_000_00n;
const RESERVE_STEP_MINOR = 1_000_00;
const DAY_MS = 86_400_000;
const STABLECOIN_START_BLOCK = 25_000_000;
const STABLECOIN_DAILY_LIMIT = {
  key: "stablecoin.daily_limit",
  previousValue: "250000000000",
  nextValue: "300000000000",
} as const;
const WIRE_APPROVAL_THRESHOLD = {
  key: "wire.approval_threshold",
  previousValue: "5000000000",
  nextValue: "7500000000",
} as const;

type AuditActor = AuditEntry["actor"];
type AuditSeverity = AuditEntry["severity"];
type AuditStatus = AuditEntry["status"];

export type AuditProfile = {
  kind: AuditEntryKind;
  actor: AuditActor;
  action: string;
  subjectType: AuditSubjectType;
  status: AuditStatus;
  severity: AuditSeverity;
};

export type AuditContext = {
  index: number;
  baseTsMs: number;
  isScheduledFailure: boolean;
  profile: AuditProfile;
  rail: Rail;
  asset: Asset;
  amountMinor: bigint | undefined;
  riskTier: RiskTier | undefined;
  customerId: string;
  accountId: string;
  pressure: OperationalPressure;
} & EnrichedEntityContext;

type DetailBuilder = (context: AuditContext) => Record<string, unknown>;
type SubjectIdBuilder = (context: AuditContext) => string;

export const AUDIT_PROFILES: readonly AuditProfile[] = [
  {
    action: "payment.submitted",
    actor: "api",
    kind: "payment",
    severity: "info",
    status: "accepted",
    subjectType: "payment",
  },
  {
    action: "journal.posted",
    actor: "system",
    kind: "journal",
    severity: "info",
    status: "posted",
    subjectType: "journal",
  },
  {
    action: "settlement.observed",
    actor: "rail",
    kind: "settlement",
    severity: "notice",
    status: "pending",
    subjectType: "settlement",
  },
  {
    action: "reconciliation.matched",
    actor: "scheduler",
    kind: "reconciliation",
    severity: "info",
    status: "settled",
    subjectType: "settlement",
  },
  {
    action: "risk.review_opened",
    actor: "risk_engine",
    kind: "risk",
    severity: "warning",
    status: "pending",
    subjectType: "customer",
  },
  {
    action: "liquidity.reserve_rebalanced",
    actor: "system",
    kind: "liquidity",
    severity: "notice",
    status: "posted",
    subjectType: "account",
  },
  {
    action: "rail.degraded",
    actor: "rail",
    kind: "rail_health",
    severity: "warning",
    status: "pending",
    subjectType: "rail",
  },
  {
    action: "rail.incident_declared",
    actor: "rail",
    kind: "rail_health",
    severity: "critical",
    status: "failed",
    subjectType: "rail",
  },
  {
    action: "cutoff.window_opened",
    actor: "operator",
    kind: "cutoff",
    severity: "warning",
    status: "pending",
    subjectType: "cutoff",
  },
  {
    action: "settlement.exception_opened",
    actor: "rail",
    kind: "settlement",
    severity: "critical",
    status: "failed",
    subjectType: "settlement",
  },
  {
    action: "reconciliation.unmatched",
    actor: "scheduler",
    kind: "reconciliation",
    severity: "critical",
    status: "pending",
    subjectType: "settlement",
  },
  {
    action: "liquidity.reserve_breach",
    actor: "system",
    kind: "liquidity",
    severity: "critical",
    status: "pending",
    subjectType: "account",
  },
  {
    action: "configuration.changed",
    actor: "operator",
    kind: "configuration",
    severity: "notice",
    status: "posted",
    subjectType: "configuration",
  },
  {
    action: "operator.annotation_added",
    actor: "operator",
    kind: "operator_action",
    severity: "info",
    status: "accepted",
    subjectType: "operator",
  },
  {
    action: "payment.failed",
    actor: "rail",
    kind: "payment",
    severity: "warning",
    status: "failed",
    subjectType: "payment",
  },
  {
    action: "journal.reversed",
    actor: "system",
    kind: "journal",
    severity: "notice",
    status: "reversed",
    subjectType: "journal",
  },
];

export function auditDetailFor(context: AuditContext): Record<string, unknown> {
  return DETAIL_BY_KIND[context.profile.kind](context);
}

export function auditSubjectIdFor(context: AuditContext): string {
  return SUBJECT_ID_BY_TYPE[context.profile.subjectType](context);
}

const DETAIL_BY_KIND: Record<AuditEntryKind, DetailBuilder> = {
  payment: (context) => ({
    paymentId: paymentIdFor(context.index),
    amountMinor: context.amountMinor,
    rail: context.rail,
    asset: context.asset,
    direction: context.index % 2 === 0 ? "inbound" : "outbound",
    returnRiskBps: 18 + context.pressure.errorRateBpsDelta,
    pendingDepth: context.pressure.pendingDepth,
    exceptionPressure: context.pressure.exceptionPressure,
  }),
  journal: (context) => ({
    journalId: journalIdFor(context.index),
    debitLineCount: 2 + (context.index % 3),
    creditLineCount: 2 + ((context.index + 1) % 3),
    balanced: !context.isScheduledFailure,
  }),
  settlement: (context) => ({
    settlementBatchId: settlementBatchIdFor(context.index),
    finality: context.rail === "stablecoin" ? "onchain_confirmed" : "rail_acknowledged",
    observedBlock:
      context.rail === "stablecoin" ? STABLECOIN_START_BLOCK + context.index : undefined,
    finalityLagMs:
      context.rail === "stablecoin" || context.pressure.latencyMsDelta > 0
        ? 18_000 + context.pressure.latencyMsDelta
        : 900,
    pendingDepth: context.pressure.pendingDepth,
  }),
  reconciliation: (context) => ({
    reconciliationRunId: reconciliationRunIdFor(context.index),
    matchedCount: 40 + (context.index % 600),
    unmatchedCount: (context.index % 17) + context.pressure.unmatchedDelta,
    exceptionPressure: context.pressure.exceptionPressure,
  }),
  risk: (context) => ({
    riskTier: context.riskTier,
    ruleId: `risk_rule_${context.index % RISK_RULE_COUNT}`,
    reviewReason: context.index % 2 === 0 ? "velocity_spike" : "counterparty_watch",
    reviewQueueDepth: 4 + context.pressure.riskReviewVolume,
    exceptionPressure: context.pressure.exceptionPressure,
  }),
  liquidity: (context) => ({
    reserveTargetMinor: RESERVE_TARGET_MINOR,
    reserveAfterMinor:
      RESERVE_TARGET_MINOR +
      BigInt((context.index % CUTOFF_BATCH_SIZE) * RESERVE_STEP_MINOR) +
      context.pressure.reserveDeltaMinor,
    reserveDeltaMinor: context.pressure.reserveDeltaMinor,
    liquidityStress: context.index % 3 === 0 ? "startup_outflow" : "normal",
  }),
  rail_health: (context) => ({
    rail: context.rail,
    p95LatencyMs: 250 + (context.index % 4_000) + context.pressure.latencyMsDelta,
    errorRateBps: (context.index % 250) + context.pressure.errorRateBpsDelta,
    pendingDepth: context.pressure.pendingDepth,
  }),
  cutoff: (context) => ({
    cutoffId: cutoffIdFor(context.index),
    effectiveTs: context.baseTsMs - DAY_MS,
    quarantineMode: context.index % 2 === 0,
    pendingDepth: context.pressure.pendingDepth,
    exceptionPressure: context.pressure.exceptionPressure,
  }),
  configuration: (context) => {
    const config = context.index % 2 === 0 ? STABLECOIN_DAILY_LIMIT : WIRE_APPROVAL_THRESHOLD;

    return {
      configKey: config.key,
      previousValue: config.previousValue,
      nextValue: config.nextValue,
    };
  },
  operator_action: (context) => ({
    operatorId: operatorIdFor(context.index),
    workspaceAction: context.index % 2 === 0 ? "saved_view.created" : "incident_note.added",
    reasonCode: "operator_context",
    reviewedExceptions: context.pressure.exceptionPressure,
  }),
};

const SUBJECT_ID_BY_TYPE: Record<AuditSubjectType, SubjectIdBuilder> = {
  payment: (context) => paymentIdFor(context.index),
  journal: (context) => journalIdFor(context.index),
  customer: (context) => context.customerId,
  account: (context) => context.accountId,
  rail: (context) => context.rail,
  settlement: (context) => settlementBatchIdFor(context.index),
  exception: (context) => exceptionIdFor(context.index),
  configuration: (context) =>
    context.index % 2 === 0 ? STABLECOIN_DAILY_LIMIT.key : WIRE_APPROVAL_THRESHOLD.key,
  cutoff: (context) => cutoffIdFor(context.index),
  operator: (context) => operatorIdFor(context.index),
};

function paymentIdFor(index: number): string {
  return `pay_${index.toString(36)}`;
}

function journalIdFor(index: number): string {
  return `jrnl_${index.toString(36)}`;
}

function settlementBatchIdFor(index: number): string {
  return `set_${Math.floor(index / SETTLEMENT_BATCH_SIZE).toString(36)}`;
}

function reconciliationRunIdFor(index: number): string {
  return `rec_${Math.floor(index / RECONCILIATION_RUN_SIZE).toString(36)}`;
}

function cutoffIdFor(index: number): string {
  return `cut_${Math.floor(index / CUTOFF_BATCH_SIZE).toString(36)}`;
}

function exceptionIdFor(index: number): string {
  return `exc_${index.toString(36)}`;
}

function operatorIdFor(index: number): string {
  return `op_${(index % OPERATOR_COUNT).toString(36).padStart(3, "0")}`;
}
