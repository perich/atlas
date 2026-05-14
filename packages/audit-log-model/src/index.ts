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
const ENTRY_SPACING_MS = 1_000;
const ENTRY_JITTER_MS = 900;
const MIN_AMOUNT_MINOR = 1_000_00;
const MAX_AMOUNT_MINOR = 50_000_000_00;
const CRITICAL_ENTRY_INTERVAL = 997;
const WARNING_ENTRY_INTERVAL = 149;
const FAILED_ENTRY_INTERVAL = 431;
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
  accountId: string;
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
  const accountId = accountIdFor(accountNumber);
  const traceId = traceIdFor(index, customerNumber);
  const context = { accountId, amountMinor, asset, customerId, index, profile, rail, riskTier };

  return {
    action: profile.action,
    actor: profile.actor,
    amountMinor,
    asset,
    customerId,
    accountId,
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
    summary: `${profile.action} on ${rail} for ${customerId}`,
    traceId,
    ts: BASE_TS_MS - index * ENTRY_SPACING_MS - randomInt(random, 0, ENTRY_JITTER_MS),
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

  return BigInt(randomInt(random, MIN_AMOUNT_MINOR, MAX_AMOUNT_MINOR));
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
  if (index % CRITICAL_ENTRY_INTERVAL === 0) {
    return "critical";
  }

  if (index % WARNING_ENTRY_INTERVAL === 0) {
    return "warning";
  }

  return profile.severity;
}

function statusFor(profile: AuditProfile, index: number): AuditStatus {
  if (index % FAILED_ENTRY_INTERVAL === 0) {
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
        balanced: context.index % FAILED_ENTRY_INTERVAL !== 0,
      };
    case "settlement":
      return {
        settlementBatchId: `set_${Math.floor(context.index / SETTLEMENT_BATCH_SIZE).toString(36)}`,
        finality: context.rail === "stablecoin" ? "onchain_confirmed" : "rail_acknowledged",
        observedBlock:
          context.rail === "stablecoin" ? STABLECOIN_START_BLOCK + context.index : undefined,
      };
    case "reconciliation":
      return {
        reconciliationRunId: `rec_${Math.floor(context.index / RECONCILIATION_RUN_SIZE).toString(
          36,
        )}`,
        matchedCount: 40 + (context.index % 600),
        unmatchedCount: context.index % 17,
      };
    case "risk":
      return {
        riskTier: context.riskTier,
        ruleId: `risk_rule_${context.index % RISK_RULE_COUNT}`,
        reviewReason: context.index % 2 === 0 ? "velocity_spike" : "counterparty_watch",
      };
    case "liquidity":
      return {
        reserveTargetMinor: RESERVE_TARGET_MINOR,
        reserveAfterMinor:
          RESERVE_TARGET_MINOR + BigInt((context.index % CUTOFF_BATCH_SIZE) * RESERVE_STEP_MINOR),
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
        cutoffId: `cut_${Math.floor(context.index / CUTOFF_BATCH_SIZE).toString(36)}`,
        effectiveTs: BASE_TS_MS - DAY_MS,
        quarantineMode: context.index % 2 === 0,
      };
    case "configuration":
      const config = context.index % 2 === 0 ? STABLECOIN_DAILY_LIMIT : WIRE_APPROVAL_THRESHOLD;

      return {
        configKey: config.key,
        previousValue: config.previousValue,
        nextValue: config.nextValue,
      };
    case "operator_action":
      return {
        operatorId: `op_${(context.index % OPERATOR_COUNT).toString(36).padStart(3, "0")}`,
        workspaceAction: context.index % 2 === 0 ? "saved_view.created" : "incident_note.added",
        reasonCode: "operator_context",
      };
  }

  return assertNever(context.profile.kind);
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
      return context.accountId;
    case "rail":
      return context.rail;
    case "settlement":
      return `set_${Math.floor(context.index / SETTLEMENT_BATCH_SIZE).toString(36)}`;
    case "exception":
      return `exc_${context.index.toString(36)}`;
    case "configuration":
      return context.index % 2 === 0 ? STABLECOIN_DAILY_LIMIT.key : WIRE_APPROVAL_THRESHOLD.key;
    case "cutoff":
      return `cut_${Math.floor(context.index / CUTOFF_BATCH_SIZE).toString(36)}`;
    case "operator":
      return `op_${(context.index % OPERATOR_COUNT).toString(36).padStart(3, "0")}`;
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
