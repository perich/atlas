import { z } from "zod";

export const STREAM_RATES = [1, 50, 2_000, 10_000] as const;

export type StreamRate = (typeof STREAM_RATES)[number];

export const streamRateSchema = z.union([
  z.literal(1),
  z.literal(50),
  z.literal(2_000),
  z.literal(10_000),
]);

export const DEFAULT_STREAM_RATE = 2_000 satisfies StreamRate;

export const RAILS = ["ach", "wire", "instant", "card", "internal_ledger", "stablecoin"] as const;

export type Rail = (typeof RAILS)[number];

export const railSchema = z.enum(RAILS);

export const ASSETS = ["USD", "USDC", "USDT", "PYUSD", "EURC"] as const;

export type Asset = (typeof ASSETS)[number];

export const assetSchema = z.enum(ASSETS);

export const MOVEMENT_KINDS = [
  "deposit_credit",
  "wire_debit",
  "ach_debit",
  "instant_payment_credit",
  "stablecoin_credit",
  "stablecoin_debit",
  "fee_credit",
  "reversal_credit",
  "reserve_transfer",
  "exception_hold",
] as const;

export type MovementKind = (typeof MOVEMENT_KINDS)[number];

export const movementKindSchema = z.enum(MOVEMENT_KINDS);

export const MOVEMENT_SIDES = ["debit", "credit"] as const;

export type MovementSide = (typeof MOVEMENT_SIDES)[number];

export const movementSideSchema = z.enum(MOVEMENT_SIDES);

export const BALANCE_SHEET_BUCKETS = [
  "customer_deposits",
  "settlement_cash",
  "reserve_cash",
  "rail_clearing",
  "stablecoin_treasury",
  "fee_income",
  "exception_queue",
] as const;

export type BalanceSheetBucket = (typeof BALANCE_SHEET_BUCKETS)[number];

export const balanceSheetBucketSchema = z.enum(BALANCE_SHEET_BUCKETS);

export const MOVEMENT_STATUSES = [
  "accepted",
  "pending",
  "posted",
  "settled",
  "failed",
  "held",
] as const;

export type MovementStatus = (typeof MOVEMENT_STATUSES)[number];

export const movementStatusSchema = z.enum(MOVEMENT_STATUSES);

export const RISK_TIERS = [0, 1, 2, 3] as const;

export type RiskTier = (typeof RISK_TIERS)[number];

export const riskTierSchema = z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(3)]);

export type BalanceSheetMovement = {
  seq: bigint;
  serverTs: number;
  kind: MovementKind;
  side: MovementSide;
  bucket: BalanceSheetBucket;
  rail: Rail;
  asset: Asset;
  customerId: number;
  accountId: number;
  amountMinor: bigint;
  latencyMs: number;
  status: MovementStatus;
  riskTier: RiskTier;
  flags: number;
};
