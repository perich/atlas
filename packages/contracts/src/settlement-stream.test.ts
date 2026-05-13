import { describe, expect, it } from "vitest";

import {
  decodeMovementBatch,
  encodeMovementBatch,
  MOVEMENT_RECORD_BYTES,
  SettlementStreamDecodeError,
  SETTLEMENT_STREAM_MAGIC,
  SETTLEMENT_STREAM_VERSION,
  STREAM_FRAME_HEADER_BYTES,
  STREAM_LITTLE_ENDIAN,
  StreamChannel,
  type BalanceSheetMovement,
  type MovementBatchFrame,
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
