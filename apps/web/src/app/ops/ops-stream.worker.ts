import {
  type BalanceSheetBucket,
  type BalanceSheetMovement,
  decodeMovementBatch,
  DEFAULT_STREAM_RATE,
  type Rail,
  StreamChannel,
  type StreamRate,
} from "@bankops/contracts";

import {
  INITIAL_OPS_STREAM_SNAPSHOT,
  type OpsStreamSnapshot,
  type RailBucketHeatmapCell,
  type TapeCanvasLayout,
  type OpsWorkerCommand,
} from "./ops-stream-messages";

type WarmOpsSnapshotMessage = Omit<
  OpsStreamSnapshot,
  "connectionStatus" | "streamRate" | "railBucketHeatmap" | "renderer"
> & {
  channel: typeof StreamChannel.AggregateSnapshot;
  type: "ops.snapshot";
};
type HeatmapDelta = {
  rail: Rail;
  bucket: BalanceSheetBucket;
  movementCount: number;
  creditMinor: number;
  debitMinor: number;
  exceptionCount: number;
};
type HeatmapBin = {
  startedAt: number;
  cells: Map<string, HeatmapDelta>;
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
let latestMovementTs = 0;
const rows: BalanceSheetMovement[] = [];
const heatmapWindowMs = 5_000;
const heatmapBinMs = 250;
const heatmapBins: HeatmapBin[] = Array.from({ length: heatmapWindowMs / heatmapBinMs }, () => ({
  cells: new Map(),
  startedAt: 0,
}));
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
const headerHeight = 30;
const rowHeight = 20;
const cellPaddingX = 14;
const magnitudeGutterWidth = 142;
const magnitudeBarInsetX = 16;
const magnitudeBarHeight = 6;

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
        ...snapshot,
        connectionStatus: "open",
        seq: warmSnapshot.seq,
        streamRate,
        railBucketHeatmap: buildHeatmapSnapshot(),
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
      recordHeatmapMovements(batch.movements);
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
  const visibleRows = Math.floor((tapeLayout.height - headerHeight) / rowHeight);

  canvasContext.setTransform(tapeLayout.dpr, 0, 0, tapeLayout.dpr, 0, 0);
  drawBackdrop(canvasContext);
  canvasContext.font = "12px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace";
  canvasContext.textBaseline = "middle";

  drawHeader(canvasContext);

  const visibleMovements = rows.slice(0, visibleRows);
  const maxVisibleAmountMinor = maxAmountMinor(visibleMovements);

  visibleMovements.forEach((movement, index) => {
    drawRow(
      canvasContext!,
      movement,
      headerHeight + index * rowHeight,
      index,
      maxVisibleAmountMinor,
    );
  });

  frameCount += 1;
  frameCostTotal += performance.now() - startedAt;
  scheduleDraw();
}

function scheduleDraw() {
  self.clearTimeout(renderTimer);
  renderTimer = self.setTimeout(draw, 8);
}

function drawBackdrop(context: OffscreenCanvasRenderingContext2D) {
  const gradient = context.createLinearGradient(0, 0, tapeLayout.width, tapeLayout.height);

  gradient.addColorStop(0, "#070809");
  gradient.addColorStop(0.45, "#09100d");
  gradient.addColorStop(1, "#070809");

  context.fillStyle = gradient;
  context.fillRect(0, 0, tapeLayout.width, tapeLayout.height);
}

function drawHeader(context: OffscreenCanvasRenderingContext2D) {
  const gradient = context.createLinearGradient(0, 0, tapeLayout.width, 0);

  gradient.addColorStop(0, "#111315");
  gradient.addColorStop(0.55, "#101815");
  gradient.addColorStop(1, "#111315");

  context.fillStyle = gradient;
  context.fillRect(0, 0, tapeLayout.width, headerHeight);
  context.fillStyle = "rgba(255,255,255,0.08)";
  context.fillRect(0, headerHeight - 1, tapeLayout.width, 1);
  context.fillStyle = "#89929c";
  context.fillText("SIZE", cellPaddingX, 15, magnitudeGutterWidth - magnitudeBarInsetX);
  drawCells(
    context,
    columns.map(([label]) => label.toUpperCase()),
    15,
    "#89929c",
  );
  drawColumnRules(context);
}

function drawRow(
  context: OffscreenCanvasRenderingContext2D,
  movement: BalanceSheetMovement,
  y: number,
  index: number,
  maxVisibleAmountMinor: number,
) {
  const color = movement.side === "credit" ? "#86efac" : "#fda4af";
  const tint = movement.side === "credit" ? "rgba(34,197,94," : "rgba(244,63,94,";
  const alpha = Math.max(0.02, 0.075 - index * 0.0015);

  context.fillStyle = index % 2 === 0 ? "#0b0d0f" : "#090a0b";
  context.fillRect(0, y, tapeLayout.width, rowHeight);
  context.fillStyle = `${tint}${alpha})`;
  context.fillRect(0, y, tapeLayout.width, rowHeight);

  context.fillStyle = color;
  context.fillRect(0, y + 3, 3, rowHeight - 6);

  drawMagnitudeBar(context, movement, y, maxVisibleAmountMinor);
  drawMovementCells(context, movement, y + 10, color);
}

function drawCells(
  context: OffscreenCanvasRenderingContext2D,
  cells: string[],
  y: number,
  color = "#d7dee8",
) {
  let x = cellPaddingX + magnitudeGutterWidth;

  columns.forEach(([, width], index) => {
    context.fillStyle = color;
    context.fillText(cells[index], x, y, width - 12);
    x += width;
  });
}

function drawMovementCells(
  context: OffscreenCanvasRenderingContext2D,
  movement: BalanceSheetMovement,
  y: number,
  sideColor: string,
) {
  const cells = movementCells(movement);

  columns.forEach(([, width], index) => {
    context.fillStyle = movementCellColor(movement, index, sideColor);
    context.fillText(cells[index], columnX(index), y, width - 12);
  });
}

function drawMagnitudeBar(
  context: OffscreenCanvasRenderingContext2D,
  movement: BalanceSheetMovement,
  y: number,
  maxVisibleAmountMinor: number,
) {
  const x = magnitudeBarInsetX;
  const maxWidth = magnitudeGutterWidth - magnitudeBarInsetX * 2;
  const amountMinor = Math.abs(Number(movement.amountMinor));
  const intensity =
    maxVisibleAmountMinor === 0 ? 0 : Math.sqrt(amountMinor / maxVisibleAmountMinor);
  const width = Math.max(3, maxWidth * Math.min(1, intensity));
  const barY = y + (rowHeight - magnitudeBarHeight) / 2;

  context.fillStyle = movement.side === "credit" ? "#22c55e" : "#f43f5e";
  context.fillRect(x, barY, width, magnitudeBarHeight);
}

function drawColumnRules(context: OffscreenCanvasRenderingContext2D) {
  context.fillStyle = "rgba(255,255,255,0.035)";
  context.fillRect(cellPaddingX + magnitudeGutterWidth - 10, 0, 1, tapeLayout.height);

  columns.slice(1).forEach((_, index) => {
    context.fillRect(columnX(index + 1) - 10, 0, 1, tapeLayout.height);
  });
}

function movementCellColor(movement: BalanceSheetMovement, index: number, sideColor: string) {
  if (index === 1 || index === 2) {
    return sideColor;
  }

  if (index === 3 || index === 4 || index === 6) {
    return "#b9f6c8";
  }

  if (index === 7 && (movement.status === "failed" || movement.status === "held")) {
    return "#fda4af";
  }

  if (index === 0) {
    return "#a8b1bc";
  }

  return "#d7dee8";
}

function columnX(index: number) {
  return (
    cellPaddingX +
    magnitudeGutterWidth +
    columns.slice(0, index).reduce((total, [, width]) => {
      return total + width;
    }, 0)
  );
}

function maxAmountMinor(movements: BalanceSheetMovement[]) {
  return movements.reduce((max, movement) => {
    return Math.max(max, Math.abs(Number(movement.amountMinor)));
  }, 0);
}

function pushRows(movements: BalanceSheetMovement[]) {
  renderedRowCount += movements.length;

  for (const movement of movements) {
    rows.unshift(movement);
  }

  rows.length = Math.min(rows.length, 128);
}

function recordHeatmapMovements(movements: BalanceSheetMovement[]) {
  for (const movement of movements) {
    latestMovementTs = Math.max(latestMovementTs, movement.serverTs);

    const bin = heatmapBinFor(movement.serverTs);
    const key = heatmapKey(movement.rail, movement.bucket);
    const cell =
      bin.cells.get(key) ??
      ({
        bucket: movement.bucket,
        creditMinor: 0,
        debitMinor: 0,
        exceptionCount: 0,
        movementCount: 0,
        rail: movement.rail,
      } satisfies HeatmapDelta);
    const amountMinor = Math.abs(Number(movement.amountMinor));

    cell.movementCount += 1;

    if (movement.side === "credit") {
      cell.creditMinor += amountMinor;
    } else {
      cell.debitMinor += amountMinor;
    }

    if (
      movement.status === "failed" ||
      movement.status === "held" ||
      movement.status === "pending"
    ) {
      cell.exceptionCount += 1;
    }

    bin.cells.set(key, cell);
  }
}

function buildHeatmapSnapshot(): RailBucketHeatmapCell[] {
  const now = latestMovementTs === 0 ? Date.now() : latestMovementTs;
  const cutoff = now - heatmapWindowMs;
  const totals = new Map<string, HeatmapDelta>();

  for (const bin of heatmapBins) {
    if (bin.startedAt <= cutoff) {
      continue;
    }

    for (const [key, cell] of bin.cells) {
      const total =
        totals.get(key) ??
        ({
          bucket: cell.bucket,
          creditMinor: 0,
          debitMinor: 0,
          exceptionCount: 0,
          movementCount: 0,
          rail: cell.rail,
        } satisfies HeatmapDelta);

      total.movementCount += cell.movementCount;
      total.creditMinor += cell.creditMinor;
      total.debitMinor += cell.debitMinor;
      total.exceptionCount += cell.exceptionCount;
      totals.set(key, total);
    }
  }

  const cells = [...totals.values()].map((cell) => {
    const amountMinor = cell.creditMinor + cell.debitMinor;

    return {
      amountPerSecMinor: amountMinor / (heatmapWindowMs / 1_000),
      bucket: cell.bucket,
      creditMinor: cell.creditMinor,
      debitMinor: cell.debitMinor,
      exceptionRate: cell.movementCount === 0 ? 0 : cell.exceptionCount / cell.movementCount,
      intensity: 0,
      movementRate: cell.movementCount / (heatmapWindowMs / 1_000),
      rail: cell.rail,
      skew: amountMinor === 0 ? 0 : (cell.creditMinor - cell.debitMinor) / amountMinor,
    } satisfies RailBucketHeatmapCell;
  });
  const maxAmountPerSecMinor = Math.max(1, ...cells.map((cell) => cell.amountPerSecMinor));

  return cells.map((cell) => ({
    ...cell,
    intensity: Math.sqrt(cell.amountPerSecMinor / maxAmountPerSecMinor),
  }));
}

function heatmapBinFor(ts: number) {
  const startedAt = Math.floor(ts / heatmapBinMs) * heatmapBinMs;
  const bin = heatmapBins[Math.floor(startedAt / heatmapBinMs) % heatmapBins.length];

  if (bin.startedAt !== startedAt) {
    bin.startedAt = startedAt;
    bin.cells.clear();
  }

  return bin;
}

function heatmapKey(rail: Rail, bucket: BalanceSheetBucket) {
  return `${rail}:${bucket}`;
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
