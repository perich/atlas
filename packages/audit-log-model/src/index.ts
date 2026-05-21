import {
  ASSETS,
  RAILS,
  RISK_TIERS,
  type AuditEntry,
  type AuditEntryKind,
  type RiskTier,
} from "@bankops/contracts";

import {
  AUDIT_PROFILES,
  auditDetailFor,
  auditSubjectIdFor,
  type AuditContext,
  type AuditProfile,
} from "./audit-profiles.js";
import { randomInt } from "./random.js";
import {
  enrichedEntityContextFor,
  withAnalystContext,
  type OperationalPressure,
} from "./enrichment.js";

export { getAuditFacets, queryAuditEntries } from "./query.js";
export type { AuditFilters } from "./query.js";

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

type AuditSeverity = AuditEntry["severity"];
type AuditStatus = AuditEntry["status"];

type Random = Parameters<typeof randomInt>[0];

let defaultAuditEntries: AuditEntry[] | undefined;

export function getAuditLogEntries(): readonly AuditEntry[] {
  defaultAuditEntries ??= createAuditEntries(DEFAULT_AUDIT_ENTRY_COUNT);
  return defaultAuditEntries;
}

export function createAuditEntries(count: number): AuditEntry[] {
  const random = { value: DEFAULT_AUDIT_LOG_SEED };

  return Array.from({ length: count }, (_value, index) => createAuditEntry(index, random));
}

function createAuditEntry(index: number, random: Random): AuditEntry {
  const profile = AUDIT_PROFILES[index % AUDIT_PROFILES.length];
  const customerNumber = randomInt(random, 0, CUSTOMER_COUNT - 1);
  const accountNumber = randomInt(random, 0, ACCOUNT_COUNT - 1);
  const rail = RAILS[randomInt(random, 0, RAILS.length - 1)];
  const asset = ASSETS[randomInt(random, 0, ASSETS.length - 1)];
  const amountMinor = amountFor(profile.kind, random);
  const riskTier = riskTierFor(profile.kind, index, random);
  const customerId = customerIdFor(customerNumber);
  const accountId = accountIdFor(accountNumber);
  const scheduledFailure = isScheduledFailure(index);
  const enrichedContext = enrichedEntityContextFor({
    accountId,
    accountNumber,
    customerId,
    customerNumber,
    index,
    rail,
  });
  const traceId = traceIdFor(index, customerNumber);
  const context = {
    amountMinor,
    asset,
    baseTsMs: BASE_TS_MS,
    index,
    isScheduledFailure: scheduledFailure,
    profile,
    rail,
    riskTier,
    ...enrichedContext,
  } satisfies AuditContext;
  const severity = severityFor(profile, index, enrichedContext.pressure);
  const status = statusFor(profile, scheduledFailure, enrichedContext.pressure);

  const entry: AuditEntry = {
    action: profile.action,
    actor: profile.actor,
    asset,
    customerId,
    accountId,
    detail: withAnalystContext(auditDetailFor(context), context),
    id: `aud_${index.toString(36).padStart(8, "0")}`,
    kind: profile.kind,
    rail,
    severity,
    status,
    subjectId: auditSubjectIdFor(context),
    subjectType: profile.subjectType,
    summary: `${profile.action} on ${rail} for ${customerId}`,
    traceId,
    ts: BASE_TS_MS - index * ENTRY_SPACING_MS - randomInt(random, 0, ENTRY_JITTER_MS),
  };
  const idempotencyKey = idempotencyKeyFor(profile.kind, index, customerNumber);

  if (amountMinor !== undefined) {
    entry.amountMinor = amountMinor;
  }

  if (riskTier !== undefined) {
    entry.riskTier = riskTier;
  }

  if (idempotencyKey !== undefined) {
    entry.idempotencyKey = idempotencyKey;
  }

  return entry;
}

function amountFor(kind: AuditEntryKind, random: Random): bigint | undefined {
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

function riskTierFor(kind: AuditEntryKind, index: number, random: Random): RiskTier | undefined {
  if (kind === "configuration" || kind === "operator_action") {
    return undefined;
  }

  return RISK_TIERS[(index + randomInt(random, 0, 3)) % RISK_TIERS.length];
}

function severityFor(
  profile: AuditProfile,
  index: number,
  pressure: OperationalPressure,
): AuditSeverity {
  if (index % CRITICAL_ENTRY_INTERVAL === 0) {
    return "critical";
  }

  if (pressure.exceptionPressure >= 28 && profile.kind !== "operator_action") {
    return "critical";
  }

  if (index % WARNING_ENTRY_INTERVAL === 0) {
    return "warning";
  }

  if (pressure.exceptionPressure >= 12) {
    return "warning";
  }

  return profile.severity;
}

function statusFor(
  profile: AuditProfile,
  scheduledFailure: boolean,
  pressure: OperationalPressure,
): AuditStatus {
  if (scheduledFailure || pressure.forceFailure) {
    return "failed";
  }

  return profile.status;
}

function isScheduledFailure(index: number): boolean {
  return index % FAILED_ENTRY_INTERVAL === 0;
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
