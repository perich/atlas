import { describe, expect, it } from "vitest";

import {
  decodeMovementBatch,
  encodeMovementBatch,
  encodeStreamRateControlFrame,
  MOVEMENT_RECORD_BYTES,
  readAggregateSnapshotFrame,
  readStreamRateControlFrame,
  SettlementStreamDecodeError,
  SETTLEMENT_STREAM_MAGIC,
  SETTLEMENT_STREAM_VERSION,
  STREAM_FRAME_HEADER_BYTES,
  STREAM_LITTLE_ENDIAN,
  StreamChannel,
  toAggregateSnapshotFrame,
  type AggregateSnapshotInput,
  type BalanceSheetMovement,
  type MovementBatchFrame,
  type StreamRateControlFrame,
} from "./index.js";

const SERVER_TS_MS = 1_778_600_000_000;

const baseMovement: BalanceSheetMovement = {
  seq: 10_000n,
  serverTs: 1_778_600_000_050,
  kind: "stablecoin_credit",
  side: "credit",
  bucket: "customer_deposits",
  rail: "stablecoin",
  asset: "USDC",
  customerId: 42,
  accountId: 314,
  amountMinor: 2_400_000_00n,
  latencyMs: 82,
  status: "settled",
  riskTier: 1,
  flags: 3,
};

const baseFrame: MovementBatchFrame = {
  fromSeq: baseMovement.seq,
  toSeq: baseMovement.seq,
  serverTsMs: SERVER_TS_MS,
  movements: [baseMovement],
};

describe("SettlementStream movement batch frames", () => {
  it("round trips movement batches through the fixed-width binary frame", () => {
    const frame: MovementBatchFrame = {
      fromSeq: 10_000n,
      toSeq: 10_002n,
      serverTsMs: SERVER_TS_MS,
      movements: [
        baseMovement,
        {
          ...baseMovement,
          seq: 10_001n,
          serverTs: 1_778_600_000_125,
          kind: "wire_debit",
          side: "debit",
          bucket: "settlement_cash",
          rail: "wire",
          asset: "USD",
          customerId: 43,
          accountId: 315,
          amountMinor: -850_000_00n,
          latencyMs: 1_204,
          status: "posted",
          riskTier: 2,
          flags: 0,
        },
        {
          ...baseMovement,
          seq: 10_002n,
          serverTs: 1_778_600_000_240,
          kind: "exception_hold",
          side: "debit",
          bucket: "exception_queue",
          rail: "instant",
          asset: "USD",
          customerId: 44,
          accountId: 316,
          amountMinor: 310_000_00n,
          latencyMs: 45,
          status: "held",
          riskTier: 3,
          flags: 0xffff,
        },
      ],
    };

    const encoded = encodeMovementBatch(frame);

    expect(encoded.byteLength).toBe(STREAM_FRAME_HEADER_BYTES + 3 * MOVEMENT_RECORD_BYTES);
    expect(decodeMovementBatch(encoded)).toEqual(frame);
  });

  it("round trips ArrayBufferView inputs", () => {
    const encoded = encodeMovementBatch(baseFrame);
    const padded = new Uint8Array(encoded.byteLength + 8);
    padded.set(new Uint8Array(encoded), 4);

    const decoded = decodeMovementBatch(padded.subarray(4, 4 + encoded.byteLength));

    expect(decoded.movements).toEqual([baseMovement]);
  });

  it("round trips empty movement batches", () => {
    const frame: MovementBatchFrame = {
      fromSeq: 0n,
      toSeq: 0n,
      serverTsMs: SERVER_TS_MS,
      movements: [],
    };

    expect(decodeMovementBatch(encodeMovementBatch(frame))).toEqual(frame);
  });

  it("rejects bad magic values", () => {
    const encoded = encodeMovementBatch(baseFrame);
    const view = new DataView(encoded);
    view.setUint32(0, SETTLEMENT_STREAM_MAGIC + 1, STREAM_LITTLE_ENDIAN);

    expectDecodeError(encoded, "bad_magic");
  });

  it("rejects unsupported versions", () => {
    const encoded = encodeMovementBatch(baseFrame);
    const view = new DataView(encoded);
    view.setUint16(4, SETTLEMENT_STREAM_VERSION + 1, STREAM_LITTLE_ENDIAN);

    expectDecodeError(encoded, "unsupported_version");
  });

  it("rejects unsupported channels for movement batch decoding", () => {
    const encoded = encodeMovementBatch(baseFrame);
    const view = new DataView(encoded);
    view.setUint16(6, StreamChannel.AggregateSnapshot, STREAM_LITTLE_ENDIAN);

    expectDecodeError(encoded, "unsupported_channel");
  });

  it("rejects truncated headers", () => {
    expectDecodeError(new ArrayBuffer(STREAM_FRAME_HEADER_BYTES - 1), "truncated_header");
  });

  it("rejects truncated records", () => {
    const encoded = encodeMovementBatch(baseFrame);

    expectDecodeError(encoded.slice(0, encoded.byteLength - 1), "truncated_record");
  });

  it("rejects invalid enum codes", () => {
    const encoded = encodeMovementBatch(baseFrame);
    const kindOffset = STREAM_FRAME_HEADER_BYTES + 6;
    new DataView(encoded).setUint8(kindOffset, 255);

    expectDecodeError(encoded, "invalid_enum_code");
  });

  it("rejects movement values that cannot fit the fixed-width record", () => {
    const movement = {
      ...baseMovement,
      latencyMs: 0x1_0000,
    };

    expect(() =>
      encodeMovementBatch({
        fromSeq: movement.seq,
        toSeq: movement.seq,
        serverTsMs: SERVER_TS_MS,
        movements: [movement],
      }),
    ).toThrow(RangeError);
  });
});

describe("SettlementStream aggregate snapshot frames", () => {
  const aggregateSnapshot: AggregateSnapshotInput = {
    seq: 42n,
    eventRate: 2_000,
    cumulativeCreditsMinor: 810_000_000n,
    cumulativeDebitsMinor: 200_000_000n,
    liquidityReserveMinor: 250_000_000_000n,
    exceptionQueueDepth: 3,
    railHealth: [
      {
        rail: "ach",
        status: "nominal",
        eventCount: 10,
        eventsPerSec: 2,
        failureRate: 0.01,
        pendingCount: 1,
        heldCount: 0,
        averageLatencyMs: 120,
        p95LatencyMs: 400,
        lastEventTs: SERVER_TS_MS,
      },
    ],
    chart: [
      {
        ts: SERVER_TS_MS,
        eventCount: 10,
        eventRate: 2_000,
        p95LatencyMs: 400,
        failureRate: 0.01,
        exceptionQueueDepth: 3,
        liquidityReserveMinor: 250_000_000_000n,
        creditMinor: 1_000n,
        debitMinor: 500n,
      },
    ],
  };

  it("maps simulator aggregate snapshots onto the JSON frame shape", () => {
    const frame = toAggregateSnapshotFrame(aggregateSnapshot);

    expect(frame).toMatchObject({
      channel: StreamChannel.AggregateSnapshot,
      type: "ops.snapshot",
      seq: "42",
      cumulativeCreditsMinor: "810000000",
      cumulativeDebitsMinor: "200000000",
      liquidityReserveMinor: "250000000000",
    });
    expect(frame.chart[0]?.creditMinor).toBe("1000");
    expect(readAggregateSnapshotFrame(JSON.stringify(frame))).toEqual(frame);
  });

  it("rejects unknown aggregate snapshot frames", () => {
    expect(() =>
      readAggregateSnapshotFrame(
        JSON.stringify({ channel: StreamChannel.ClientControl, type: "ops.snapshot" }),
      ),
    ).toThrow("Unknown SettlementStream aggregate snapshot frame");
  });
});

describe("SettlementStream stream rate control frames", () => {
  it("round trips client rate controls through the JSON frame", () => {
    const frame: StreamRateControlFrame = { type: "stream.rate.set", targetRate: 50 };

    expect(JSON.parse(encodeStreamRateControlFrame(frame))).toEqual(frame);
    expect(readStreamRateControlFrame(JSON.stringify(frame))).toEqual(frame);
  });

  it("rejects unsupported stream rate controls", () => {
    expect(() =>
      readStreamRateControlFrame(JSON.stringify({ type: "stream.rate.set", targetRate: 42 })),
    ).toThrow("Unsupported stream rate");
  });
});

function expectDecodeError(
  source: ArrayBuffer | ArrayBufferView,
  reason: SettlementStreamDecodeError["reason"],
) {
  let thrown: unknown;

  try {
    decodeMovementBatch(source);
  } catch (error) {
    thrown = error;
  }

  expect(thrown).toBeInstanceOf(SettlementStreamDecodeError);

  if (!(thrown instanceof SettlementStreamDecodeError)) {
    throw new Error("Expected SettlementStreamDecodeError");
  }

  expect(thrown.reason).toBe(reason);
}
