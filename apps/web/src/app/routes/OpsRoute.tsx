import React, { useCallback, useEffect, useRef } from "react";
import {
  BALANCE_SHEET_BUCKETS,
  RAILS,
  STREAM_RATES,
  type BalanceSheetBucket,
  type Rail,
  type StreamRate,
} from "@bankops/contracts";
import { Info } from "lucide-react";

import { useOpsStream } from "../ops/ops-stream-store";
import type {
  OpsConnectionStatus,
  OpsStreamSnapshot,
  RailBucketHeatmapCell,
  TapeCanvasLayout,
} from "../ops/ops-stream-messages";
import { Button, PageHeader, Panel } from "../../design/components";

const usdCompact = new Intl.NumberFormat("en-US", {
  currency: "USD",
  maximumFractionDigits: 1,
  notation: "compact",
  style: "currency",
});
const statusLabels: Record<OpsConnectionStatus, string> = {
  connecting: "Connecting",
  degraded: "Backend unavailable",
  open: "Open",
  reconnecting: "Reconnecting",
};
const statusClassNames: Record<OpsConnectionStatus, string> = {
  connecting: "font-medium text-sky-300",
  degraded: "font-medium text-amber-300",
  open: "font-medium text-emerald-300",
  reconnecting: "font-medium text-sky-300",
};
const streamRateLabels: Record<StreamRate, string> = {
  1: "1/s",
  50: "50/s",
  2_000: "2k/s",
  10_000: "10k/s",
};
const tapeCanvasCssHeight = 620;
const tapeCanvasStyle = { height: tapeCanvasCssHeight } satisfies React.CSSProperties;
const elevatedExceptionRate = 0.05;

export function OpsRoute() {
  const { attachTapeCanvas, resizeTapeCanvas, setStreamRate, snapshot } = useOpsStream();

  return (
    <div className="space-y-5">
      <PageHeader eyebrow="God Mode" title="Operations control plane" />

      <Panel className="overflow-hidden p-0">
        <div className="border-b border-white/[0.075] bg-black/20 px-4 py-3">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.13em] text-bankops-muted">
                Balance Sheet Tape
              </p>
              <p className="mt-1 text-sm text-white">Global debit and credit movement stream</p>
            </div>

            <div className="text-right text-xs text-bankops-muted">
              <span>SettlementStream seq {snapshot.seq}</span>
              <br />
              <span
                className={statusClassNames[snapshot.connectionStatus]}
                data-testid="ops-connection-status"
              >
                {statusLabels[snapshot.connectionStatus]}
              </span>
            </div>
          </div>

          <div className="mt-4 grid gap-3 xl:grid-cols-[1fr_auto] xl:items-end">
            <RendererMetrics snapshot={snapshot} />

            <div className="flex items-center justify-between gap-3 xl:justify-end">
              <span className="text-xs font-medium text-bankops-muted">Stream rate</span>
              <div className="flex gap-2">
                {STREAM_RATES.map((streamRate) => (
                  <Button
                    className="min-h-8 px-3 text-xs"
                    key={streamRate}
                    onClick={() => setStreamRate(streamRate)}
                    variant={snapshot.streamRate === streamRate ? "primary" : "secondary"}
                  >
                    {streamRateLabels[streamRate]}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <BalanceSheetTape attachTapeCanvas={attachTapeCanvas} resizeTapeCanvas={resizeTapeCanvas} />
      </Panel>

      <RailBucketHeatmap cells={snapshot.railBucketHeatmap} />
    </div>
  );
}

function BalanceSheetTape({
  attachTapeCanvas,
  resizeTapeCanvas,
}: {
  attachTapeCanvas: (canvas: OffscreenCanvas, layout: TapeCanvasLayout) => void;
  resizeTapeCanvas: (layout: TapeCanvasLayout) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const transferredRef = useRef(false);
  const attachCanvasRef = useCallback(
    (canvas: HTMLCanvasElement | null) => {
      canvasRef.current = canvas;

      if (canvas === null || transferredRef.current) {
        return;
      }

      const layout = readTapeCanvasLayout(canvas);

      sizeCanvasElement(canvas, layout);
      transferredRef.current = true;
      attachTapeCanvas(canvas.transferControlToOffscreen(), layout);
    },
    [attachTapeCanvas],
  );

  useEffect(() => {
    const canvas = canvasRef.current;

    if (canvas === null || !("ResizeObserver" in window)) {
      return undefined;
    }

    const observer = new ResizeObserver(() => {
      resizeTapeCanvas(readTapeCanvasLayout(canvas));
    });

    observer.observe(canvas);

    return () => observer.disconnect();
  }, [resizeTapeCanvas]);

  return (
    <div className="relative overflow-hidden border border-white/[0.075] bg-[#070809]">
      <canvas
        aria-label="Live balance sheet movement tape"
        className="block w-full"
        data-testid="balance-sheet-tape"
        height={tapeCanvasCssHeight}
        ref={attachCanvasRef}
        style={tapeCanvasStyle}
        width={1100}
      />
    </div>
  );
}

function readTapeCanvasLayout(canvas: HTMLCanvasElement): TapeCanvasLayout {
  const rect = canvas.getBoundingClientRect();

  return {
    dpr: Math.max(1, window.devicePixelRatio || 1),
    height: Math.max(1, Math.round(rect.height || canvas.clientHeight || tapeCanvasCssHeight)),
    width: Math.max(1, Math.round(rect.width || canvas.clientWidth || 1_100)),
  };
}

function sizeCanvasElement(canvas: HTMLCanvasElement, layout: TapeCanvasLayout) {
  canvas.height = Math.round(layout.height * layout.dpr);
  canvas.width = Math.round(layout.width * layout.dpr);
}

function RendererMetrics({ snapshot }: { snapshot: OpsStreamSnapshot }) {
  const metrics = [
    ["fps", Math.round(snapshot.renderer.fps).toString()],
    ["frame", `${snapshot.renderer.frameCostMs.toFixed(1)}ms`],
    ["backlog", snapshot.renderer.backlog.toString()],
    ["lag", snapshot.renderer.sequenceLag.toString()],
    ["decoded", `${snapshot.renderer.decodedRate}/s`],
    ["new rows", `${snapshot.renderer.renderedRowRate}/s`],
  ];

  return (
    <div className="grid grid-cols-6 gap-2 text-[11px]">
      {metrics.map(([label, value]) => (
        <div
          className="border border-white/[0.06] bg-white/[0.025] px-2 py-1"
          data-testid={`renderer-metric-${label.replaceAll(" ", "-")}`}
          key={label}
        >
          <p className="uppercase text-bankops-muted">{label}</p>
          <p className="font-semibold text-white">{value}</p>
        </div>
      ))}
    </div>
  );
}

function RailBucketHeatmap({ cells }: { cells: RailBucketHeatmapCell[] }) {
  const cellsByKey = new Map(cells.map((cell) => [heatmapKey(cell.rail, cell.bucket), cell]));
  const hottestCell = cells.reduce<RailBucketHeatmapCell | undefined>((current, cell) => {
    if (current === undefined || cell.intensity > current.intensity) {
      return cell;
    }

    return current;
  }, undefined);

  return (
    <Panel className="overflow-hidden p-0">
      <div className="border-b border-white/[0.075] px-4 py-3">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <p className="text-[11px] font-semibold uppercase tracking-[0.13em] text-bankops-muted">
                Live Flow Concentration
              </p>
              <HeatmapTooltip />
            </div>
            <p className="mt-1 text-sm text-white">
              Rolling 5s amount/sec and movement rate by rail and balance-sheet bucket
            </p>
          </div>

          <HeatmapSignalSummary cell={hottestCell} />
        </div>

        <HeatmapLegend />
      </div>

      <div className="px-4 pb-4 pt-3">
        <div
          className="grid gap-px overflow-hidden border border-white/[0.075] bg-white/[0.065]"
          style={{
            gridTemplateColumns: `112px repeat(${BALANCE_SHEET_BUCKETS.length}, minmax(92px, 1fr))`,
          }}
        >
          <div className="bg-[#101315] px-2.5 py-2 text-[10px] font-semibold uppercase tracking-[0.1em] text-bankops-muted">
            Rail
          </div>
          {BALANCE_SHEET_BUCKETS.map((bucket) => (
            <div
              className="bg-[#101315] px-2.5 py-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-bankops-muted"
              key={bucket}
            >
              {bucketLabel(bucket)}
            </div>
          ))}

          {RAILS.map((rail) => (
            <React.Fragment key={rail}>
              <div className="bg-[#0c0e10] px-2.5 py-3 text-[11px] font-semibold uppercase tracking-[0.1em] text-white">
                {railLabel(rail)}
              </div>
              {BALANCE_SHEET_BUCKETS.map((bucket) => (
                <HeatmapCell
                  cell={cellsByKey.get(heatmapKey(rail, bucket)) ?? emptyHeatmapCell(rail, bucket)}
                  key={bucket}
                />
              ))}
            </React.Fragment>
          ))}
        </div>
      </div>
    </Panel>
  );
}

function HeatmapSignalSummary({ cell }: { cell: RailBucketHeatmapCell | undefined }) {
  if (cell === undefined || cell.intensity === 0) {
    return (
      <div className="hidden min-w-40 text-right text-xs text-bankops-muted xl:block">
        Waiting for flow
      </div>
    );
  }

  return (
    <div className="hidden min-w-56 text-right xl:block">
      <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-bankops-muted">
        Highest amount/sec
      </p>
      <p className="mt-1 text-sm font-medium text-white">
        {railLabel(cell.rail)} / {bucketLabel(cell.bucket)}
      </p>
      <p className="mt-0.5 text-xs text-bankops-muted">
        {formatMinorUsdNumber(cell.amountPerSecMinor)}/s · {formatHeatmapRate(cell.movementRate)}{" "}
        movements/s
      </p>
    </div>
  );
}

function HeatmapLegend() {
  return (
    <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-bankops-muted">
      <LegendItem color="rgba(251,191,36,0.95)" label="Yellow border: 5%+ exceptions" />
      <span className="hidden text-[11px] text-bankops-muted/80 xl:inline">
        Stronger tint means higher amount/sec in the rolling 5s window.
      </span>
    </div>
  );
}

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="size-2.5 border border-white/15" style={{ backgroundColor: color }} />
      {label}
    </span>
  );
}

function HeatmapTooltip() {
  return (
    <span className="group relative inline-flex">
      <button
        aria-label="Explain live flow concentration"
        className="inline-flex size-4 items-center justify-center rounded-full border border-white/[0.12] text-bankops-muted transition-colors hover:border-white/25 hover:text-white focus:outline-none focus:ring-2 focus:ring-slate-300/35"
        type="button"
      >
        <Info aria-hidden="true" className="size-3" />
      </button>
      <span
        className="pointer-events-none absolute left-1/2 top-6 z-30 w-80 -translate-x-1/2 border border-white/[0.12] bg-[#111315] p-3 text-left text-xs leading-5 text-bankops-muted opacity-0 shadow-xl shadow-black/35 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100"
        role="tooltip"
      >
        Each cell summarizes balance-sheet tape movements over the last 5 seconds. Rows are payment
        rails; columns are balance-sheet buckets. Dollar values are amount/sec; /s is movement
        count/sec. Stronger green/red tint means more amount/sec, with color indicating the dominant
        side. Yellow borders mark cells where pending, held, or failed movements are at least 5%.
      </span>
    </span>
  );
}

function HeatmapCell({ cell }: { cell: RailBucketHeatmapCell }) {
  const isActive = cell.intensity > 0;
  const isElevatedException = cell.exceptionRate >= elevatedExceptionRate;
  const sideRgb = cell.skew >= 0 ? "34,197,94" : "244,63,94";
  const heat = isActive ? Math.pow(cell.intensity, 1.55) : 0;
  const primaryAlpha = isActive ? 0.02 + heat * 0.5 : 0.018;
  const secondaryAlpha = isActive ? 0.01 + heat * 0.26 : 0.01;
  const edgeAlpha = isActive ? 0.004 + heat * 0.08 : 0.004;
  const amountLabel = isActive ? formatMinorUsdNumber(cell.amountPerSecMinor) : "$0";
  const rateLabel = isActive ? `${formatHeatmapRate(cell.movementRate)}/s` : "0/s";

  return (
    <div
      className="relative min-h-[64px] bg-[#101315] px-2.5 py-2.5"
      style={{
        background: `linear-gradient(135deg, rgba(${sideRgb},${primaryAlpha}) 0%, rgba(${sideRgb},${secondaryAlpha}) 52%, rgba(${sideRgb},${edgeAlpha}) 100%), #101315`,
      }}
    >
      <div className="flex items-start justify-between gap-2 text-xs">
        <span className={isActive ? "font-semibold text-white" : "font-medium text-bankops-muted"}>
          {amountLabel}
        </span>
        <span className="text-bankops-muted">{rateLabel}</span>
      </div>

      {isElevatedException ? (
        <div className="mt-2 text-[10px] font-medium text-amber-300">
          {formatPercent(cell.exceptionRate)} exceptions
        </div>
      ) : isActive ? (
        <div className="mt-2 h-4" />
      ) : (
        <div className="mt-2 text-[10px] text-bankops-muted/45">No flow</div>
      )}

      {isElevatedException ? (
        <div className="pointer-events-none absolute inset-0 border border-amber-300/90" />
      ) : null}
    </div>
  );
}

function emptyHeatmapCell(rail: Rail, bucket: BalanceSheetBucket): RailBucketHeatmapCell {
  return {
    amountPerSecMinor: 0,
    bucket,
    creditMinor: 0,
    debitMinor: 0,
    exceptionRate: 0,
    intensity: 0,
    movementRate: 0,
    rail,
    skew: 0,
  };
}

function formatMinorUsdNumber(value: number) {
  return usdCompact.format(value / 100);
}

function formatHeatmapRate(value: number) {
  if (value > 0 && value < 10) {
    return value.toFixed(1);
  }

  return Math.round(value).toString();
}

function formatPercent(value: number) {
  return `${Math.round(value * 100)}%`;
}

function railLabel(rail: Rail) {
  return rail.replaceAll("_", " ");
}

function bucketLabel(bucket: BalanceSheetBucket) {
  return bucket.replaceAll("_", " ");
}

function heatmapKey(rail: Rail, bucket: BalanceSheetBucket) {
  return `${rail}:${bucket}`;
}
