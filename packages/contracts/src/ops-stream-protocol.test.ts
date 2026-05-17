import { describe, expect, it } from "vitest";

import {
  decodeOpsMovementBatch,
  decodeOpsStreamServerFrame,
  encodeOpsMovementBatch,
  encodeOpsStreamControlFrame,
  MOVEMENT_RECORD_BYTES,
  readOpsAggregateSnapshotFrame,
  readOpsStreamControlFrame,
  OpsStreamDecodeError,
  OPS_STREAM_MAGIC,
  OPS_STREAM_VERSION,
  STREAM_FRAME_HEADER_BYTES,
  STREAM_LITTLE_ENDIAN,
  OpsStreamChannel,
  toOpsAggregateSnapshotFrame,
  type OpsAggregateSnapshotInput,
  type BalanceSheetMovement,
  type OpsMovementBatchFrame,
  type OpsStreamRateControlFrame,
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

const baseFrame: OpsMovementBatchFrame = {
  fromSeq: baseMovement.seq,
  toSeq: baseMovement.seq,
  serverTsMs: SERVER_TS_MS,
  movements: [baseMovement],
};

describe("OpsStream movement batch frames", () => {
  it("round trips movement batches through the fixed-width binary frame", () => {
    const frame: OpsMovementBatchFrame = {
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

    const encoded = encodeOpsMovementBatch(frame);

    expect(encoded.byteLength).toBe(STREAM_FRAME_HEADER_BYTES + 3 * MOVEMENT_RECORD_BYTES);
    expect(decodeOpsMovementBatch(encoded)).toEqual(frame);
  });

  it("round trips ArrayBufferView inputs", () => {
    const encoded = encodeOpsMovementBatch(baseFrame);
    const padded = new Uint8Array(encoded.byteLength + 8);
    padded.set(new Uint8Array(encoded), 4);

    const decoded = decodeOpsMovementBatch(padded.subarray(4, 4 + encoded.byteLength));

    expect(decoded.movements).toEqual([baseMovement]);
  });

  it("round trips empty movement batches", () => {
    const frame: OpsMovementBatchFrame = {
      fromSeq: 0n,
      toSeq: 0n,
      serverTsMs: SERVER_TS_MS,
      movements: [],
    };

    expect(decodeOpsMovementBatch(encodeOpsMovementBatch(frame))).toEqual(frame);
  });

  it("rejects bad magic values", () => {
    const encoded = encodeOpsMovementBatch(baseFrame);
    const view = new DataView(encoded);
    view.setUint32(0, OPS_STREAM_MAGIC + 1, STREAM_LITTLE_ENDIAN);

    expectDecodeError(encoded, "bad_magic");
  });

  it("rejects unsupported versions", () => {
    const encoded = encodeOpsMovementBatch(baseFrame);
    const view = new DataView(encoded);
    view.setUint16(4, OPS_STREAM_VERSION + 1, STREAM_LITTLE_ENDIAN);

    expectDecodeError(encoded, "unsupported_version");
  });

  it("rejects unsupported channels for movement batch decoding", () => {
    const encoded = encodeOpsMovementBatch(baseFrame);
    const view = new DataView(encoded);
    view.setUint16(6, OpsStreamChannel.AggregateSnapshot, STREAM_LITTLE_ENDIAN);

    expectDecodeError(encoded, "unsupported_channel");
  });

  it("rejects truncated headers", () => {
    expectDecodeError(new ArrayBuffer(STREAM_FRAME_HEADER_BYTES - 1), "truncated_header");
  });

  it("rejects truncated records", () => {
    const encoded = encodeOpsMovementBatch(baseFrame);

    expectDecodeError(encoded.slice(0, encoded.byteLength - 1), "truncated_record");
  });

  it("rejects invalid enum codes", () => {
    const encoded = encodeOpsMovementBatch(baseFrame);
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
      encodeOpsMovementBatch({
        fromSeq: movement.seq,
        toSeq: movement.seq,
        serverTsMs: SERVER_TS_MS,
        movements: [movement],
      }),
    ).toThrow(RangeError);
  });
});

describe("OpsStream aggregate snapshot frames", () => {
  const aggregateSnapshot: OpsAggregateSnapshotInput = {
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
    const frame = toOpsAggregateSnapshotFrame(aggregateSnapshot);

    expect(frame).toMatchObject({
      channel: OpsStreamChannel.AggregateSnapshot,
      type: "ops.snapshot",
      seq: "42",
      cumulativeCreditsMinor: "810000000",
      cumulativeDebitsMinor: "200000000",
      liquidityReserveMinor: "250000000000",
    });
    expect(frame.chart[0]?.creditMinor).toBe("1000");
    expect(readOpsAggregateSnapshotFrame(JSON.stringify(frame))).toEqual(frame);
  });

  it("rejects unknown aggregate snapshot frames", () => {
    expect(() =>
      readOpsAggregateSnapshotFrame(
        JSON.stringify({ channel: OpsStreamChannel.ClientControl, type: "ops.snapshot" }),
      ),
    ).toThrow();
  });
});

describe("OpsStream stream rate control frames", () => {
  it("round trips client rate controls through the JSON frame", () => {
    const frame: OpsStreamRateControlFrame = { type: "stream.rate.set", targetRate: 50 };

    expect(JSON.parse(encodeOpsStreamControlFrame(frame))).toEqual(frame);
    expect(readOpsStreamControlFrame(JSON.stringify(frame))).toEqual(frame);
  });

  it("rejects unsupported stream rate controls", () => {
    expect(() =>
      readOpsStreamControlFrame(JSON.stringify({ type: "stream.rate.set", targetRate: 42 })),
    ).toThrow();
  });
});

describe("OpsStream server frame dispatch", () => {
  it("decodes warm JSON snapshots and hot binary batches behind one Interface", () => {
    const snapshot = toOpsAggregateSnapshotFrame({
      seq: 1n,
      eventRate: 50,
      cumulativeCreditsMinor: 0n,
      cumulativeDebitsMinor: 0n,
      liquidityReserveMinor: 1_000n,
      exceptionQueueDepth: 0,
      railHealth: [],
      chart: [],
    });

    expect(decodeOpsStreamServerFrame(JSON.stringify(snapshot))).toEqual({
      kind: "aggregate_snapshot",
      snapshot,
    });
    expect(decodeOpsStreamServerFrame(encodeOpsMovementBatch(baseFrame))).toEqual({
      kind: "movement_batch",
      batch: baseFrame,
    });
  });
});

function expectDecodeError(
  source: ArrayBuffer | ArrayBufferView,
  reason: OpsStreamDecodeError["reason"],
) {
  let thrown: unknown;

  try {
    decodeOpsMovementBatch(source);
  } catch (error) {
    thrown = error;
  }

  expect(thrown).toBeInstanceOf(OpsStreamDecodeError);

  if (!(thrown instanceof OpsStreamDecodeError)) {
    throw new Error("Expected OpsStreamDecodeError");
  }

  expect(thrown.reason).toBe(reason);
}
