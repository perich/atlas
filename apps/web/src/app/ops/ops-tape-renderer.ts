import { movementMagnitudeMinorNumber, type BalanceSheetMovement } from "@bankops/contracts";

import {
  OPS_TAPE_HEADER_HEIGHT,
  OPS_TAPE_MAX_ROWS,
  OPS_TAPE_ROW_HEIGHT,
  type OpsStreamSnapshot,
  type TapeCanvasLayout,
} from "./ops-stream-messages";

const COLUMNS = [
  ["time", 92],
  ["side", 68],
  ["amount", 118],
  ["bucket", 178],
  ["asset", 70],
  ["customer", 104],
  ["rail", 118],
  ["status", 92],
] as const;
const CELL_PADDING_X = 14;
const MAGNITUDE_GUTTER_WIDTH = 142;
const MAGNITUDE_BAR_INSET_X = 16;
const MAGNITUDE_BAR_INSET_Y = 3;
const COLUMN_LEFTS = createColumnLefts();
const tapeColor = {
  background: "#070809",
  backgroundGlow: "#09100d",
  debit: "#fda4af",
  debitTint: "rgba(244,63,94,",
  divider: "rgba(255,255,255,0.08)",
  gutter: "rgba(255,255,255,0.035)",
  header: "#111315",
  headerGlow: "#101815",
  headerText: "#89929c",
  row: "#0b0d0f",
  rowAlt: "#090a0b",
  text: "#d7dee8",
  time: "#a8b1bc",
  credit: "#86efac",
  creditTint: "rgba(34,197,94,",
} as const;

type RendererMetrics = OpsStreamSnapshot["renderer"];

export class OpsTapeRenderer {
  private canvasContext: OffscreenCanvasRenderingContext2D | null = null;
  private frameCostTotal = 0;
  private frameCount = 0;
  private layout: TapeCanvasLayout = { dpr: 1, height: 236, width: 1_100 };
  private renderedRowCount = 0;
  private renderTimer: number | undefined;
  private readonly rows: BalanceSheetMovement[] = [];

  constructor(private readonly amountScaleMinor: () => number) {}

  attach(canvas: OffscreenCanvas, layout: TapeCanvasLayout) {
    this.canvasContext = canvas.getContext("2d");

    if (this.canvasContext === null) {
      throw new Error("Expected 2D canvas context");
    }

    this.resize(layout);
    this.scheduleDraw();
  }

  resize(layout: TapeCanvasLayout) {
    this.layout = {
      dpr: Math.max(1, layout.dpr),
      height: Math.max(1, layout.height),
      width: Math.max(1, layout.width),
    };

    if (this.canvasContext === null) {
      return;
    }

    const pixelWidth = Math.round(this.layout.width * this.layout.dpr);
    const pixelHeight = Math.round(this.layout.height * this.layout.dpr);
    const canvas = this.canvasContext.canvas;

    if (canvas.width !== pixelWidth) {
      canvas.width = pixelWidth;
    }

    if (canvas.height !== pixelHeight) {
      canvas.height = pixelHeight;
    }
  }

  pushRows(movements: BalanceSheetMovement[]) {
    this.renderedRowCount += movements.length;

    for (const movement of movements) {
      this.rows.unshift(movement);
    }

    this.rows.length = Math.min(this.rows.length, OPS_TAPE_MAX_ROWS);
  }

  metrics(): RendererMetrics {
    return {
      supported: this.canvasContext !== null,
      fps: this.frameCount * 4,
      frameCostMs: this.frameCount === 0 ? 0 : this.frameCostTotal / this.frameCount,
      decodedRate: 0,
      renderedRowRate: this.renderedRowCount * 4,
    };
  }

  resetMetrics() {
    this.frameCount = 0;
    this.frameCostTotal = 0;
    this.renderedRowCount = 0;
  }

  private draw() {
    const context = this.canvasContext;

    if (context === null) {
      return;
    }

    const startedAt = performance.now();
    const visibleRows = this.visibleRowCount();

    context.setTransform(this.layout.dpr, 0, 0, this.layout.dpr, 0, 0);
    this.drawBackdrop(context);
    context.font = "12px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace";
    context.textBaseline = "middle";

    this.drawHeader(context);

    const visibleMovements = this.rows.slice(0, visibleRows);
    const amountScaleMinor = this.amountScaleMinor();

    visibleMovements.forEach((movement, index) => {
      this.drawRow(
        context,
        movement,
        OPS_TAPE_HEADER_HEIGHT + index * OPS_TAPE_ROW_HEIGHT,
        index,
        amountScaleMinor,
      );
    });

    this.frameCount += 1;
    this.frameCostTotal += performance.now() - startedAt;
    this.scheduleDraw();
  }

  private scheduleDraw() {
    self.clearTimeout(this.renderTimer);
    this.renderTimer = self.setTimeout(() => this.draw(), 8);
  }

  private drawBackdrop(context: OffscreenCanvasRenderingContext2D) {
    const gradient = context.createLinearGradient(0, 0, this.layout.width, this.layout.height);

    gradient.addColorStop(0, tapeColor.background);
    gradient.addColorStop(0.45, tapeColor.backgroundGlow);
    gradient.addColorStop(1, tapeColor.background);

    context.fillStyle = gradient;
    context.fillRect(0, 0, this.layout.width, this.layout.height);
  }

  private drawHeader(context: OffscreenCanvasRenderingContext2D) {
    const gradient = context.createLinearGradient(0, 0, this.layout.width, 0);

    gradient.addColorStop(0, tapeColor.header);
    gradient.addColorStop(0.55, tapeColor.headerGlow);
    gradient.addColorStop(1, tapeColor.header);

    context.fillStyle = gradient;
    context.fillRect(0, 0, this.layout.width, OPS_TAPE_HEADER_HEIGHT);
    context.fillStyle = tapeColor.divider;
    context.fillRect(0, OPS_TAPE_HEADER_HEIGHT - 1, this.layout.width, 1);
    context.fillStyle = tapeColor.headerText;
    context.fillText("SIZE", CELL_PADDING_X, 15, MAGNITUDE_GUTTER_WIDTH - MAGNITUDE_BAR_INSET_X);
    this.drawCells(
      context,
      COLUMNS.map(([label]) => label.toUpperCase()),
      15,
      tapeColor.headerText,
    );
    this.drawColumnRules(context);
  }

  private drawRow(
    context: OffscreenCanvasRenderingContext2D,
    movement: BalanceSheetMovement,
    y: number,
    index: number,
    amountScaleMinor: number,
  ) {
    const color = movementSideColor(movement);
    const tint = movement.side === "credit" ? tapeColor.creditTint : tapeColor.debitTint;
    const alpha = Math.max(0.02, 0.075 - index * 0.0015);

    context.fillStyle = index % 2 === 0 ? tapeColor.row : tapeColor.rowAlt;
    context.fillRect(0, y, this.layout.width, OPS_TAPE_ROW_HEIGHT);
    context.fillStyle = `${tint}${alpha})`;
    context.fillRect(0, y, this.layout.width, OPS_TAPE_ROW_HEIGHT);

    this.drawMagnitudeBar(context, movement, y, amountScaleMinor);
    this.drawMovementCells(context, movement, y + 10, color);
  }

  private drawCells(
    context: OffscreenCanvasRenderingContext2D,
    cells: string[],
    y: number,
    color: string = tapeColor.text,
  ) {
    COLUMNS.forEach(([, width], index) => {
      context.fillStyle = color;
      context.fillText(cells[index], columnX(index), y, width - 12);
    });
  }

  private drawMovementCells(
    context: OffscreenCanvasRenderingContext2D,
    movement: BalanceSheetMovement,
    y: number,
    sideColor: string,
  ) {
    const cells = movementCells(movement);

    COLUMNS.forEach(([, width], index) => {
      context.fillStyle = movementCellColor(movement, index, sideColor);
      context.fillText(cells[index], columnX(index), y, width - 12);
    });
  }

  private drawMagnitudeBar(
    context: OffscreenCanvasRenderingContext2D,
    movement: BalanceSheetMovement,
    y: number,
    amountScaleMinor: number,
  ) {
    const x = MAGNITUDE_BAR_INSET_X;
    const maxWidth = MAGNITUDE_GUTTER_WIDTH - MAGNITUDE_BAR_INSET_X * 2;
    const amountMinor = movementMagnitudeMinorNumber(movement);
    const intensity = amountScaleMinor === 0 ? 0 : amountMinor / amountScaleMinor;
    const width = Math.max(3, maxWidth * Math.min(1, intensity));
    const height = OPS_TAPE_ROW_HEIGHT - MAGNITUDE_BAR_INSET_Y * 2;

    context.fillStyle = movementSideColor(movement);
    context.fillRect(x, y + MAGNITUDE_BAR_INSET_Y, width, height);
  }

  private drawColumnRules(context: OffscreenCanvasRenderingContext2D) {
    context.fillStyle = tapeColor.gutter;
    context.fillRect(CELL_PADDING_X + MAGNITUDE_GUTTER_WIDTH - 10, 0, 1, this.layout.height);

    COLUMNS.slice(1).forEach((_, index) => {
      context.fillRect(columnX(index + 1) - 10, 0, 1, this.layout.height);
    });
  }

  private visibleRowCount() {
    return Math.max(
      0,
      Math.floor((this.layout.height - OPS_TAPE_HEADER_HEIGHT) / OPS_TAPE_ROW_HEIGHT),
    );
  }
}

function movementCellColor(movement: BalanceSheetMovement, index: number, sideColor: string) {
  if (index === 1 || index === 2) {
    return sideColor;
  }

  if (index === 7 && (movement.status === "failed" || movement.status === "held")) {
    return tapeColor.debit;
  }

  if (index === 0) {
    return tapeColor.time;
  }

  return tapeColor.text;
}

function movementSideColor(movement: BalanceSheetMovement) {
  return movement.side === "credit" ? tapeColor.credit : tapeColor.debit;
}

function columnX(index: number) {
  return COLUMN_LEFTS[index] ?? CELL_PADDING_X + MAGNITUDE_GUTTER_WIDTH;
}

function createColumnLefts() {
  const offsets: number[] = [];
  let nextOffset = CELL_PADDING_X + MAGNITUDE_GUTTER_WIDTH;

  for (const [, width] of COLUMNS) {
    offsets.push(nextOffset);
    nextOffset += width;
  }

  return offsets;
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
  return `$${(movementMagnitudeMinorNumber({ amountMinor: value }) / 100).toLocaleString("en-US", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  })}`;
}
