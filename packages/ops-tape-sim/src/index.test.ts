import { STREAM_RATES } from "@bankops/contracts";
import { describe, expect, it } from "vitest";

import {
  createOpsTapeSimulator,
  DEFAULT_ROLLING_WINDOW_TICKS,
  OPS_TAPE_TICK_HZ,
  type SimulatedBalanceSheetMovement,
} from "./index.js";

const BASE_TS_MS = 1_778_600_000_000;
const TICK_MS = 1_000 / OPS_TAPE_TICK_HZ;

describe("OpsTapeSimulator", () => {
  it("emits stable default-seeded movement sequences", () => {
    const first = createOpsTapeSimulator();
    const second = createOpsTapeSimulator();

    const firstBatches = Array.from({ length: 8 }, (_value, tick) =>
      first.nextBatch(2_000, tickTs(tick)),
    );
    const secondBatches = Array.from({ length: 8 }, (_value, tick) =>
      second.nextBatch(2_000, tickTs(tick)),
    );

    expect(firstBatches).toEqual(secondBatches);
  });

  it("hits supported target throughputs over a 60 Hz second", () => {
    for (const streamRate of STREAM_RATES) {
      const simulator = createOpsTapeSimulator();
      let movementCount = 0;

      for (let tick = 0; tick < OPS_TAPE_TICK_HZ; tick += 1) {
        movementCount += simulator.nextBatch(streamRate, tickTs(tick)).movements.length;
      }

      expect(movementCount).toBe(streamRate);
      expect(simulator.getAggregateSnapshot().eventRate).toBe(streamRate);
    }
  });

  it("generates plausible bank balance sheet movements", () => {
    const simulator = createOpsTapeSimulator();
    const batch = simulator.nextBatch(10_000, BASE_TS_MS);
    const movement = batch.movements[0];

    expect(batch.fromSeq).toBe(1n);
    expect(batch.toSeq).toBe(BigInt(batch.movements.length));
    expect(movement.traceId).toMatch(/^tr_/);
    expect(movement.customerName.length).toBeGreaterThan(0);
    expect(movement.accountLabel.length).toBeGreaterThan(0);
    expect(movement.customerId).toBeGreaterThanOrEqual(10_000);
    expect(movement.accountId).toBeGreaterThan(0);
    expect(movement.latencyMs).toBeGreaterThanOrEqual(0);
    expect(movement.flags).toBeGreaterThanOrEqual(0);
    expect(amountSignMatchesSide(movement)).toBe(true);
  });

  it("covers plausible modern bank rail and bucket lanes", () => {
    const simulator = createOpsTapeSimulator();
    const movements: SimulatedBalanceSheetMovement[] = [];

    for (let tick = 0; tick < OPS_TAPE_TICK_HZ; tick += 1) {
      movements.push(...simulator.nextBatch(10_000, tickTs(tick)).movements);
    }

    const pairs = new Set(movements.map(movementPair));

    expect(pairs.size).toBeGreaterThanOrEqual(24);
    expect([...pairs]).toEqual(
      expect.arrayContaining([
        "ach:customer_deposits",
        "ach:settlement_cash",
        "ach:exception_queue",
        "wire:customer_deposits",
        "wire:rail_clearing",
        "stablecoin:customer_deposits",
        "stablecoin:rail_clearing",
        "stablecoin:exception_queue",
        "internal_ledger:settlement_cash",
        "internal_ledger:stablecoin_treasury",
        "card:settlement_cash",
        "card:exception_queue",
      ]),
    );
  });

  it("keeps aggregate counters consistent with emitted movements", () => {
    const simulator = createOpsTapeSimulator();
    const movements: SimulatedBalanceSheetMovement[] = [];

    for (let tick = 0; tick < 90; tick += 1) {
      movements.push(...simulator.nextBatch(2_000, tickTs(tick)).movements);
    }

    const snapshot = simulator.getAggregateSnapshot();
    const credits = movements
      .filter((movement) => movement.side === "credit")
      .reduce((total, movement) => total + abs(movement.amountMinor), 0n);
    const debits = movements
      .filter((movement) => movement.side === "debit")
      .reduce((total, movement) => total + abs(movement.amountMinor), 0n);
    const railEvents = snapshot.railHealth.reduce((total, rail) => total + rail.eventCount, 0);

    expect(snapshot.seq).toBe(BigInt(movements.length));
    expect(snapshot.cumulativeCreditsMinor).toBe(credits);
    expect(snapshot.cumulativeDebitsMinor).toBe(debits);
    expect(snapshot.exceptionQueueDepth).toBeGreaterThanOrEqual(0);
    expect(snapshot.liquidityReserveMinor).toBeGreaterThanOrEqual(0n);
    expect(snapshot.chart).toHaveLength(DEFAULT_ROLLING_WINDOW_TICKS);
    expect(snapshot.railHealth).toHaveLength(6);
    expect(railEvents).toBe(movements.length);
  });
});

function tickTs(tick: number): number {
  return BASE_TS_MS + Math.round(tick * TICK_MS);
}

function abs(value: bigint): bigint {
  return value < 0n ? -value : value;
}

function movementPair(movement: SimulatedBalanceSheetMovement): string {
  return `${movement.rail}:${movement.bucket}`;
}

function amountSignMatchesSide(movement: SimulatedBalanceSheetMovement): boolean {
  return (
    (movement.side === "credit" && movement.amountMinor >= 0n) ||
    (movement.side === "debit" && movement.amountMinor <= 0n)
  );
}
