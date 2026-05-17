import {
  DEFAULT_STREAM_RATE,
  encodeOpsMovementBatch,
  readOpsStreamControlFrame,
  type StreamRate,
  toOpsAggregateSnapshotFrame,
} from "@bankops/contracts";
import { createOpsTapeSimulator } from "@bankops/ops-tape-sim";
import type { WebSocket } from "@fastify/websocket";
import type { RawData } from "ws";

const HOT_TICK_MS = 1_000 / 60;
const WARM_TICK_MS = 250;
const SOCKET_OPEN = 1;
const MAX_SOCKET_BUFFERED_BYTES = 1_000_000;

export function startOpsStreamSession(socket: WebSocket) {
  const simulator = createOpsTapeSimulator();
  let targetRate: StreamRate = DEFAULT_STREAM_RATE;

  const sendHotBatch = () => {
    if (!canSend(socket)) {
      return;
    }

    const batch = simulator.nextBatch(targetRate, Date.now());

    safeSend(socket, Buffer.from(encodeOpsMovementBatch(batch)));
  };

  const sendWarmSnapshot = () => {
    safeSend(socket, JSON.stringify(toOpsAggregateSnapshotFrame(simulator.getAggregateSnapshot())));
  };

  sendWarmSnapshot();

  const hotTimer = setInterval(sendHotBatch, HOT_TICK_MS);
  const warmTimer = setInterval(sendWarmSnapshot, WARM_TICK_MS);

  socket.on("message", (data) => {
    try {
      targetRate = readOpsStreamControlFrame(rawDataToText(data)).targetRate;
    } catch {
      safeSend(
        socket,
        JSON.stringify({
          type: "ops.control.rejected",
          reason: "invalid_stream_control",
        }),
      );
    }
  });

  socket.on("close", () => {
    clearInterval(hotTimer);
    clearInterval(warmTimer);
  });
}

function canSend(socket: WebSocket): boolean {
  return socket.readyState === SOCKET_OPEN && socket.bufferedAmount < MAX_SOCKET_BUFFERED_BYTES;
}

function safeSend(socket: WebSocket, data: string | Buffer) {
  if (!canSend(socket)) {
    return false;
  }

  socket.send(data);
  return true;
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
