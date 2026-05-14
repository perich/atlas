import { encodeMovementBatch, StreamChannel, type StreamRate } from "@bankops/contracts";
import { createOpsTapeSimulator, type OpsTapeAggregateSnapshot } from "@bankops/ops-tape-sim";
import type { WebSocket } from "@fastify/websocket";
import type { RawData } from "ws";

const HOT_TICK_MS = 1_000 / 60;
const WARM_TICK_MS = 250;
const DEFAULT_STREAM_RATE = 2_000 satisfies StreamRate;

export type WarmOpsSnapshotMessage = {
  channel: typeof StreamChannel.AggregateSnapshot;
  type: "ops.snapshot";
  seq: string;
  eventRate: number;
  cumulativeCreditsMinor: string;
  cumulativeDebitsMinor: string;
  liquidityReserveMinor: string;
  exceptionQueueDepth: number;
  bucketTotals: Record<string, string>;
  railHealth: OpsTapeAggregateSnapshot["railHealth"];
  chart: Array<{
    ts: number;
    eventCount: number;
    eventRate: number;
    latencyP95Ms: number;
    failureRate: number;
    exceptionQueueDepth: number;
    liquidityReserveMinor: string;
    creditMinor: string;
    debitMinor: string;
  }>;
};

type StreamRateMessage = {
  type: "stream.rate.set";
  targetRate: StreamRate;
};

export function startOpsStreamSession(socket: WebSocket) {
  const simulator = createOpsTapeSimulator();
  let targetRate: StreamRate = DEFAULT_STREAM_RATE;

  const sendHotBatch = () => {
    const batch = simulator.nextBatch(targetRate, Date.now());

    socket.send(
      Buffer.from(
        encodeMovementBatch({
          fromSeq: batch.fromSeq,
          toSeq: batch.toSeq,
          serverTsMs: batch.serverTsMs,
          movements: batch.movements,
        }),
      ),
    );
  };

  const sendWarmSnapshot = () => {
    socket.send(JSON.stringify(toWarmMessage(simulator.getAggregateSnapshot())));
  };

  sendWarmSnapshot();

  const hotTimer = setInterval(sendHotBatch, HOT_TICK_MS);
  const warmTimer = setInterval(sendWarmSnapshot, WARM_TICK_MS);

  socket.on("message", (data) => {
    const message = readControlMessage(data);

    if (message !== null) {
      targetRate = message.targetRate;
    }
  });

  socket.on("close", () => {
    clearInterval(hotTimer);
    clearInterval(warmTimer);
  });
}

function readControlMessage(data: RawData): StreamRateMessage | null {
  const parsed: unknown = JSON.parse(rawDataToText(data));

  if (isStreamRateMessage(parsed)) {
    return parsed;
  }

  return null;
}

function rawDataToText(data: RawData): string {
  if (Buffer.isBuffer(data)) {
    return data.toString("utf8");
  }

  if (data instanceof ArrayBuffer) {
    return Buffer.from(data).toString("utf8");
  }

  return Buffer.concat(data).toString("utf8");
}

function isStreamRateMessage(value: unknown): value is StreamRateMessage {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  if (!("type" in value) || !("targetRate" in value)) {
    return false;
  }

  return (
    value.type === "stream.rate.set" &&
    (value.targetRate === 50 || value.targetRate === 2_000 || value.targetRate === 10_000)
  );
}

function toWarmMessage(snapshot: OpsTapeAggregateSnapshot): WarmOpsSnapshotMessage {
  return {
    channel: StreamChannel.AggregateSnapshot,
    type: "ops.snapshot",
    seq: snapshot.seq.toString(),
    eventRate: snapshot.eventRate,
    cumulativeCreditsMinor: snapshot.cumulativeCreditsMinor.toString(),
    cumulativeDebitsMinor: snapshot.cumulativeDebitsMinor.toString(),
    liquidityReserveMinor: snapshot.liquidityReserveMinor.toString(),
    exceptionQueueDepth: snapshot.exceptionQueueDepth,
    bucketTotals: Object.fromEntries(
      Object.entries(snapshot.bucketTotals).map(([bucket, total]) => [bucket, total.toString()]),
    ),
    railHealth: snapshot.railHealth,
    chart: snapshot.chart.map((point) => ({
      ...point,
      liquidityReserveMinor: point.liquidityReserveMinor.toString(),
      creditMinor: point.creditMinor.toString(),
      debitMinor: point.debitMinor.toString(),
    })),
  };
}
