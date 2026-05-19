import {
  ASSETS,
  RAILS,
  RISK_TIERS,
  createBalanceSheetMovementFlags,
  isExceptionQueueMovement,
  movementMagnitudeMinor,
  type Asset,
  type BalanceSheetMovement,
  type MovementStatus,
  type OpsAggregateChartPointInput,
  type OpsAggregateSnapshotInput,
  type Rail,
  type RailHealthFrame,
  type RiskTier,
  type StreamRate,
} from "@bankops/contracts";

import {
  ACCOUNT_LABELS,
  CUSTOMER_NAMES,
  INDUSTRIES,
  type CustomerIndustry,
} from "./customer-profiles.js";
import {
  MOVEMENT_PROFILES,
  TOTAL_PROFILE_WEIGHT,
  type MovementProfile,
} from "./movement-profiles.js";

export const OPS_TAPE_TICK_HZ = 60;
export const DEFAULT_OPS_TAPE_SEED = 0xb40f_2026;
export const DEFAULT_CUSTOMER_COUNT = 96;
export const DEFAULT_LIQUIDITY_RESERVE_MINOR = 2_500_000_000_00n;
export const DEFAULT_ROLLING_WINDOW_TICKS = 60;

export type { CustomerIndustry };

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

export type RailHealthStatus = RailHealthFrame["status"];
export type RailHealthSnapshot = RailHealthFrame;
export type OpsTapeChartPoint = OpsAggregateChartPointInput;
export type OpsTapeAggregateSnapshot = OpsAggregateSnapshotInput;

type RandomState = {
  value: number;
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

export class OpsTapeSimulator {
  readonly customers: SyntheticCustomer[];

  private readonly random: RandomState = { value: DEFAULT_OPS_TAPE_SEED };
  private readonly railCounters = createRailCounters();
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
      flags: createBalanceSheetMovementFlags({
        amountMinor,
        rail: profile.rail,
        riskTier: customer.riskTier,
        status,
      }),
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
    const amountAbs = movementMagnitudeMinor(movement);

    if (movement.side === "credit") {
      this.cumulativeCreditsMinor += amountAbs;
    } else {
      this.cumulativeDebitsMinor += amountAbs;
    }

    if (movement.bucket === "reserve_cash") {
      const nextLiquidityReserve = this.liquidityReserveMinor + movement.amountMinor;
      this.liquidityReserveMinor = nextLiquidityReserve > 0n ? nextLiquidityReserve : 0n;
    }

    if (isExceptionQueueMovement(movement)) {
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
    const railCounts: Record<Rail, number> = {
      ach: 0,
      wire: 0,
      instant: 0,
      card: 0,
      internal_ledger: 0,
      stablecoin: 0,
    };
    const railLatencies: Record<Rail, number[]> = {
      ach: [],
      wire: [],
      instant: [],
      card: [],
      internal_ledger: [],
      stablecoin: [],
    };
    const latencies: number[] = [];
    let failures = 0;
    let creditMinor = 0n;
    let debitMinor = 0n;

    for (const movement of movements) {
      const amountAbs = movementMagnitudeMinor(movement);

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
      p95LatencyMs: percentile95(latencies),
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

function createRailCounters(): Record<Rail, RailCounters> {
  return {
    ach: createEmptyRailCounter(),
    wire: createEmptyRailCounter(),
    instant: createEmptyRailCounter(),
    card: createEmptyRailCounter(),
    internal_ledger: createEmptyRailCounter(),
    stablecoin: createEmptyRailCounter(),
  };
}

function createEmptyRailCounter(): RailCounters {
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
