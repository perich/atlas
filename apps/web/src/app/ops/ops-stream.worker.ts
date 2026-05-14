import {
  type BalanceSheetMovement,
  decodeMovementBatch,
  DEFAULT_STREAM_RATE,
  StreamChannel,
  type StreamRate,
} from "@bankops/contracts";

import {
  INITIAL_OPS_STREAM_SNAPSHOT,
  type OpsStreamSnapshot,
  type TapeCanvasLayout,
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
let snapshot = INITIAL_OPS_STREAM_SNAPSHOT;
let canvasContext: OffscreenCanvasRenderingContext2D | null = null;
let tapeLayout: TapeCanvasLayout = { dpr: 1, height: 236, width: 1_100 };
let renderTimer: number | undefined;
let frameCount = 0;
let frameCostTotal = 0;
let decodedCount = 0;
let renderedRowCount = 0;
let latestSeq = 0n;
const rows: BalanceSheetMovement[] = [];
const columns = [
  ["time", 92],
  ["side", 68],
  ["amount", 118],
  ["bucket", 178],
  ["asset", 70],
  ["customer", 104],
  ["rail", 118],
  ["status", 92],
] as const;

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
      const decodedRate = decodedCount * 4;
      publish({
        ...warmSnapshot,
        connectionStatus: "open",
        streamRate,
        movementRate: decodedRate,
        renderer: {
          supported: canvasContext !== null,
          fps: frameCount * 4,
          frameCostMs: frameCount === 0 ? 0 : frameCostTotal / frameCount,
          backlog: 0,
          sequenceLag:
            latestSeq === 0n ? 0 : Math.max(0, Number(BigInt(warmSnapshot.seq) - latestSeq)),
          decodedRate,
          renderedRowRate: renderedRowCount * 4,
        },
      });
      decodedCount = 0;
      frameCount = 0;
      frameCostTotal = 0;
      renderedRowCount = 0;
      return;
    }

    if (event.data instanceof ArrayBuffer) {
      const batch = decodeMovementBatch(event.data);

      decodedCount += batch.movements.length;
      latestSeq = batch.toSeq;
      pushRows(batch.movements);
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
  canvasContext = canvas.getContext("2d");

  if (canvasContext === null) {
    throw new Error("Expected 2D canvas context");
  }

  resizeCanvas(layout);
  publish({ ...snapshot, renderer: { ...snapshot.renderer, supported: true } });
  scheduleDraw();
}

function resizeCanvas(layout: TapeCanvasLayout) {
  tapeLayout = {
    dpr: Math.max(1, layout.dpr),
    height: Math.max(1, layout.height),
    width: Math.max(1, layout.width),
  };

  if (canvasContext === null) {
    return;
  }

  const pixelWidth = Math.round(tapeLayout.width * tapeLayout.dpr);
  const pixelHeight = Math.round(tapeLayout.height * tapeLayout.dpr);
  const canvas = canvasContext.canvas;

  if (canvas.width !== pixelWidth) {
    canvas.width = pixelWidth;
  }

  if (canvas.height !== pixelHeight) {
    canvas.height = pixelHeight;
  }
}

function draw() {
  if (canvasContext === null) {
    return;
  }

  const startedAt = performance.now();
  const rowHeight = 20;
  const headerHeight = 28;
  const visibleRows = Math.floor((tapeLayout.height - headerHeight) / rowHeight);

  canvasContext.setTransform(tapeLayout.dpr, 0, 0, tapeLayout.dpr, 0, 0);
  canvasContext.fillStyle = "#070809";
  canvasContext.fillRect(0, 0, tapeLayout.width, tapeLayout.height);
  canvasContext.font = "12px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace";
  canvasContext.textBaseline = "middle";

  drawHeader(canvasContext);

  rows.slice(0, visibleRows).forEach((movement, index) => {
    drawRow(canvasContext!, movement, headerHeight + index * rowHeight, index);
  });

  frameCount += 1;
  frameCostTotal += performance.now() - startedAt;
  scheduleDraw();
}

function scheduleDraw() {
  self.clearTimeout(renderTimer);
  renderTimer = self.setTimeout(draw, 8);
}

function drawHeader(context: OffscreenCanvasRenderingContext2D) {
  context.fillStyle = "#111315";
  context.fillRect(0, 0, tapeLayout.width, 28);
  context.fillStyle = "#89929c";
  drawCells(
    context,
    columns.map(([label]) => label),
    14,
  );
}

function drawRow(
  context: OffscreenCanvasRenderingContext2D,
  movement: BalanceSheetMovement,
  y: number,
  index: number,
) {
  context.fillStyle = index % 2 === 0 ? "#0b0d0f" : "#090a0b";
  context.fillRect(0, y, tapeLayout.width, 20);
  context.fillStyle = movement.side === "credit" ? "#86efac" : "#fda4af";
  drawCells(context, movementCells(movement), y + 10);
}

function drawCells(context: OffscreenCanvasRenderingContext2D, cells: string[], y: number) {
  let x = 12;

  columns.forEach(([, width], index) => {
    context.fillText(cells[index], x, y, width - 12);
    x += width;
  });
}

function pushRows(movements: BalanceSheetMovement[]) {
  renderedRowCount += movements.length;

  for (const movement of movements) {
    rows.unshift(movement);
  }

  rows.length = Math.min(rows.length, 128);
}

function movementCells(movement: BalanceSheetMovement) {
  return [
    new Date(movement.serverTs).toLocaleTimeString("en-US", { hour12: false }),
    movement.side,
    formatMinorUsd(movement.amountMinor),
    movement.bucket,
    movement.asset,
    `C${movement.customerId}`,
    movement.rail,
    movement.status,
  ];
}

function formatMinorUsd(value: bigint) {
  return `$${(Number(value < 0n ? -value : value) / 100).toLocaleString("en-US", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  })}`;
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
