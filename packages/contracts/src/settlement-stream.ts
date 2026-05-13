import {
  ASSETS,
  BALANCE_SHEET_BUCKETS,
  type BalanceSheetMovement,
  MOVEMENT_KINDS,
  MOVEMENT_SIDES,
  MOVEMENT_STATUSES,
  RAILS,
  type RiskTier,
} from "./domain.js";

// Fixed-width binary frames keep the hot /ops stream cheap to parse in a worker.
export const SETTLEMENT_STREAM_MAGIC = 0x424f5053;
export const SETTLEMENT_STREAM_VERSION = 1;
export const STREAM_FRAME_HEADER_BYTES = 36;
export const MOVEMENT_RECORD_BYTES = 33;
export const STREAM_LITTLE_ENDIAN = true;

export const StreamChannel = {
  MovementBatch: 1,
  AggregateSnapshot: 2,
  Incident: 3,
  ClientControl: 4,
} as const;

export type StreamChannel = (typeof StreamChannel)[keyof typeof StreamChannel];

export type MovementBatchFrame = {
  fromSeq: bigint;
  toSeq: bigint;
  serverTsMs: number;
  movements: BalanceSheetMovement[];
};

// Machine-readable reasons let the worker surface bad frames without guesswork.
export class SettlementStreamDecodeError extends Error {
  constructor(
    message: string,
    readonly reason:
      | "bad_magic"
      | "unsupported_version"
      | "unsupported_channel"
      | "truncated_header"
      | "truncated_record"
      | "invalid_enum_code",
  ) {
    super(message);
    this.name = "SettlementStreamDecodeError";
  }
}

const MAX_U16 = 0xffff;
const MAX_U32 = 0xffffffff;
const MAX_U32_BIGINT = BigInt(MAX_U32);
const MIN_I64 = -(1n << 63n);
const MAX_I64 = (1n << 63n) - 1n;

// Enum order is part of the wire format. Append values or bump the version.
const movementKindCode = makeCodeMap(MOVEMENT_KINDS);
const movementSideCode = makeCodeMap(MOVEMENT_SIDES);
const bucketCode = makeCodeMap(BALANCE_SHEET_BUCKETS);
const railCode = makeCodeMap(RAILS);
const assetCode = makeCodeMap(ASSETS);
const movementStatusCode = makeCodeMap(MOVEMENT_STATUSES);

export function encodeMovementBatch(frame: MovementBatchFrame): ArrayBuffer {
  assertMovementBatchFrame(frame);

  const eventCount = frame.movements.length;
  const bytes = STREAM_FRAME_HEADER_BYTES + eventCount * MOVEMENT_RECORD_BYTES;
  const buffer = new ArrayBuffer(bytes);
  const view = new DataView(buffer);

  // Header fields apply to the whole batch; records store small deltas from them.
  view.setUint32(0, SETTLEMENT_STREAM_MAGIC, STREAM_LITTLE_ENDIAN);
  view.setUint16(4, SETTLEMENT_STREAM_VERSION, STREAM_LITTLE_ENDIAN);
  view.setUint16(6, StreamChannel.MovementBatch, STREAM_LITTLE_ENDIAN);
  view.setBigUint64(8, frame.fromSeq, STREAM_LITTLE_ENDIAN);
  view.setBigUint64(16, frame.toSeq, STREAM_LITTLE_ENDIAN);
  view.setFloat64(24, frame.serverTsMs, STREAM_LITTLE_ENDIAN);
  view.setUint32(32, eventCount, STREAM_LITTLE_ENDIAN);

  let offset = STREAM_FRAME_HEADER_BYTES;

  for (const movement of frame.movements) {
    // Deltas keep each movement record compact while preserving exact seq/time.
    const seqDelta = movement.seq - frame.fromSeq;
    const dtMs = movement.serverTs - frame.serverTsMs;

    assertBigUint32("seqDelta", seqDelta);
    assertUint("dtMs", dtMs, MAX_U16);
    assertUint("customerId", movement.customerId, MAX_U32);
    assertUint("accountId", movement.accountId, MAX_U32);
    assertInt64("amountMinor", movement.amountMinor);
    assertUint("latencyMs", movement.latencyMs, MAX_U16);
    assertUint("flags", movement.flags, MAX_U16);

    view.setUint32(offset, Number(seqDelta), STREAM_LITTLE_ENDIAN);
    offset += 4;
    view.setUint16(offset, dtMs, STREAM_LITTLE_ENDIAN);
    offset += 2;
    view.setUint8(offset, codeOf(movementKindCode, movement.kind));
    offset += 1;
    view.setUint8(offset, codeOf(movementSideCode, movement.side));
    offset += 1;
    view.setUint8(offset, codeOf(bucketCode, movement.bucket));
    offset += 1;
    view.setUint8(offset, codeOf(railCode, movement.rail));
    offset += 1;
    view.setUint8(offset, codeOf(assetCode, movement.asset));
    offset += 1;
    view.setUint32(offset, movement.customerId, STREAM_LITTLE_ENDIAN);
    offset += 4;
    view.setUint32(offset, movement.accountId, STREAM_LITTLE_ENDIAN);
    offset += 4;
    view.setBigInt64(offset, movement.amountMinor, STREAM_LITTLE_ENDIAN);
    offset += 8;
    view.setUint16(offset, movement.latencyMs, STREAM_LITTLE_ENDIAN);
    offset += 2;
    view.setUint8(offset, codeOf(movementStatusCode, movement.status));
    offset += 1;
    view.setUint8(offset, movement.riskTier);
    offset += 1;
    view.setUint16(offset, movement.flags, STREAM_LITTLE_ENDIAN);
    offset += 2;
  }

  return buffer;
}

export function decodeMovementBatch(source: ArrayBuffer | ArrayBufferView): MovementBatchFrame {
  const view = toDataView(source);

  if (view.byteLength < STREAM_FRAME_HEADER_BYTES) {
    throw new SettlementStreamDecodeError(
      "SettlementStream frame header is truncated",
      "truncated_header",
    );
  }

  const magic = view.getUint32(0, STREAM_LITTLE_ENDIAN);

  if (magic !== SETTLEMENT_STREAM_MAGIC) {
    throw new SettlementStreamDecodeError(
      "SettlementStream frame has an invalid magic value",
      "bad_magic",
    );
  }

  const version = view.getUint16(4, STREAM_LITTLE_ENDIAN);

  if (version !== SETTLEMENT_STREAM_VERSION) {
    throw new SettlementStreamDecodeError(
      `SettlementStream version ${version} is not supported`,
      "unsupported_version",
    );
  }

  const channel = view.getUint16(6, STREAM_LITTLE_ENDIAN);

  if (channel !== StreamChannel.MovementBatch) {
    throw new SettlementStreamDecodeError(
      `SettlementStream channel ${channel} is not a movement batch`,
      "unsupported_channel",
    );
  }

  const fromSeq = view.getBigUint64(8, STREAM_LITTLE_ENDIAN);
  const toSeq = view.getBigUint64(16, STREAM_LITTLE_ENDIAN);
  const serverTsMs = view.getFloat64(24, STREAM_LITTLE_ENDIAN);
  const eventCount = view.getUint32(32, STREAM_LITTLE_ENDIAN);
  const expectedBytes = STREAM_FRAME_HEADER_BYTES + eventCount * MOVEMENT_RECORD_BYTES;

  if (view.byteLength < expectedBytes) {
    throw new SettlementStreamDecodeError(
      "SettlementStream movement records are truncated",
      "truncated_record",
    );
  }

  const movements: BalanceSheetMovement[] = [];
  let offset = STREAM_FRAME_HEADER_BYTES;

  for (let index = 0; index < eventCount; index += 1) {
    const seqDelta = view.getUint32(offset, STREAM_LITTLE_ENDIAN);
    offset += 4;
    const dtMs = view.getUint16(offset, STREAM_LITTLE_ENDIAN);
    offset += 2;
    const kind = readCode(MOVEMENT_KINDS, view.getUint8(offset), "kind");
    offset += 1;
    const side = readCode(MOVEMENT_SIDES, view.getUint8(offset), "side");
    offset += 1;
    const bucket = readCode(BALANCE_SHEET_BUCKETS, view.getUint8(offset), "bucket");
    offset += 1;
    const rail = readCode(RAILS, view.getUint8(offset), "rail");
    offset += 1;
    const asset = readCode(ASSETS, view.getUint8(offset), "asset");
    offset += 1;
    const customerId = view.getUint32(offset, STREAM_LITTLE_ENDIAN);
    offset += 4;
    const accountId = view.getUint32(offset, STREAM_LITTLE_ENDIAN);
    offset += 4;
    const amountMinor = view.getBigInt64(offset, STREAM_LITTLE_ENDIAN);
    offset += 8;
    const latencyMs = view.getUint16(offset, STREAM_LITTLE_ENDIAN);
    offset += 2;
    const status = readCode(MOVEMENT_STATUSES, view.getUint8(offset), "status");
    offset += 1;
    const riskTier = view.getUint8(offset);
    offset += 1;

    if (!isRiskTier(riskTier)) {
      throw new SettlementStreamDecodeError(
        `Invalid riskTier code ${riskTier}`,
        "invalid_enum_code",
      );
    }

    const flags = view.getUint16(offset, STREAM_LITTLE_ENDIAN);
    offset += 2;

    movements.push({
      seq: fromSeq + BigInt(seqDelta),
      serverTs: serverTsMs + dtMs,
      kind,
      side,
      bucket,
      rail,
      asset,
      customerId,
      accountId,
      amountMinor,
      latencyMs,
      status,
      riskTier,
      flags,
    });
  }

  return {
    fromSeq,
    toSeq,
    serverTsMs,
    movements,
  };
}

function makeCodeMap<const T extends readonly string[]>(values: T): ReadonlyMap<T[number], number> {
  return new Map(values.map((value, index) => [value, index]));
}

function codeOf<T extends string>(codes: ReadonlyMap<T, number>, value: T): number {
  const code = codes.get(value);

  if (code === undefined) {
    throw new RangeError(`Missing stream code for ${value}`);
  }

  return code;
}

function readCode<const T extends readonly string[]>(
  values: T,
  code: number,
  label: string,
): T[number] {
  const value = values[code];

  if (value === undefined) {
    throw new SettlementStreamDecodeError(`Invalid ${label} code ${code}`, "invalid_enum_code");
  }

  return value;
}

function toDataView(source: ArrayBuffer | ArrayBufferView): DataView {
  if (source instanceof ArrayBuffer) {
    return new DataView(source);
  }

  // WebSocket/worker code may pass sliced typed arrays, so preserve view bounds.
  return new DataView(source.buffer, source.byteOffset, source.byteLength);
}

function assertMovementBatchFrame(frame: MovementBatchFrame) {
  if (frame.fromSeq < 0n || frame.toSeq < frame.fromSeq) {
    throw new RangeError("Movement batch sequence range is invalid");
  }

  if (!Number.isFinite(frame.serverTsMs)) {
    throw new RangeError("Movement batch serverTsMs must be finite");
  }

  if (frame.movements.length > MAX_U32) {
    throw new RangeError("Movement batch event count exceeds uint32 range");
  }

  for (const movement of frame.movements) {
    if (movement.seq < frame.fromSeq || movement.seq > frame.toSeq) {
      throw new RangeError("Movement sequence falls outside the batch range");
    }
  }
}

function assertUint(label: string, value: number, max: number) {
  if (!Number.isInteger(value) || value < 0 || value > max) {
    throw new RangeError(`${label} must be an integer between 0 and ${max}`);
  }
}

function assertBigUint32(label: string, value: bigint) {
  if (value < 0n || value > MAX_U32_BIGINT) {
    throw new RangeError(`${label} must fit in an unsigned 32-bit integer`);
  }
}

function assertInt64(label: string, value: bigint) {
  if (value < MIN_I64 || value > MAX_I64) {
    throw new RangeError(`${label} must fit in a signed 64-bit integer`);
  }
}

function isRiskTier(value: number): value is RiskTier {
  return value === 0 || value === 1 || value === 2 || value === 3;
}
