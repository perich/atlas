import { z } from "zod";

import {
  ASSETS,
  BALANCE_SHEET_BUCKETS,
  type BalanceSheetMovement,
  MOVEMENT_KINDS,
  MOVEMENT_SIDES,
  MOVEMENT_STATUSES,
  RAILS,
  railSchema,
  riskTierSchema,
  streamRateSchema,
} from "./domain.js";

// Fixed-width binary frames keep the hot /ops stream cheap to parse in a worker.
export const OPS_STREAM_MAGIC = 0x424f5053;
export const OPS_STREAM_VERSION = 1;
export const STREAM_FRAME_HEADER_BYTES = 36;
export const MOVEMENT_RECORD_BYTES = 33;
export const STREAM_LITTLE_ENDIAN = true;

export const OpsStreamChannel = {
  MovementBatch: 1,
  AggregateSnapshot: 2,
  Incident: 3,
  ClientControl: 4,
} as const;

export type OpsStreamChannel = (typeof OpsStreamChannel)[keyof typeof OpsStreamChannel];

export type OpsMovementBatchFrame = {
  fromSeq: bigint;
  toSeq: bigint;
  serverTsMs: number;
  movements: BalanceSheetMovement[];
};

const finiteNumberSchema = z.number().finite();

export const railHealthStatusSchema = z.enum(["nominal", "degraded", "incident"]);

export const railHealthFrameSchema = z.object({
  rail: railSchema,
  status: railHealthStatusSchema,
  eventCount: finiteNumberSchema,
  eventsPerSec: finiteNumberSchema,
  failureRate: finiteNumberSchema,
  pendingCount: finiteNumberSchema,
  heldCount: finiteNumberSchema,
  averageLatencyMs: finiteNumberSchema,
  p95LatencyMs: finiteNumberSchema,
  lastEventTs: finiteNumberSchema,
});

export const aggregateChartPointInputSchema = z.object({
  ts: finiteNumberSchema,
  eventCount: finiteNumberSchema,
  eventRate: finiteNumberSchema,
  p95LatencyMs: finiteNumberSchema,
  failureRate: finiteNumberSchema,
  exceptionQueueDepth: finiteNumberSchema,
  liquidityReserveMinor: z.bigint(),
  creditMinor: z.bigint(),
  debitMinor: z.bigint(),
});

export const aggregateSnapshotInputSchema = z.object({
  seq: z.bigint(),
  eventRate: finiteNumberSchema,
  cumulativeCreditsMinor: z.bigint(),
  cumulativeDebitsMinor: z.bigint(),
  liquidityReserveMinor: z.bigint(),
  exceptionQueueDepth: finiteNumberSchema,
  railHealth: z.array(railHealthFrameSchema),
  chart: z.array(aggregateChartPointInputSchema),
});

export const aggregateChartPointFrameSchema = z.object({
  ts: finiteNumberSchema,
  eventCount: finiteNumberSchema,
  eventRate: finiteNumberSchema,
  p95LatencyMs: finiteNumberSchema,
  failureRate: finiteNumberSchema,
  exceptionQueueDepth: finiteNumberSchema,
  liquidityReserveMinor: z.string(),
  creditMinor: z.string(),
  debitMinor: z.string(),
});

export const aggregateSnapshotFrameSchema = z.object({
  channel: z.literal(OpsStreamChannel.AggregateSnapshot),
  type: z.literal("ops.snapshot"),
  seq: z.string(),
  eventRate: finiteNumberSchema,
  cumulativeCreditsMinor: z.string(),
  cumulativeDebitsMinor: z.string(),
  liquidityReserveMinor: z.string(),
  exceptionQueueDepth: finiteNumberSchema,
  railHealth: z.array(railHealthFrameSchema),
  chart: z.array(aggregateChartPointFrameSchema),
});

export const streamRateControlFrameSchema = z.object({
  type: z.literal("stream.rate.set"),
  targetRate: streamRateSchema,
});

export type RailHealthStatus = z.infer<typeof railHealthStatusSchema>;
export type RailHealthFrame = z.infer<typeof railHealthFrameSchema>;
export type OpsAggregateChartPointInput = z.infer<typeof aggregateChartPointInputSchema>;
export type OpsAggregateSnapshotInput = z.infer<typeof aggregateSnapshotInputSchema>;
export type OpsAggregateChartPointFrame = z.infer<typeof aggregateChartPointFrameSchema>;
export type OpsAggregateSnapshotFrame = z.infer<typeof aggregateSnapshotFrameSchema>;
export type OpsStreamRateControlFrame = z.infer<typeof streamRateControlFrameSchema>;
export type OpsStreamServerFrame =
  | { kind: "movement_batch"; batch: OpsMovementBatchFrame }
  | { kind: "aggregate_snapshot"; snapshot: OpsAggregateSnapshotFrame };

// Machine-readable reasons let the worker surface bad frames without guesswork.
export class OpsStreamDecodeError extends Error {
  constructor(
    message: string,
    readonly reason:
      | "bad_magic"
      | "unsupported_version"
      | "unsupported_channel"
      | "unsupported_payload"
      | "truncated_header"
      | "truncated_record"
      | "invalid_enum_code",
  ) {
    super(message);
    this.name = "OpsStreamDecodeError";
  }
}

const MAX_U16 = 0xffff;
const MAX_U32 = 0xffffffff;
const MAX_U32_BIGINT = BigInt(MAX_U32);
const MIN_I64 = -(1n << 63n);
const MAX_I64 = (1n << 63n) - 1n;
const nonnegativeBigIntSchema = z.bigint().nonnegative();
const uint16Schema = z.int().nonnegative().max(MAX_U16);
const uint32Schema = z.int().nonnegative().max(MAX_U32);
const uint32BigIntSchema = z.bigint().nonnegative().max(MAX_U32_BIGINT);
const int64Schema = z.bigint().min(MIN_I64).max(MAX_I64);

export function toOpsAggregateSnapshotFrame(
  snapshot: OpsAggregateSnapshotInput,
): OpsAggregateSnapshotFrame {
  const parsed = aggregateSnapshotInputSchema.parse(snapshot);

  return {
    channel: OpsStreamChannel.AggregateSnapshot,
    type: "ops.snapshot",
    seq: parsed.seq.toString(),
    eventRate: parsed.eventRate,
    cumulativeCreditsMinor: parsed.cumulativeCreditsMinor.toString(),
    cumulativeDebitsMinor: parsed.cumulativeDebitsMinor.toString(),
    liquidityReserveMinor: parsed.liquidityReserveMinor.toString(),
    exceptionQueueDepth: parsed.exceptionQueueDepth,
    railHealth: parsed.railHealth,
    chart: parsed.chart.map((point) => ({
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

export function readOpsAggregateSnapshotFrame(raw: string): OpsAggregateSnapshotFrame {
  return aggregateSnapshotFrameSchema.parse(JSON.parse(raw));
}

export function encodeOpsStreamControlFrame(frame: OpsStreamRateControlFrame): string {
  return JSON.stringify(streamRateControlFrameSchema.parse(frame));
}

export function readOpsStreamControlFrame(raw: string): OpsStreamRateControlFrame {
  return streamRateControlFrameSchema.parse(JSON.parse(raw));
}

export function decodeOpsStreamServerFrame(
  payload: string | ArrayBuffer | ArrayBufferView,
): OpsStreamServerFrame {
  if (typeof payload === "string") {
    return {
      kind: "aggregate_snapshot",
      snapshot: readOpsAggregateSnapshotFrame(payload),
    };
  }

  if (payload instanceof ArrayBuffer || ArrayBuffer.isView(payload)) {
    return {
      kind: "movement_batch",
      batch: decodeOpsMovementBatch(payload),
    };
  }

  throw new OpsStreamDecodeError("OpsStream payload type is not supported", "unsupported_payload");
}

export function encodeOpsMovementBatch(frame: OpsMovementBatchFrame): ArrayBuffer {
  const parsedFrame = parseOpsMovementBatchFrame(frame);

  const eventCount = parsedFrame.movements.length;
  const bytes = STREAM_FRAME_HEADER_BYTES + eventCount * MOVEMENT_RECORD_BYTES;
  const buffer = new ArrayBuffer(bytes);
  const view = new DataView(buffer);

  // Header fields apply to the whole batch; records store small deltas from them.
  view.setUint32(0, OPS_STREAM_MAGIC, STREAM_LITTLE_ENDIAN);
  view.setUint16(4, OPS_STREAM_VERSION, STREAM_LITTLE_ENDIAN);
  view.setUint16(6, OpsStreamChannel.MovementBatch, STREAM_LITTLE_ENDIAN);
  view.setBigUint64(8, parsedFrame.fromSeq, STREAM_LITTLE_ENDIAN);
  view.setBigUint64(16, parsedFrame.toSeq, STREAM_LITTLE_ENDIAN);
  view.setFloat64(24, parsedFrame.serverTsMs, STREAM_LITTLE_ENDIAN);
  view.setUint32(32, eventCount, STREAM_LITTLE_ENDIAN);

  let offset = STREAM_FRAME_HEADER_BYTES;

  for (const movement of parsedFrame.movements) {
    // Deltas keep each movement record compact while preserving exact seq/time.
    const seqDelta = parseRange(
      uint32BigIntSchema,
      movement.seq - parsedFrame.fromSeq,
      "seqDelta must fit in an unsigned 32-bit integer",
    );
    const dtMs = parseRange(
      uint16Schema,
      movement.serverTs - parsedFrame.serverTsMs,
      `dtMs must be an integer between 0 and ${MAX_U16}`,
    );
    const customerId = parseRange(
      uint32Schema,
      movement.customerId,
      `customerId must be an integer between 0 and ${MAX_U32}`,
    );
    const accountId = parseRange(
      uint32Schema,
      movement.accountId,
      `accountId must be an integer between 0 and ${MAX_U32}`,
    );
    const amountMinor = parseRange(
      int64Schema,
      movement.amountMinor,
      "amountMinor must fit in a signed 64-bit integer",
    );
    const latencyMs = parseRange(
      uint16Schema,
      movement.latencyMs,
      `latencyMs must be an integer between 0 and ${MAX_U16}`,
    );
    const flags = parseRange(
      uint16Schema,
      movement.flags,
      `flags must be an integer between 0 and ${MAX_U16}`,
    );

    view.setUint32(offset, Number(seqDelta), STREAM_LITTLE_ENDIAN);
    offset += 4;
    view.setUint16(offset, dtMs, STREAM_LITTLE_ENDIAN);
    offset += 2;
    view.setUint8(offset, enumCode(MOVEMENT_KINDS, movement.kind, "kind"));
    offset += 1;
    view.setUint8(offset, enumCode(MOVEMENT_SIDES, movement.side, "side"));
    offset += 1;
    view.setUint8(offset, enumCode(BALANCE_SHEET_BUCKETS, movement.bucket, "bucket"));
    offset += 1;
    view.setUint8(offset, enumCode(RAILS, movement.rail, "rail"));
    offset += 1;
    view.setUint8(offset, enumCode(ASSETS, movement.asset, "asset"));
    offset += 1;
    view.setUint32(offset, customerId, STREAM_LITTLE_ENDIAN);
    offset += 4;
    view.setUint32(offset, accountId, STREAM_LITTLE_ENDIAN);
    offset += 4;
    view.setBigInt64(offset, amountMinor, STREAM_LITTLE_ENDIAN);
    offset += 8;
    view.setUint16(offset, latencyMs, STREAM_LITTLE_ENDIAN);
    offset += 2;
    view.setUint8(offset, enumCode(MOVEMENT_STATUSES, movement.status, "status"));
    offset += 1;
    view.setUint8(
      offset,
      parseRange(riskTierSchema, movement.riskTier, "riskTier must be 0, 1, 2, or 3"),
    );
    offset += 1;
    view.setUint16(offset, flags, STREAM_LITTLE_ENDIAN);
    offset += 2;
  }

  return buffer;
}

export function decodeOpsMovementBatch(
  source: ArrayBuffer | ArrayBufferView,
): OpsMovementBatchFrame {
  const view =
    source instanceof ArrayBuffer
      ? new DataView(source)
      : new DataView(source.buffer, source.byteOffset, source.byteLength);

  if (view.byteLength < STREAM_FRAME_HEADER_BYTES) {
    throw new OpsStreamDecodeError("OpsStream frame header is truncated", "truncated_header");
  }

  const magic = view.getUint32(0, STREAM_LITTLE_ENDIAN);

  if (magic !== OPS_STREAM_MAGIC) {
    throw new OpsStreamDecodeError("OpsStream frame has an invalid magic value", "bad_magic");
  }

  const version = view.getUint16(4, STREAM_LITTLE_ENDIAN);

  if (version !== OPS_STREAM_VERSION) {
    throw new OpsStreamDecodeError(
      `OpsStream version ${version} is not supported`,
      "unsupported_version",
    );
  }

  const channel = view.getUint16(6, STREAM_LITTLE_ENDIAN);

  if (channel !== OpsStreamChannel.MovementBatch) {
    throw new OpsStreamDecodeError(
      `OpsStream channel ${channel} is not a movement batch`,
      "unsupported_channel",
    );
  }

  const fromSeq = view.getBigUint64(8, STREAM_LITTLE_ENDIAN);
  const toSeq = view.getBigUint64(16, STREAM_LITTLE_ENDIAN);
  const serverTsMs = view.getFloat64(24, STREAM_LITTLE_ENDIAN);
  const eventCount = view.getUint32(32, STREAM_LITTLE_ENDIAN);
  const expectedBytes = STREAM_FRAME_HEADER_BYTES + eventCount * MOVEMENT_RECORD_BYTES;

  if (view.byteLength < expectedBytes) {
    throw new OpsStreamDecodeError("OpsStream movement records are truncated", "truncated_record");
  }

  const movements: BalanceSheetMovement[] = [];
  let offset = STREAM_FRAME_HEADER_BYTES;

  for (let index = 0; index < eventCount; index += 1) {
    const seqDelta = view.getUint32(offset, STREAM_LITTLE_ENDIAN);
    offset += 4;
    const dtMs = view.getUint16(offset, STREAM_LITTLE_ENDIAN);
    offset += 2;
    const kind = readEnumCode(MOVEMENT_KINDS, view.getUint8(offset), "kind");
    offset += 1;
    const side = readEnumCode(MOVEMENT_SIDES, view.getUint8(offset), "side");
    offset += 1;
    const bucket = readEnumCode(BALANCE_SHEET_BUCKETS, view.getUint8(offset), "bucket");
    offset += 1;
    const rail = readEnumCode(RAILS, view.getUint8(offset), "rail");
    offset += 1;
    const asset = readEnumCode(ASSETS, view.getUint8(offset), "asset");
    offset += 1;
    const customerId = view.getUint32(offset, STREAM_LITTLE_ENDIAN);
    offset += 4;
    const accountId = view.getUint32(offset, STREAM_LITTLE_ENDIAN);
    offset += 4;
    const amountMinor = view.getBigInt64(offset, STREAM_LITTLE_ENDIAN);
    offset += 8;
    const latencyMs = view.getUint16(offset, STREAM_LITTLE_ENDIAN);
    offset += 2;
    const status = readEnumCode(MOVEMENT_STATUSES, view.getUint8(offset), "status");
    offset += 1;
    const riskTier = readRiskTierCode(view.getUint8(offset));
    offset += 1;

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

function parseOpsMovementBatchFrame(frame: OpsMovementBatchFrame): OpsMovementBatchFrame {
  if (!nonnegativeBigIntSchema.safeParse(frame.fromSeq).success || frame.toSeq < frame.fromSeq) {
    throw new RangeError("Movement batch sequence range is invalid");
  }

  if (!finiteNumberSchema.safeParse(frame.serverTsMs).success) {
    throw new RangeError("Movement batch serverTsMs must be finite");
  }

  if (!uint32Schema.safeParse(frame.movements.length).success) {
    throw new RangeError("Movement batch event count exceeds uint32 range");
  }

  for (const movement of frame.movements) {
    if (movement.seq < frame.fromSeq || movement.seq > frame.toSeq) {
      throw new RangeError("Movement sequence falls outside the batch range");
    }
  }

  return frame;
}

function parseRange<T>(schema: z.ZodType<T>, value: unknown, message: string): T {
  const result = schema.safeParse(value);

  if (!result.success) {
    throw new RangeError(message);
  }

  return result.data;
}

function enumCode(values: readonly string[], value: string, name: string): number {
  const code = values.indexOf(value);

  if (code === -1) {
    throw new RangeError(`${name} must be one of: ${values.join(", ")}`);
  }

  return code;
}

function readRiskTierCode(code: number): BalanceSheetMovement["riskTier"] {
  const result = riskTierSchema.safeParse(code);

  if (!result.success) {
    throw new OpsStreamDecodeError(`Invalid riskTier code ${code}`, "invalid_enum_code");
  }

  return result.data;
}

function readEnumCode<const T extends readonly string[]>(
  values: T,
  code: number,
  name: string,
): T[number] {
  const value = values[code];

  if (value === undefined) {
    throw new OpsStreamDecodeError(`Invalid ${name} code ${code}`, "invalid_enum_code");
  }

  return value;
}
