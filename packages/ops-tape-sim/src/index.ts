import {
  ASSETS,
  RAILS,
  type Asset,
  type BalanceSheetBucket,
  type BalanceSheetMovement,
  type MovementKind,
  type MovementSide,
  type MovementStatus,
  type Rail,
  type RiskTier,
  type StreamRate,
} from "@bankops/contracts";

export const OPS_TAPE_TICK_HZ = 60;
export const DEFAULT_OPS_TAPE_SEED = 0xb40f_2026;
export const DEFAULT_CUSTOMER_COUNT = 96;
export const DEFAULT_LIQUIDITY_RESERVE_MINOR = 2_500_000_000_00n;
export const DEFAULT_ROLLING_WINDOW_TICKS = 60;

export type CustomerIndustry =
  | "ai"
  | "defense"
  | "robotics"
  | "hardware"
  | "crypto"
  | "fintech"
  | "venture";

export type SyntheticAccount = {
  id: number;
  label: string;
  asset: Asset;
};

export type SyntheticCustomer = {
  id: number;
  name: string;
  industry: CustomerIndustry;
  riskTier: RiskTier;
  accounts: SyntheticAccount[];
};

export type SimulatedBalanceSheetMovement = BalanceSheetMovement & {
  traceId: string;
  customerName: string;
  accountLabel: string;
  industry: CustomerIndustry;
};

export type OpsTapeBatch = {
  fromSeq: bigint;
  toSeq: bigint;
  serverTsMs: number;
  movements: SimulatedBalanceSheetMovement[];
};

export type RailHealthStatus = "nominal" | "degraded" | "incident";

export type RailHealthSnapshot = {
  rail: Rail;
  status: RailHealthStatus;
  eventCount: number;
  eventsPerSec: number;
  failureRate: number;
  pendingCount: number;
  heldCount: number;
  averageLatencyMs: number;
  p95LatencyMs: number;
  lastEventTs: number;
};

export type OpsTapeChartPoint = {
  ts: number;
  eventCount: number;
  eventRate: number;
  latencyP95Ms: number;
  failureRate: number;
  exceptionQueueDepth: number;
  liquidityReserveMinor: bigint;
  creditMinor: bigint;
  debitMinor: bigint;
};

export type OpsTapeAggregateSnapshot = {
  seq: bigint;
  eventRate: number;
  cumulativeCreditsMinor: bigint;
  cumulativeDebitsMinor: bigint;
  liquidityReserveMinor: bigint;
  exceptionQueueDepth: number;
  bucketTotals: Record<BalanceSheetBucket, bigint>;
  railHealth: RailHealthSnapshot[];
  chart: OpsTapeChartPoint[];
};

type RandomState = {
  value: number;
};

type MovementProfile = {
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

type RailCounters = {
  eventCount: number;
  failedCount: number;
  pendingCount: number;
  heldCount: number;
  totalLatencyMs: number;
  p95LatencyMs: number;
  lastEventTs: number;
};

type RecentTick = OpsTapeChartPoint & {
  railCounts: Record<Rail, number>;
};

const INDUSTRIES: readonly CustomerIndustry[] = [
  "ai",
  "defense",
  "robotics",
  "hardware",
  "crypto",
  "fintech",
  "venture",
];

const CUSTOMER_NAMES = [
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

const ACCOUNT_LABELS = ["operating", "payroll", "stablecoin", "reserve", "settlement"] as const;
const RISK_TIERS = [0, 1, 2, 3] as const;

const MOVEMENT_PROFILES: readonly MovementProfile[] = [
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

const TOTAL_PROFILE_WEIGHT = MOVEMENT_PROFILES.reduce(
  (total, profile) => total + profile.weight,
  0,
);

export class OpsTapeSimulator {
  readonly customers: SyntheticCustomer[];

  private readonly random: RandomState = { value: DEFAULT_OPS_TAPE_SEED };
  private readonly railCounters = createRailCounters();
  private readonly bucketTotals = createBucketTotals();
  private readonly recentTicks: RecentTick[] = [];

  private nextSeq = 1n;
  private eventRemainder = 0;
  private cumulativeCreditsMinor = 0n;
  private cumulativeDebitsMinor = 0n;
  private liquidityReserveMinor = DEFAULT_LIQUIDITY_RESERVE_MINOR;
  private exceptionQueueDepth = 0;

  constructor() {
    this.customers = createCustomers();
  }

  nextBatch(targetRate: StreamRate, serverTsMs: number): OpsTapeBatch {
    const fromSeq = this.nextSeq;
    const movements: SimulatedBalanceSheetMovement[] = [];

    this.eventRemainder += targetRate;

    const eventCount = Math.floor(this.eventRemainder / OPS_TAPE_TICK_HZ);
    this.eventRemainder %= OPS_TAPE_TICK_HZ;

    for (let index = 0; index < eventCount; index += 1) {
      movements.push(this.createMovement(serverTsMs));
    }

    const toSeq = movements.length === 0 ? fromSeq : this.nextSeq - 1n;

    for (const movement of movements) {
      this.recordMovement(movement);
    }

    this.recordTick(serverTsMs, movements);

    return {
      fromSeq,
      toSeq,
      serverTsMs,
      movements,
    };
  }

  getAggregateSnapshot(): OpsTapeAggregateSnapshot {
    return {
      seq: this.nextSeq - 1n,
      eventRate: this.currentEventRate(),
      cumulativeCreditsMinor: this.cumulativeCreditsMinor,
      cumulativeDebitsMinor: this.cumulativeDebitsMinor,
      liquidityReserveMinor: this.liquidityReserveMinor,
      exceptionQueueDepth: this.exceptionQueueDepth,
      bucketTotals: { ...this.bucketTotals },
      railHealth: RAILS.map((rail) => this.getRailHealth(rail)),
      chart: this.recentTicks.map(({ railCounts: _railCounts, ...point }) => point),
    };
  }

  private createMovement(serverTsMs: number): SimulatedBalanceSheetMovement {
    const profile = this.pickProfile();
    const customer = this.customers[randomInt(this.random, 0, this.customers.length - 1)];
    const asset = profile.assets[randomInt(this.random, 0, profile.assets.length - 1)];
    const account = customer.accounts[ASSETS.indexOf(asset)];

    const unsignedAmount = BigInt(
      randomInt(this.random, profile.minAmountMinor, profile.maxAmountMinor),
    );
    const amountMinor = profile.side === "credit" ? unsignedAmount : -unsignedAmount;
    const status = this.pickStatus(profile);
    const seq = this.nextSeq;

    this.nextSeq += 1n;

    return {
      seq,
      serverTs: serverTsMs,
      kind: profile.kind,
      side: profile.side,
      bucket: profile.bucket,
      rail: profile.rail,
      asset,
      customerId: customer.id,
      accountId: account.id,
      amountMinor,
      latencyMs: randomInt(this.random, profile.minLatencyMs, profile.maxLatencyMs),
      status,
      riskTier: customer.riskTier,
      flags: movementFlags(profile.rail, status, customer.riskTier, unsignedAmount),
      traceId: traceId(seq, customer.id),
      customerName: customer.name,
      accountLabel: account.label,
      industry: customer.industry,
    };
  }

  private pickProfile(): MovementProfile {
    let remaining = randomInt(this.random, 1, TOTAL_PROFILE_WEIGHT);

    for (const profile of MOVEMENT_PROFILES) {
      remaining -= profile.weight;

      if (remaining <= 0) {
        return profile;
      }
    }

    return MOVEMENT_PROFILES[MOVEMENT_PROFILES.length - 1];
  }

  private pickStatus(profile: MovementProfile): MovementStatus {
    const roll = randomInt(this.random, 1, 10_000);

    if (roll <= profile.failedBps) {
      return "failed";
    }

    if (roll <= profile.failedBps + profile.heldBps) {
      return "held";
    }

    if (roll <= profile.failedBps + profile.heldBps + profile.pendingBps) {
      return "pending";
    }

    return profile.normalStatus;
  }

  private recordMovement(movement: SimulatedBalanceSheetMovement) {
    const amountAbs = movement.amountMinor < 0n ? -movement.amountMinor : movement.amountMinor;

    if (movement.side === "credit") {
      this.cumulativeCreditsMinor += amountAbs;
    } else {
      this.cumulativeDebitsMinor += amountAbs;
    }

    this.bucketTotals[movement.bucket] += movement.amountMinor;

    if (movement.bucket === "reserve_cash") {
      const nextLiquidityReserve = this.liquidityReserveMinor + movement.amountMinor;
      this.liquidityReserveMinor = nextLiquidityReserve > 0n ? nextLiquidityReserve : 0n;
    }

    if (
      movement.kind === "exception_hold" ||
      movement.status === "failed" ||
      movement.status === "held"
    ) {
      this.exceptionQueueDepth += 1;
    }

    if (movement.kind === "reversal_credit" && this.exceptionQueueDepth > 0) {
      this.exceptionQueueDepth -= 1;
    }

    const rail = this.railCounters[movement.rail];
    rail.eventCount += 1;
    rail.totalLatencyMs += movement.latencyMs;
    rail.lastEventTs = movement.serverTs;

    if (movement.status === "failed") {
      rail.failedCount += 1;
    }

    if (movement.status === "pending") {
      rail.pendingCount += 1;
    }

    if (movement.status === "held") {
      rail.heldCount += 1;
    }
  }

  private recordTick(serverTsMs: number, movements: SimulatedBalanceSheetMovement[]) {
    const railCounts = createRailCounts();
    const railLatencies = createRailLatencyBuckets();
    const latencies: number[] = [];
    let failures = 0;
    let creditMinor = 0n;
    let debitMinor = 0n;

    for (const movement of movements) {
      const amountAbs = movement.amountMinor < 0n ? -movement.amountMinor : movement.amountMinor;

      railCounts[movement.rail] += 1;
      railLatencies[movement.rail].push(movement.latencyMs);
      latencies.push(movement.latencyMs);

      if (movement.status === "failed") {
        failures += 1;
      }

      if (movement.side === "credit") {
        creditMinor += amountAbs;
      } else {
        debitMinor += amountAbs;
      }
    }

    for (const rail of RAILS) {
      const p95LatencyMs = percentile95(railLatencies[rail]);

      if (p95LatencyMs > 0) {
        this.railCounters[rail].p95LatencyMs = p95LatencyMs;
      }
    }

    this.recentTicks.push({
      ts: serverTsMs,
      eventCount: movements.length,
      eventRate: 0,
      latencyP95Ms: percentile95(latencies),
      failureRate: movements.length === 0 ? 0 : failures / movements.length,
      exceptionQueueDepth: this.exceptionQueueDepth,
      liquidityReserveMinor: this.liquidityReserveMinor,
      creditMinor,
      debitMinor,
      railCounts,
    });

    if (this.recentTicks.length > DEFAULT_ROLLING_WINDOW_TICKS) {
      this.recentTicks.shift();
    }

    this.recentTicks[this.recentTicks.length - 1].eventRate = this.currentEventRate();
  }

  private currentEventRate(): number {
    const eventCount = this.recentTicks.reduce((total, tick) => total + tick.eventCount, 0);

    if (this.recentTicks.length === 0) {
      return 0;
    }

    return Math.round((eventCount * OPS_TAPE_TICK_HZ) / this.recentTicks.length);
  }

  private getRailHealth(rail: Rail): RailHealthSnapshot {
    const counters = this.railCounters[rail];
    const recentRailEvents = this.recentTicks.reduce(
      (total, tick) => total + tick.railCounts[rail],
      0,
    );
    const failureRate = counters.eventCount === 0 ? 0 : counters.failedCount / counters.eventCount;
    const averageLatencyMs =
      counters.eventCount === 0 ? 0 : Math.round(counters.totalLatencyMs / counters.eventCount);
    const status =
      failureRate > 0.06 || counters.p95LatencyMs > 4_000
        ? "incident"
        : failureRate > 0.02 || counters.p95LatencyMs > 2_000
          ? "degraded"
          : "nominal";

    return {
      rail,
      status,
      eventCount: counters.eventCount,
      eventsPerSec:
        this.recentTicks.length === 0
          ? 0
          : Math.round((recentRailEvents * OPS_TAPE_TICK_HZ) / this.recentTicks.length),
      failureRate,
      pendingCount: counters.pendingCount,
      heldCount: counters.heldCount,
      averageLatencyMs,
      p95LatencyMs: counters.p95LatencyMs,
      lastEventTs: counters.lastEventTs,
    };
  }
}

export function createOpsTapeSimulator(): OpsTapeSimulator {
  return new OpsTapeSimulator();
}

function createCustomers(): SyntheticCustomer[] {
  const random = { value: DEFAULT_OPS_TAPE_SEED ^ 0x9e37_79b9 };
  const customers: SyntheticCustomer[] = [];

  for (let index = 0; index < DEFAULT_CUSTOMER_COUNT; index += 1) {
    const id = 10_000 + index;
    const name = `${CUSTOMER_NAMES[index % CUSTOMER_NAMES.length]} ${Math.floor(index / CUSTOMER_NAMES.length) + 1}`;
    const industry = INDUSTRIES[index % INDUSTRIES.length];
    const riskTier = RISK_TIERS[randomInt(random, 0, RISK_TIERS.length - 1)];
    const accounts: SyntheticAccount[] = [];

    for (let accountIndex = 0; accountIndex < ASSETS.length; accountIndex += 1) {
      accounts.push({
        id: id * 10 + accountIndex,
        label: `${ACCOUNT_LABELS[accountIndex % ACCOUNT_LABELS.length]} ${ASSETS[accountIndex]}`,
        asset: ASSETS[accountIndex],
      });
    }

    customers.push({
      id,
      name,
      industry,
      riskTier,
      accounts,
    });
  }

  return customers;
}

function nextRandom(random: RandomState): number {
  random.value = (1_664_525 * random.value + 1_013_904_223) >>> 0;
  return random.value / 0x1_0000_0000;
}

function randomInt(random: RandomState, min: number, max: number): number {
  return Math.floor(nextRandom(random) * (max - min + 1)) + min;
}

function movementFlags(
  rail: Rail,
  status: MovementStatus,
  riskTier: RiskTier,
  amountMinor: bigint,
): number {
  let flags = 0;

  if (status === "failed") {
    flags |= 1;
  }

  if (status === "held") {
    flags |= 2;
  }

  if (rail === "stablecoin") {
    flags |= 4;
  }

  if (amountMinor >= 1_000_000_00n) {
    flags |= 8;
  }

  if (riskTier === 3) {
    flags |= 16;
  }

  return flags;
}

function traceId(seq: bigint, customerId: number): string {
  return `tr_${seq.toString(36).padStart(8, "0")}_${customerId.toString(36)}`;
}

function percentile95(values: number[]): number {
  if (values.length === 0) {
    return 0;
  }

  const sorted = [...values].sort((left, right) => left - right);
  const index = Math.ceil(sorted.length * 0.95) - 1;
  return sorted[index];
}

function createBucketTotals(): Record<BalanceSheetBucket, bigint> {
  return {
    customer_deposits: 0n,
    settlement_cash: 0n,
    reserve_cash: 0n,
    rail_clearing: 0n,
    stablecoin_treasury: 0n,
    fee_income: 0n,
    exception_queue: 0n,
  };
}

function createRailCounters(): Record<Rail, RailCounters> {
  return {
    ach: createRailCounter(),
    wire: createRailCounter(),
    instant: createRailCounter(),
    card: createRailCounter(),
    internal_ledger: createRailCounter(),
    stablecoin: createRailCounter(),
  };
}

function createRailCounter(): RailCounters {
  return {
    eventCount: 0,
    failedCount: 0,
    pendingCount: 0,
    heldCount: 0,
    totalLatencyMs: 0,
    p95LatencyMs: 0,
    lastEventTs: 0,
  };
}

function createRailCounts(): Record<Rail, number> {
  return {
    ach: 0,
    wire: 0,
    instant: 0,
    card: 0,
    internal_ledger: 0,
    stablecoin: 0,
  };
}

function createRailLatencyBuckets(): Record<Rail, number[]> {
  return {
    ach: [],
    wire: [],
    instant: [],
    card: [],
    internal_ledger: [],
    stablecoin: [],
  };
}

export function isSupportedStreamRate(value: number): value is StreamRate {
  return value === 50 || value === 2_000 || value === 10_000;
}
