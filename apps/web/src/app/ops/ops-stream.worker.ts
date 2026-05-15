import {
  decodeMovementBatch,
  DEFAULT_STREAM_RATE,
  encodeStreamRateControlFrame,
  readAggregateSnapshotFrame,
  type StreamRate,
} from "@bankops/contracts";

import {
  INITIAL_OPS_STREAM_SNAPSHOT,
  type OpsStreamSnapshot,
  type TapeCanvasLayout,
  type OpsWorkerCommand,
} from "./ops-stream-messages";
import { OpsMovementWindow } from "./ops-movement-window";
import { OpsTapeRenderer } from "./ops-tape-renderer";

let socket: WebSocket | undefined;
let reconnectTimer: number | undefined;
let streamRate: StreamRate = DEFAULT_STREAM_RATE;
let snapshot = INITIAL_OPS_STREAM_SNAPSHOT;
let decodedCount = 0;
let latestSeq = 0n;
const movementWindow = new OpsMovementWindow();
const renderer = new OpsTapeRenderer(() => movementWindow.rollingAmountScaleMinor());

self.onmessage = (event: MessageEvent<OpsWorkerCommand>) => {
  const command = event.data;

  switch (command.type) {
    case "canvas.attach":
      attachCanvas(command.canvas, command.layout);
      return;
    case "canvas.resize":
      resizeCanvas(command.layout);
      return;
    case "connect":
      connect("connecting");
      return;
    case "disconnect":
      disconnect();
      return;
    case "stream.rate.set":
      streamRate = command.targetRate;
      socket?.send(encodeStreamRateControlFrame(command));
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
    socket?.send(encodeStreamRateControlFrame({ type: "stream.rate.set", targetRate: streamRate }));
    publish({ ...snapshot, connectionStatus: "open", streamRate });
  };

  socket.onmessage = (event) => {
    if (typeof event.data === "string") {
      const warmSnapshot = readAggregateSnapshotFrame(event.data);
      const rendererMetrics = renderer.metrics();
      const decodedRate = decodedCount * 4;

      publish({
        ...snapshot,
        connectionStatus: "open",
        eventRate: warmSnapshot.eventRate,
        cumulativeCreditsMinor: warmSnapshot.cumulativeCreditsMinor,
        cumulativeDebitsMinor: warmSnapshot.cumulativeDebitsMinor,
        liquidityReserveMinor: warmSnapshot.liquidityReserveMinor,
        exceptionQueueDepth: warmSnapshot.exceptionQueueDepth,
        railHealth: warmSnapshot.railHealth,
        chart: warmSnapshot.chart,
        seq: warmSnapshot.seq,
        streamRate,
        railBucketHeatmap: movementWindow.heatmapSnapshot(),
        renderer: {
          ...rendererMetrics,
          sequenceLag:
            latestSeq === 0n ? 0 : Math.max(0, Number(BigInt(warmSnapshot.seq) - latestSeq)),
          decodedRate,
        },
      });
      decodedCount = 0;
      renderer.resetMetrics();
      return;
    }

    if (event.data instanceof ArrayBuffer) {
      const batch = decodeMovementBatch(event.data);

      decodedCount += batch.movements.length;
      latestSeq = batch.toSeq;
      renderer.pushRows(batch.movements);
      movementWindow.record(batch.movements);
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

function attachCanvas(canvas: OffscreenCanvas, layout: TapeCanvasLayout) {
  renderer.attach(canvas, layout);
  publish({ ...snapshot, renderer: { ...snapshot.renderer, supported: true } });
}

function resizeCanvas(layout: TapeCanvasLayout) {
  renderer.resize(layout);
}

function publish(nextSnapshot: OpsStreamSnapshot) {
  snapshot = nextSnapshot;
  self.postMessage({ type: "snapshot", snapshot });
}

function streamUrl() {
  return `${self.location.protocol === "https:" ? "wss" : "ws"}://${self.location.host}/stream`;
}
