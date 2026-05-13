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
export const DEFAULT_ACCOUNTS_PER_CUSTOMER = ASSETS.length;
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
  customerId: number;
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
  targetRate: StreamRate;
  tickIndex: number;
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

export type OpsTapeSimConfig = {
  seed: number;
  customerCount: number;
  accountsPerCustomer: number;
  tickHz: number;
  rollingWindowTicks: number;
  initialLiquidityReserveMinor: bigint;
};

export const DEFAULT_OPS_TAPE_SIM_CONFIG: OpsTapeSimConfig = {
  seed: DEFAULT_OPS_TAPE_SEED,
  customerCount: DEFAULT_CUSTOMER_COUNT,
  accountsPerCustomer: DEFAULT_ACCOUNTS_PER_CUSTOMER,
  tickHz: OPS_TAPE_TICK_HZ,
  rollingWindowTicks: DEFAULT_ROLLING_WINDOW_TICKS,
  initialLiquidityReserveMinor: DEFAULT_LIQUIDITY_RESERVE_MINOR,
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

  private readonly random: RandomState;
  private readonly config: OpsTapeSimConfig;
  private readonly railCounters = createRailCounters();
  private readonly bucketTotals = createBucketTotals();
  private readonly recentTicks: RecentTick[] = [];

  private nextSeq = 1n;
  private eventRemainder = 0;
  private tickIndex = 0;
  private cumulativeCreditsMinor = 0n;
  private cumulativeDebitsMinor = 0n;
  private liquidityReserveMinor: bigint;
  private exceptionQueueDepth = 0;

  constructor(config: OpsTapeSimConfig) {
    this.config = config;
    this.random = { value: config.seed >>> 0 };
    this.customers = createCustomers(config);
    this.liquidityReserveMinor = config.initialLiquidityReserveMinor;
  }

  nextBatch(targetRate: StreamRate, serverTsMs: number): OpsTapeBatch {
    const fromSeq = this.nextSeq;
    const movements: SimulatedBalanceSheetMovement[] = [];

    this.eventRemainder += targetRate;

    const eventCount = Math.floor(this.eventRemainder / this.config.tickHz);
    this.eventRemainder %= this.config.tickHz;

    for (let index = 0; index < eventCount; index += 1) {
      movements.push(this.createMovement(serverTsMs, index, eventCount));
    }

    const toSeq = movements.length === 0 ? fromSeq : this.nextSeq - 1n;

    for (const movement of movements) {
      this.recordMovement(movement);
    }

    this.recordTick(serverTsMs, movements);

    const batch = {
      fromSeq,
      toSeq,
      serverTsMs,
      targetRate,
      tickIndex: this.tickIndex,
      movements,
    };

    this.tickIndex += 1;

    return batch;
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

  private createMovement(
    serverTsMs: number,
    movementIndex: number,
    eventCount: number,
  ): SimulatedBalanceSheetMovement {
    const profile = this.pickProfile();
    const customer = this.customers[randomInt(this.random, 0, this.customers.length - 1)];
    const asset = profile.assets[randomInt(this.random, 0, profile.assets.length - 1)];
    const account = customer.accounts.find((candidate) => candidate.asset === asset);

    if (account === undefined) {
      throw new Error(`Missing ${asset} account for customer ${customer.id}`);
    }

    const unsignedAmount = BigInt(
      randomInt(this.random, profile.minAmountMinor, profile.maxAmountMinor),
    );
    const amountMinor = profile.side === "credit" ? unsignedAmount : -unsignedAmount;
    const status = this.pickStatus(profile);
    const seq = this.nextSeq;
    const serverTs =
      serverTsMs + Math.floor((movementIndex * 1_000) / this.config.tickHz / eventCount);

    this.nextSeq += 1n;

    return {
      seq,
      serverTs,
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

    if (this.recentTicks.length > this.config.rollingWindowTicks) {
      this.recentTicks.shift();
    }

    this.recentTicks[this.recentTicks.length - 1].eventRate = this.currentEventRate();
  }

  private currentEventRate(): number {
    const eventCount = this.recentTicks.reduce((total, tick) => total + tick.eventCount, 0);

    if (this.recentTicks.length === 0) {
      return 0;
    }

    return Math.round((eventCount * this.config.tickHz) / this.recentTicks.length);
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
          : Math.round((recentRailEvents * this.config.tickHz) / this.recentTicks.length),
      failureRate,
      pendingCount: counters.pendingCount,
      heldCount: counters.heldCount,
      averageLatencyMs,
      p95LatencyMs: counters.p95LatencyMs,
      lastEventTs: counters.lastEventTs,
    };
  }
}

export function createOpsTapeSimulator(config: OpsTapeSimConfig): OpsTapeSimulator {
  return new OpsTapeSimulator(config);
}

export function createDefaultOpsTapeSimulator(): OpsTapeSimulator {
  return new OpsTapeSimulator(DEFAULT_OPS_TAPE_SIM_CONFIG);
}

export function eventsPerTick(targetRate: StreamRate, tickHz = OPS_TAPE_TICK_HZ): number {
  return targetRate / tickHz;
}

function createCustomers(config: OpsTapeSimConfig): SyntheticCustomer[] {
  const random = { value: config.seed ^ 0x9e37_79b9 };
  const customers: SyntheticCustomer[] = [];

  for (let index = 0; index < config.customerCount; index += 1) {
    const id = 10_000 + index;
    const name = `${CUSTOMER_NAMES[index % CUSTOMER_NAMES.length]} ${Math.floor(index / CUSTOMER_NAMES.length) + 1}`;
    const industry = INDUSTRIES[index % INDUSTRIES.length];
    const riskTier = pickRiskTier(random);
    const accounts: SyntheticAccount[] = [];

    for (let accountIndex = 0; accountIndex < config.accountsPerCustomer; accountIndex += 1) {
      const asset = ASSETS[(index + accountIndex) % ASSETS.length];

      accounts.push({
        id: id * 10 + accountIndex,
        customerId: id,
        label: `${ACCOUNT_LABELS[accountIndex % ACCOUNT_LABELS.length]} ${asset}`,
        asset,
      });
    }

    if (!accounts.some((account) => account.asset === "USD")) {
      accounts[0] = {
        id: id * 10,
        customerId: id,
        label: "operating USD",
        asset: "USD",
      };
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

function pickRiskTier(random: RandomState): RiskTier {
  const value = randomInt(random, 0, 3);

  if (value === 0 || value === 1 || value === 2 || value === 3) {
    return value;
  }

  throw new Error("Risk tier generation produced an impossible value");
}
