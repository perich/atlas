import {
  decodeMovementBatch,
  DEFAULT_STREAM_RATE,
  StreamChannel,
  type StreamRate,
} from "@bankops/contracts";

import {
  INITIAL_OPS_STREAM_SNAPSHOT,
  type OpsStreamSnapshot,
  type OpsWorkerCommand,
} from "./ops-stream-messages";

type WarmOpsSnapshotMessage = Omit<
  OpsStreamSnapshot,
  "connectionStatus" | "streamRate" | "movementRate"
> & {
  channel: typeof StreamChannel.AggregateSnapshot;
  type: "ops.snapshot";
};

let socket: WebSocket | undefined;
let reconnectTimer: number | undefined;
let streamRate: StreamRate = DEFAULT_STREAM_RATE;
let movementCount = 0;
let snapshot = INITIAL_OPS_STREAM_SNAPSHOT;

self.onmessage = (event: MessageEvent<OpsWorkerCommand>) => {
  const command = event.data;

  switch (command.type) {
    case "connect":
      connect("connecting");
      return;
    case "disconnect":
      disconnect();
      return;
    case "stream.rate.set":
      streamRate = command.targetRate;
      socket?.send(JSON.stringify(command));
      publish({ ...snapshot, streamRate });
      return;
  }
};

function connect(status: OpsStreamSnapshot["connectionStatus"]) {
  disconnect();
  publish({ ...snapshot, connectionStatus: status });

  socket = new WebSocket(streamUrl());
  socket.binaryType = "arraybuffer";

  socket.onopen = () => {
    socket?.send(JSON.stringify({ type: "stream.rate.set", targetRate: streamRate }));
    publish({ ...snapshot, connectionStatus: "open", streamRate });
  };

  socket.onmessage = (event) => {
    if (typeof event.data === "string") {
      const warmSnapshot = readWarmSnapshot(event.data);
      publish({
        ...warmSnapshot,
        connectionStatus: "open",
        streamRate,
        movementRate: movementCount * 4,
      });
      movementCount = 0;
      return;
    }

    if (event.data instanceof ArrayBuffer) {
      movementCount += decodeMovementBatch(event.data).movements.length;
      return;
    }

    throw new Error("Unsupported SettlementStream message payload");
  };

  socket.onclose = () => {
    const connectionStatus = snapshot.connectionStatus === "degraded" ? "degraded" : "reconnecting";

    publish({ ...snapshot, connectionStatus });
    reconnectTimer = self.setTimeout(() => connect("reconnecting"), 1_000);
  };

  socket.onerror = () => {
    publish({ ...snapshot, connectionStatus: "degraded" });
  };
}

function disconnect() {
  self.clearTimeout(reconnectTimer);
  if (socket !== undefined) {
    socket.onclose = null;
    socket.onerror = null;
    socket.close();
  }
  socket = undefined;
}

function publish(nextSnapshot: OpsStreamSnapshot) {
  snapshot = nextSnapshot;
  self.postMessage({ type: "snapshot", snapshot });
}

function streamUrl() {
  return `${self.location.protocol === "https:" ? "wss" : "ws"}://${self.location.host}/stream`;
}

function readWarmSnapshot(raw: string): WarmOpsSnapshotMessage {
  const value: unknown = JSON.parse(raw);
  assertWarmSnapshot(value);

  return value;
}

function assertWarmSnapshot(value: unknown): asserts value is WarmOpsSnapshotMessage {
  if (typeof value !== "object" || value === null) {
    throw new Error("Expected warm ops snapshot");
  }

  if (!("type" in value) || !("channel" in value)) {
    throw new Error("Expected warm ops snapshot");
  }

  if (value.type !== "ops.snapshot" || value.channel !== StreamChannel.AggregateSnapshot) {
    throw new Error("Unknown SettlementStream warm message");
  }
}
