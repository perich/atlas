import {
  DEFAULT_STREAM_RATE,
  encodeMovementBatch,
  readStreamRateControlFrame,
  type StreamRate,
  toAggregateSnapshotFrame,
} from "@bankops/contracts";
import { createOpsTapeSimulator } from "@bankops/ops-tape-sim";
import type { WebSocket } from "@fastify/websocket";
import type { RawData } from "ws";

const HOT_TICK_MS = 1_000 / 60;
const WARM_TICK_MS = 250;

export function startOpsStreamSession(socket: WebSocket) {
  const simulator = createOpsTapeSimulator();
  let targetRate: StreamRate = DEFAULT_STREAM_RATE;

  const sendHotBatch = () => {
    const batch = simulator.nextBatch(targetRate, Date.now());

    socket.send(Buffer.from(encodeMovementBatch(batch)));
  };

  const sendWarmSnapshot = () => {
    socket.send(JSON.stringify(toAggregateSnapshotFrame(simulator.getAggregateSnapshot())));
  };

  sendWarmSnapshot();

  const hotTimer = setInterval(sendHotBatch, HOT_TICK_MS);
  const warmTimer = setInterval(sendWarmSnapshot, WARM_TICK_MS);

  socket.on("message", (data) => {
    targetRate = readStreamRateControlFrame(rawDataToText(data)).targetRate;
  });

  socket.on("close", () => {
    clearInterval(hotTimer);
    clearInterval(warmTimer);
  });
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
