import {
  ASSETS,
  BALANCE_SHEET_BUCKETS,
  type BalanceSheetMovement,
  MOVEMENT_KINDS,
  MOVEMENT_SIDES,
  MOVEMENT_STATUSES,
  RAILS,
  type Rail,
  type StreamRate,
  STREAM_RATES,
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

export type RailHealthStatus = "nominal" | "degraded" | "incident";

export type RailHealthFrame = {
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

export type AggregateChartPointInput = {
  ts: number;
  eventCount: number;
  eventRate: number;
  p95LatencyMs: number;
  failureRate: number;
  exceptionQueueDepth: number;
  liquidityReserveMinor: bigint;
  creditMinor: bigint;
  debitMinor: bigint;
};

export type AggregateSnapshotInput = {
  seq: bigint;
  eventRate: number;
  cumulativeCreditsMinor: bigint;
  cumulativeDebitsMinor: bigint;
  liquidityReserveMinor: bigint;
  exceptionQueueDepth: number;
  railHealth: readonly RailHealthFrame[];
  chart: readonly AggregateChartPointInput[];
};

export type AggregateChartPointFrame = {
  ts: number;
  eventCount: number;
  eventRate: number;
  p95LatencyMs: number;
  failureRate: number;
  exceptionQueueDepth: number;
  liquidityReserveMinor: string;
  creditMinor: string;
  debitMinor: string;
};

export type AggregateSnapshotFrame = {
  channel: typeof StreamChannel.AggregateSnapshot;
  type: "ops.snapshot";
  seq: string;
  eventRate: number;
  cumulativeCreditsMinor: string;
  cumulativeDebitsMinor: string;
  liquidityReserveMinor: string;
  exceptionQueueDepth: number;
  railHealth: RailHealthFrame[];
  chart: AggregateChartPointFrame[];
};

export type StreamRateControlFrame = {
  type: "stream.rate.set";
  targetRate: StreamRate;
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

export function toAggregateSnapshotFrame(snapshot: AggregateSnapshotInput): AggregateSnapshotFrame {
  return {
    channel: StreamChannel.AggregateSnapshot,
    type: "ops.snapshot",
    seq: snapshot.seq.toString(),
    eventRate: snapshot.eventRate,
    cumulativeCreditsMinor: snapshot.cumulativeCreditsMinor.toString(),
    cumulativeDebitsMinor: snapshot.cumulativeDebitsMinor.toString(),
    liquidityReserveMinor: snapshot.liquidityReserveMinor.toString(),
    exceptionQueueDepth: snapshot.exceptionQueueDepth,
    railHealth: [...snapshot.railHealth],
    chart: snapshot.chart.map((point) => ({
      ts: point.ts,
      eventCount: point.eventCount,
      eventRate: point.eventRate,
      p95LatencyMs: point.p95LatencyMs,
      failureRate: point.failureRate,
      exceptionQueueDepth: point.exceptionQueueDepth,
      liquidityReserveMinor: point.liquidityReserveMinor.toString(),
      creditMinor: point.creditMinor.toString(),
      debitMinor: point.debitMinor.toString(),
    })),
  };
}

export function readAggregateSnapshotFrame(raw: string): AggregateSnapshotFrame {
  const parsed: unknown = JSON.parse(raw);

  assertAggregateSnapshotFrame(parsed);
  return parsed;
}

export function encodeStreamRateControlFrame(frame: StreamRateControlFrame): string {
  assertStreamRateControlFrame(frame);
  return JSON.stringify(frame);
}

export function readStreamRateControlFrame(raw: string): StreamRateControlFrame {
  const parsed: unknown = JSON.parse(raw);

  assertStreamRateControlFrame(parsed);
  return parsed;
}

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
    view.setUint8(offset, MOVEMENT_KINDS.indexOf(movement.kind));
    offset += 1;
    view.setUint8(offset, MOVEMENT_SIDES.indexOf(movement.side));
    offset += 1;
    view.setUint8(offset, BALANCE_SHEET_BUCKETS.indexOf(movement.bucket));
    offset += 1;
    view.setUint8(offset, RAILS.indexOf(movement.rail));
    offset += 1;
    view.setUint8(offset, ASSETS.indexOf(movement.asset));
    offset += 1;
    view.setUint32(offset, movement.customerId, STREAM_LITTLE_ENDIAN);
    offset += 4;
    view.setUint32(offset, movement.accountId, STREAM_LITTLE_ENDIAN);
    offset += 4;
    view.setBigInt64(offset, movement.amountMinor, STREAM_LITTLE_ENDIAN);
    offset += 8;
    view.setUint16(offset, movement.latencyMs, STREAM_LITTLE_ENDIAN);
    offset += 2;
    view.setUint8(offset, MOVEMENT_STATUSES.indexOf(movement.status));
    offset += 1;
    view.setUint8(offset, movement.riskTier);
    offset += 1;
    view.setUint16(offset, movement.flags, STREAM_LITTLE_ENDIAN);
    offset += 2;
  }

  return buffer;
}

export function decodeMovementBatch(source: ArrayBuffer | ArrayBufferView): MovementBatchFrame {
  const view =
    source instanceof ArrayBuffer
      ? new DataView(source)
      : new DataView(source.buffer, source.byteOffset, source.byteLength);

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
    const kindCode = view.getUint8(offset);
    const kind = MOVEMENT_KINDS[kindCode];
    if (kind === undefined) {
      throw new SettlementStreamDecodeError(`Invalid kind code ${kindCode}`, "invalid_enum_code");
    }
    offset += 1;
    const sideCode = view.getUint8(offset);
    const side = MOVEMENT_SIDES[sideCode];
    if (side === undefined) {
      throw new SettlementStreamDecodeError(`Invalid side code ${sideCode}`, "invalid_enum_code");
    }
    offset += 1;
    const bucketCode = view.getUint8(offset);
    const bucket = BALANCE_SHEET_BUCKETS[bucketCode];
    if (bucket === undefined) {
      throw new SettlementStreamDecodeError(
        `Invalid bucket code ${bucketCode}`,
        "invalid_enum_code",
      );
    }
    offset += 1;
    const railCode = view.getUint8(offset);
    const rail = RAILS[railCode];
    if (rail === undefined) {
      throw new SettlementStreamDecodeError(`Invalid rail code ${railCode}`, "invalid_enum_code");
    }
    offset += 1;
    const assetCode = view.getUint8(offset);
    const asset = ASSETS[assetCode];
    if (asset === undefined) {
      throw new SettlementStreamDecodeError(`Invalid asset code ${assetCode}`, "invalid_enum_code");
    }
    offset += 1;
    const customerId = view.getUint32(offset, STREAM_LITTLE_ENDIAN);
    offset += 4;
    const accountId = view.getUint32(offset, STREAM_LITTLE_ENDIAN);
    offset += 4;
    const amountMinor = view.getBigInt64(offset, STREAM_LITTLE_ENDIAN);
    offset += 8;
    const latencyMs = view.getUint16(offset, STREAM_LITTLE_ENDIAN);
    offset += 2;
    const statusCode = view.getUint8(offset);
    const status = MOVEMENT_STATUSES[statusCode];
    if (status === undefined) {
      throw new SettlementStreamDecodeError(
        `Invalid status code ${statusCode}`,
        "invalid_enum_code",
      );
    }
    offset += 1;
    const riskTier = view.getUint8(offset);
    offset += 1;

    if (riskTier !== 0 && riskTier !== 1 && riskTier !== 2 && riskTier !== 3) {
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

function assertAggregateSnapshotFrame(value: unknown): asserts value is AggregateSnapshotFrame {
  assertRecord(value, "Expected aggregate snapshot frame");

  if (value.type !== "ops.snapshot" || value.channel !== StreamChannel.AggregateSnapshot) {
    throw new Error("Unknown SettlementStream aggregate snapshot frame");
  }

  assertString(value.seq, "seq");
  assertNumber(value.eventRate, "eventRate");
  assertString(value.cumulativeCreditsMinor, "cumulativeCreditsMinor");
  assertString(value.cumulativeDebitsMinor, "cumulativeDebitsMinor");
  assertString(value.liquidityReserveMinor, "liquidityReserveMinor");
  assertNumber(value.exceptionQueueDepth, "exceptionQueueDepth");

  if (!Array.isArray(value.railHealth)) {
    throw new Error("railHealth must be an array");
  }

  for (const railHealth of value.railHealth) {
    assertRailHealthFrame(railHealth);
  }

  if (!Array.isArray(value.chart)) {
    throw new Error("chart must be an array");
  }

  for (const point of value.chart) {
    assertAggregateChartPointFrame(point);
  }
}

function assertRailHealthFrame(value: unknown): asserts value is RailHealthFrame {
  assertRecord(value, "Expected rail health frame");

  if (!isRail(value.rail)) {
    throw new Error(`Unsupported rail: ${String(value.rail)}`);
  }

  if (value.status !== "nominal" && value.status !== "degraded" && value.status !== "incident") {
    throw new Error(`Unsupported rail health status: ${String(value.status)}`);
  }

  assertNumber(value.eventCount, "eventCount");
  assertNumber(value.eventsPerSec, "eventsPerSec");
  assertNumber(value.failureRate, "failureRate");
  assertNumber(value.pendingCount, "pendingCount");
  assertNumber(value.heldCount, "heldCount");
  assertNumber(value.averageLatencyMs, "averageLatencyMs");
  assertNumber(value.p95LatencyMs, "p95LatencyMs");
  assertNumber(value.lastEventTs, "lastEventTs");
}

function assertAggregateChartPointFrame(value: unknown): asserts value is AggregateChartPointFrame {
  assertRecord(value, "Expected aggregate chart point frame");
  assertNumber(value.ts, "ts");
  assertNumber(value.eventCount, "eventCount");
  assertNumber(value.eventRate, "eventRate");
  assertNumber(value.p95LatencyMs, "p95LatencyMs");
  assertNumber(value.failureRate, "failureRate");
  assertNumber(value.exceptionQueueDepth, "exceptionQueueDepth");
  assertString(value.liquidityReserveMinor, "liquidityReserveMinor");
  assertString(value.creditMinor, "creditMinor");
  assertString(value.debitMinor, "debitMinor");
}

function assertStreamRateControlFrame(value: unknown): asserts value is StreamRateControlFrame {
  assertRecord(value, "Expected stream rate control frame");

  if (value.type !== "stream.rate.set") {
    throw new Error(`Unknown stream control frame: ${String(value.type)}`);
  }

  if (!isStreamRate(value.targetRate)) {
    throw new Error(`Unsupported stream rate: ${String(value.targetRate)}`);
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

function assertRecord(value: unknown, message: string): asserts value is Record<string, unknown> {
  if (typeof value !== "object" || value === null) {
    throw new Error(message);
  }
}

function assertNumber(value: unknown, label: string): asserts value is number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`${label} must be a finite number`);
  }
}

function assertString(value: unknown, label: string): asserts value is string {
  if (typeof value !== "string") {
    throw new Error(`${label} must be a string`);
  }
}

function isRail(value: unknown): value is Rail {
  return RAILS.some((rail) => rail === value);
}

function isStreamRate(value: unknown): value is StreamRate {
  return STREAM_RATES.some((streamRate) => streamRate === value);
}
