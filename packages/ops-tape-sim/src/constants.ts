import type {
  Asset,
  BalanceSheetBucket,
  MovementKind,
  MovementSide,
  MovementStatus,
  Rail,
} from "@bankops/contracts";

export type CustomerIndustry =
  | "ai"
  | "defense"
  | "robotics"
  | "hardware"
  | "crypto"
  | "fintech"
  | "venture";

export type MovementProfile = {
  weight: number;
  kind: MovementKind;
  side: MovementSide;
  bucket: BalanceSheetBucket;
  rail: Rail;
  assets: readonly Asset[];
  minAmountMinor: number;
  maxAmountMinor: number;
  minLatencyMs: number;
  maxLatencyMs: number;
  normalStatus: MovementStatus;
  pendingBps: number;
  failedBps: number;
  heldBps: number;
};

export const INDUSTRIES: readonly CustomerIndustry[] = [
  "ai",
  "defense",
  "robotics",
  "hardware",
  "crypto",
  "fintech",
  "venture",
];

export const CUSTOMER_NAMES = [
  "Northstar AI",
  "Vector Defense",
  "Orbital Systems",
  "Acme Robotics",
  "Helios Hardware",
  "Keystone Crypto",
  "Riverbank Fintech",
  "Foundry Ventures",
  "Apex Autonomy",
  "Sentry Dynamics",
  "Atlas Compute",
  "Forge Labs",
  "Cobalt Robotics",
  "Nova Devices",
  "Meridian Capital",
  "Frontier Payments",
] as const;

export const ACCOUNT_LABELS = [
  "operating",
  "payroll",
  "stablecoin",
  "reserve",
  "settlement",
] as const;

export const RISK_TIERS = [0, 1, 2, 3] as const;

export const MOVEMENT_PROFILES: readonly MovementProfile[] = [
  {
    weight: 24,
    kind: "deposit_credit",
    side: "credit",
    bucket: "customer_deposits",
    rail: "ach",
    assets: ["USD"],
    minAmountMinor: 2_500_00,
    maxAmountMinor: 8_000_000_00,
    minLatencyMs: 140,
    maxLatencyMs: 1_400,
    normalStatus: "posted",
    pendingBps: 240,
    failedBps: 15,
    heldBps: 20,
  },
  {
    weight: 16,
    kind: "wire_debit",
    side: "debit",
    bucket: "settlement_cash",
    rail: "wire",
    assets: ["USD"],
    minAmountMinor: 25_000_00,
    maxAmountMinor: 22_000_000_00,
    minLatencyMs: 380,
    maxLatencyMs: 3_200,
    normalStatus: "posted",
    pendingBps: 420,
    failedBps: 35,
    heldBps: 25,
  },
  {
    weight: 14,
    kind: "ach_debit",
    side: "debit",
    bucket: "rail_clearing",
    rail: "ach",
    assets: ["USD"],
    minAmountMinor: 900_00,
    maxAmountMinor: 2_500_000_00,
    minLatencyMs: 500,
    maxLatencyMs: 6_500,
    normalStatus: "accepted",
    pendingBps: 900,
    failedBps: 80,
    heldBps: 40,
  },
  {
    weight: 12,
    kind: "instant_payment_credit",
    side: "credit",
    bucket: "customer_deposits",
    rail: "instant",
    assets: ["USD"],
    minAmountMinor: 250_00,
    maxAmountMinor: 750_000_00,
    minLatencyMs: 8,
    maxLatencyMs: 180,
    normalStatus: "settled",
    pendingBps: 70,
    failedBps: 20,
    heldBps: 10,
  },
  {
    weight: 12,
    kind: "stablecoin_credit",
    side: "credit",
    bucket: "stablecoin_treasury",
    rail: "stablecoin",
    assets: ["USDC", "USDT", "PYUSD", "EURC"],
    minAmountMinor: 5_000_00,
    maxAmountMinor: 14_000_000_00,
    minLatencyMs: 120,
    maxLatencyMs: 1_900,
    normalStatus: "settled",
    pendingBps: 280,
    failedBps: 25,
    heldBps: 55,
  },
  {
    weight: 10,
    kind: "stablecoin_debit",
    side: "debit",
    bucket: "stablecoin_treasury",
    rail: "stablecoin",
    assets: ["USDC", "USDT", "PYUSD", "EURC"],
    minAmountMinor: 5_000_00,
    maxAmountMinor: 12_000_000_00,
    minLatencyMs: 140,
    maxLatencyMs: 2_400,
    normalStatus: "settled",
    pendingBps: 340,
    failedBps: 35,
    heldBps: 70,
  },
  {
    weight: 5,
    kind: "fee_credit",
    side: "credit",
    bucket: "fee_income",
    rail: "card",
    assets: ["USD"],
    minAmountMinor: 25_00,
    maxAmountMinor: 25_000_00,
    minLatencyMs: 30,
    maxLatencyMs: 420,
    normalStatus: "posted",
    pendingBps: 60,
    failedBps: 5,
    heldBps: 0,
  },
  {
    weight: 2,
    kind: "reversal_credit",
    side: "credit",
    bucket: "customer_deposits",
    rail: "internal_ledger",
    assets: ["USD"],
    minAmountMinor: 500_00,
    maxAmountMinor: 600_000_00,
    minLatencyMs: 8,
    maxLatencyMs: 80,
    normalStatus: "posted",
    pendingBps: 20,
    failedBps: 0,
    heldBps: 0,
  },
  {
    weight: 3,
    kind: "reserve_transfer",
    side: "credit",
    bucket: "reserve_cash",
    rail: "internal_ledger",
    assets: ["USD"],
    minAmountMinor: 100_000_00,
    maxAmountMinor: 18_000_000_00,
    minLatencyMs: 4,
    maxLatencyMs: 40,
    normalStatus: "posted",
    pendingBps: 15,
    failedBps: 0,
    heldBps: 0,
  },
  {
    weight: 3,
    kind: "reserve_transfer",
    side: "debit",
    bucket: "reserve_cash",
    rail: "internal_ledger",
    assets: ["USD"],
    minAmountMinor: 100_000_00,
    maxAmountMinor: 18_000_000_00,
    minLatencyMs: 4,
    maxLatencyMs: 40,
    normalStatus: "posted",
    pendingBps: 15,
    failedBps: 0,
    heldBps: 0,
  },
  {
    weight: 1,
    kind: "exception_hold",
    side: "debit",
    bucket: "exception_queue",
    rail: "instant",
    assets: ["USD"],
    minAmountMinor: 10_000_00,
    maxAmountMinor: 900_000_00,
    minLatencyMs: 30,
    maxLatencyMs: 650,
    normalStatus: "held",
    pendingBps: 0,
    failedBps: 0,
    heldBps: 10_000,
  },
];

export const TOTAL_PROFILE_WEIGHT = MOVEMENT_PROFILES.reduce(
  (total, profile) => total + profile.weight,
  0,
);
