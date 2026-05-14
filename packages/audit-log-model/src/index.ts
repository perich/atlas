import {
  ASSETS,
  RAILS,
  type Asset,
  type AuditEntry,
  type AuditEntryKind,
  type AuditSubjectType,
  type Rail,
  type RiskTier,
} from "@bankops/contracts";

export const DEFAULT_AUDIT_ENTRY_COUNT = 100_000;
export const AUDIT_LOG_TARGET_COUNT = 250_000;

const BASE_TS_MS = 1_778_500_800_000;
const CUSTOMER_COUNT = 160;
const ACCOUNT_COUNT = 640;
const DEFAULT_AUDIT_LOG_SEED = 0xa_0d17;

type AuditActor = AuditEntry["actor"];
type AuditSeverity = AuditEntry["severity"];
type AuditStatus = AuditEntry["status"];

type AuditProfile = {
  kind: AuditEntryKind;
  actor: AuditActor;
  action: string;
  subjectType: AuditSubjectType;
  status: AuditStatus;
  severity: AuditSeverity;
};

type RandomState = {
  value: number;
};

type AuditContext = {
  index: number;
  profile: AuditProfile;
  rail: Rail;
  asset: Asset;
  amountMinor: bigint | undefined;
  riskTier: RiskTier | undefined;
  customerId: string;
};

const PROFILES: readonly AuditProfile[] = [
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
    action: "cutoff.window_opened",
    actor: "operator",
    kind: "cutoff",
    severity: "critical",
    status: "pending",
    subjectType: "cutoff",
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

const RISK_TIERS = [0, 1, 2, 3] as const;

let defaultAuditEntries: AuditEntry[] | undefined;

export function getAuditLogEntries(): readonly AuditEntry[] {
  defaultAuditEntries ??= createAuditEntries(DEFAULT_AUDIT_ENTRY_COUNT);
  return defaultAuditEntries;
}

export function createAuditEntries(count: number): AuditEntry[] {
  const random: RandomState = { value: DEFAULT_AUDIT_LOG_SEED };

  return Array.from({ length: count }, (_value, index) => createAuditEntry(index, random));
}

function createAuditEntry(index: number, random: RandomState): AuditEntry {
  const profile = PROFILES[index % PROFILES.length];
  const customerNumber = randomInt(random, 0, CUSTOMER_COUNT - 1);
  const accountNumber = randomInt(random, 0, ACCOUNT_COUNT - 1);
  const rail = RAILS[randomInt(random, 0, RAILS.length - 1)];
  const asset = ASSETS[randomInt(random, 0, ASSETS.length - 1)];
  const amountMinor = amountFor(profile.kind, random);
  const riskTier = riskTierFor(profile.kind, index, random);
  const customerId = customerIdFor(customerNumber);
  const traceId = traceIdFor(index, customerNumber);
  const context = { amountMinor, asset, customerId, index, profile, rail, riskTier };

  return {
    action: profile.action,
    actor: profile.actor,
    amountMinor,
    asset,
    customerId,
    accountId: accountIdFor(accountNumber),
    detail: detailFor(context),
    id: `aud_${index.toString(36).padStart(8, "0")}`,
    idempotencyKey: idempotencyKeyFor(profile.kind, index, customerNumber),
    kind: profile.kind,
    rail,
    riskTier,
    severity: severityFor(profile, index),
    status: statusFor(profile, index),
    subjectId: subjectIdFor(context),
    subjectType: profile.subjectType,
    summary: summaryFor(profile, rail, customerId),
    traceId,
    ts: BASE_TS_MS - index * 1_000 - randomInt(random, 0, 900),
  };
}

function amountFor(kind: AuditEntryKind, random: RandomState): bigint | undefined {
  if (
    kind === "configuration" ||
    kind === "operator_action" ||
    kind === "rail_health" ||
    kind === "cutoff"
  ) {
    return undefined;
  }

  return BigInt(randomInt(random, 1_000_00, 50_000_000_00));
}

function riskTierFor(
  kind: AuditEntryKind,
  index: number,
  random: RandomState,
): RiskTier | undefined {
  if (kind === "configuration" || kind === "operator_action") {
    return undefined;
  }

  return RISK_TIERS[(index + randomInt(random, 0, 3)) % RISK_TIERS.length];
}

function severityFor(profile: AuditProfile, index: number): AuditSeverity {
  if (index % 997 === 0) {
    return "critical";
  }

  if (index % 149 === 0) {
    return "warning";
  }

  return profile.severity;
}

function statusFor(profile: AuditProfile, index: number): AuditStatus {
  if (index % 431 === 0) {
    return "failed";
  }

  return profile.status;
}

function detailFor(context: AuditContext): Record<string, unknown> {
  switch (context.profile.kind) {
    case "payment":
      return {
        paymentId: `pay_${context.index.toString(36)}`,
        amountMinor: context.amountMinor,
        rail: context.rail,
        asset: context.asset,
        direction: context.index % 2 === 0 ? "inbound" : "outbound",
      };
    case "journal":
      return {
        journalId: `jrnl_${context.index.toString(36)}`,
        debitLineCount: 2 + (context.index % 3),
        creditLineCount: 2 + ((context.index + 1) % 3),
        balanced: context.index % 431 !== 0,
      };
    case "settlement":
      return {
        settlementBatchId: `set_${Math.floor(context.index / 48).toString(36)}`,
        finality: context.rail === "stablecoin" ? "onchain_confirmed" : "rail_acknowledged",
        observedBlock: context.rail === "stablecoin" ? 25_000_000 + context.index : undefined,
      };
    case "reconciliation":
      return {
        reconciliationRunId: `rec_${Math.floor(context.index / 96).toString(36)}`,
        matchedCount: 40 + (context.index % 600),
        unmatchedCount: context.index % 17,
      };
    case "risk":
      return {
        riskTier: context.riskTier,
        ruleId: `risk_rule_${context.index % 12}`,
        reviewReason: context.index % 2 === 0 ? "velocity_spike" : "counterparty_watch",
      };
    case "liquidity":
      return {
        reserveTargetMinor: 2_500_000_000_00n,
        reserveAfterMinor: 2_500_000_000_00n + BigInt((context.index % 1_000) * 1_000_00),
        stressScenario: context.index % 3 === 0 ? "startup_outflow" : "normal",
      };
    case "rail_health":
      return {
        rail: context.rail,
        p95LatencyMs: 250 + (context.index % 4_000),
        errorRateBps: context.index % 250,
      };
    case "cutoff":
      return {
        cutoffId: `cut_${Math.floor(context.index / 1_000).toString(36)}`,
        effectiveTs: BASE_TS_MS - 86_400_000,
        quarantineMode: context.index % 2 === 0,
      };
    case "configuration":
      return {
        configKey: context.index % 2 === 0 ? "stablecoin.daily_limit" : "wire.approval_threshold",
        previousValue: context.index % 2 === 0 ? "250000000000" : "5000000000",
        nextValue: context.index % 2 === 0 ? "300000000000" : "7500000000",
      };
    case "operator_action":
      return {
        operatorId: `op_${(context.index % 24).toString(36).padStart(3, "0")}`,
        workspaceAction: context.index % 2 === 0 ? "saved_view.created" : "incident_note.added",
        reasonCode: "operator_context",
      };
  }

  return assertNever(context.profile.kind);
}

function summaryFor(profile: AuditProfile, rail: Rail, customerId: string): string {
  return `${profile.action} on ${rail} for ${customerId}`;
}

function subjectIdFor(context: AuditContext): string {
  switch (context.profile.subjectType) {
    case "payment":
      return `pay_${context.index.toString(36)}`;
    case "journal":
      return `jrnl_${context.index.toString(36)}`;
    case "customer":
      return context.customerId;
    case "account":
      return accountIdFor(context.index % ACCOUNT_COUNT);
    case "rail":
      return context.rail;
    case "settlement":
      return `set_${Math.floor(context.index / 48).toString(36)}`;
    case "exception":
      return `exc_${context.index.toString(36)}`;
    case "configuration":
      return context.index % 2 === 0 ? "stablecoin.daily_limit" : "wire.approval_threshold";
    case "cutoff":
      return `cut_${Math.floor(context.index / 1_000).toString(36)}`;
    case "operator":
      return `op_${(context.index % 24).toString(36).padStart(3, "0")}`;
  }

  return assertNever(context.profile.subjectType);
}

function idempotencyKeyFor(
  kind: AuditEntryKind,
  index: number,
  customerNumber: number,
): string | undefined {
  if (kind !== "payment" && kind !== "settlement" && kind !== "journal") {
    return undefined;
  }

  return `idem_${customerNumber.toString(36)}_${Math.floor(index / 5).toString(36)}`;
}

function customerIdFor(customerNumber: number): string {
  return `cus_${customerNumber.toString(36).padStart(4, "0")}`;
}

function accountIdFor(accountNumber: number): string {
  return `acct_${accountNumber.toString(36).padStart(5, "0")}`;
}

function traceIdFor(index: number, customerNumber: number): string {
  return `tr_${index.toString(36).padStart(8, "0")}_${customerNumber.toString(36)}`;
}

function randomInt(state: RandomState, min: number, max: number): number {
  state.value = (state.value * 1_664_525 + 1_013_904_223) >>> 0;
  return min + (state.value % (max - min + 1));
}

function assertNever(value: never): never {
  throw new Error(`Unexpected audit value: ${String(value)}`);
}
