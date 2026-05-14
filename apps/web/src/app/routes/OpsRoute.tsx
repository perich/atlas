import React, { useCallback, useEffect, useRef } from "react";
import {
  BALANCE_SHEET_BUCKETS,
  RAILS,
  STREAM_RATES,
  type BalanceSheetBucket,
  type Rail,
  type StreamRate,
} from "@bankops/contracts";
import {
  Activity,
  AlertTriangle,
  BanknoteArrowDown,
  BanknoteArrowUp,
  Gauge,
  RadioTower,
  ShieldAlert,
  Timer,
  Wallet,
} from "lucide-react";

import { useOpsStream } from "../ops/ops-stream-store";
import type {
  OpsChartPoint,
  OpsConnectionStatus,
  OpsStreamSnapshot,
  RailBucketHeatmapCell,
  RailHealthSnapshot,
  TapeCanvasLayout,
} from "../ops/ops-stream-messages";
import { Button, InfoTooltip, PageHeader, Panel } from "../../design/components";

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
const elevatedExceptionRate = 0.05;
const pressureClassNames = {
  nominal: "text-emerald-300",
  watch: "text-amber-300",
  strained: "text-rose-300",
} as const;

export function OpsRoute() {
  const { attachTapeCanvas, resizeTapeCanvas, setStreamRate, snapshot } = useOpsStream();

  return (
    <div className="space-y-5">
      <PageHeader eyebrow="God Mode" title="Operations control plane" />

      <OpsTopBand snapshot={snapshot} />

      <div className="grid min-h-[calc(100vh-18rem)] items-stretch gap-5 xl:grid-cols-[minmax(0,1fr)_18rem]">
        <Panel className="flex min-h-0 flex-col overflow-hidden p-0">
          <div className="shrink-0 border-b border-white/[0.075] bg-black/20 px-4 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.13em] text-bankops-muted">
              Balance Sheet Tape
            </p>
            <p className="mt-1 text-sm text-white">Global debit and credit movement stream</p>
          </div>

          <BalanceSheetTape
            attachTapeCanvas={attachTapeCanvas}
            resizeTapeCanvas={resizeTapeCanvas}
          />
        </Panel>

        <OpsSideRail setStreamRate={setStreamRate} snapshot={snapshot} />
      </div>

      <OpsBottomBand snapshot={snapshot} />
      <RailBucketHeatmap cells={snapshot.railBucketHeatmap} />
    </div>
  );
}

function OpsTopBand({ snapshot }: { snapshot: OpsStreamSnapshot }) {
  const worstRail = mostSevereRail(snapshot.railHealth);

  return (
    <section className="grid gap-3 xl:grid-cols-6">
      <OpsMetricCard
        icon={Activity}
        label="Event rate"
        tooltip="Hot stream movements received from the Node stream server per second. This is stream throughput, not React render frequency."
        value={`${formatCount(snapshot.eventRate)}/s`}
      />
      <OpsMetricCard
        icon={BanknoteArrowUp}
        label="Credits"
        tooltip="Cumulative inbound balance-sheet movement in the current simulator session, counted from synthetic credit entries."
        value={formatMinorString(snapshot.cumulativeCreditsMinor)}
      />
      <OpsMetricCard
        icon={BanknoteArrowDown}
        label="Debits"
        tooltip="Cumulative outbound balance-sheet movement in the current simulator session, counted from synthetic debit entries."
        value={formatMinorString(snapshot.cumulativeDebitsMinor)}
      />
      <OpsMetricCard
        icon={Wallet}
        label="Liquidity"
        tooltip="Current simulated reserve-cash balance after applying raw balance-sheet movements. This is bank liquidity in the model, not browser memory or app health."
        value={formatMinorString(snapshot.liquidityReserveMinor)}
      />
      <OpsMetricCard
        icon={ShieldAlert}
        label="Open exceptions"
        tooltip="Synthetic backlog of failed, held, or exception-hold movements that still need reconciliation or manual review."
        value={formatCount(snapshot.exceptionQueueDepth)}
      />
      <OpsMetricCard
        icon={RadioTower}
        label="Rail health"
        tooltip="Worst current simulated payment-rail status, derived from rail failure rate, held movement count, pending count, and recent activity."
        tone={worstRail?.status}
        value={worstRail === undefined ? "Waiting" : railStatusLabel(worstRail)}
      />
    </section>
  );
}

function OpsMetricCard({
  icon: Icon,
  label,
  tone,
  tooltip,
  value,
}: {
  icon: React.ComponentType<{ "aria-hidden": true; className: string }>;
  label: string;
  tone?: RailHealthSnapshot["status"];
  tooltip: string;
  value: React.ReactNode;
}) {
  return (
    <article className="min-w-0 rounded-[5px] border border-white/[0.075] bg-white/[0.022] p-3 shadow-[0_1px_0_rgba(255,255,255,0.018)_inset]">
      <div className="mb-3 flex items-center gap-2 text-bankops-muted">
        <Icon aria-hidden={true} className="size-3.5 shrink-0 text-sky-300/85" />
        <p className="truncate text-[10px] font-semibold uppercase tracking-[0.14em]">{label}</p>
        <InfoTooltip label={`Explain ${label}`}>{tooltip}</InfoTooltip>
      </div>
      <p
        className={`truncate text-[1.35rem] font-semibold leading-none tracking-tight ${tone === undefined ? "text-white" : railHealthClassName(tone)}`}
      >
        {value}
      </p>
    </article>
  );
}

function OpsSideRail({
  setStreamRate,
  snapshot,
}: {
  setStreamRate: (streamRate: StreamRate) => void;
  snapshot: OpsStreamSnapshot;
}) {
  const pressure = streamPressure(snapshot);

  return (
    <aside className="space-y-4 xl:sticky xl:top-20 xl:self-start">
      <Panel title="Stream Control">
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs text-bankops-muted">Connection</span>
            <span
              className={statusClassNames[snapshot.connectionStatus]}
              data-testid="ops-connection-status"
            >
              {statusLabels[snapshot.connectionStatus]}
            </span>
          </div>

          <div className="flex items-center justify-between gap-3">
            <span className="text-xs text-bankops-muted">Sequence</span>
            <span className="text-xs font-medium text-white">seq {snapshot.seq}</span>
          </div>

          <div>
            <p className="mb-2 text-xs font-medium text-bankops-muted">Stream rate</p>
            <div className="grid grid-cols-2 gap-2">
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
      </Panel>

      <Panel title="Performance HUD">
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3 border-b border-white/[0.075] pb-3">
            <span className="inline-flex items-center gap-2 text-xs text-bankops-muted">
              <Gauge aria-hidden="true" className="size-4" />
              Stream pressure
            </span>
            <span
              className={`text-xs font-semibold ${pressureClassNames[pressure.level]}`}
              data-testid="ops-stream-pressure"
            >
              {pressure.label}
            </span>
          </div>
          <RendererMetrics snapshot={snapshot} />
        </div>
      </Panel>

      <Panel title="Rail Health">
        <RailHealthList rails={snapshot.railHealth} />
      </Panel>
    </aside>
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
    <div className="relative min-h-0 flex-1 overflow-hidden border border-white/[0.075] bg-[#070809]">
      <canvas
        aria-label="Live balance sheet movement tape"
        className="block size-full"
        data-testid="balance-sheet-tape"
        height={tapeCanvasCssHeight}
        ref={attachCanvasRef}
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
    <div className="grid grid-cols-2 gap-2 text-[11px]">
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

function RailHealthList({ rails }: { rails: RailHealthSnapshot[] }) {
  if (rails.length === 0) {
    return <p className="text-xs text-bankops-muted">Waiting for rail telemetry.</p>;
  }

  return (
    <div className="space-y-2">
      {rails.map((rail) => (
        <div
          className="grid grid-cols-[1fr_auto] gap-3 border-b border-white/[0.055] pb-2 last:border-0 last:pb-0"
          key={rail.rail}
        >
          <div>
            <p className="text-xs font-medium text-white">{railLabel(rail.rail)}</p>
            <p className="mt-0.5 text-[11px] text-bankops-muted">
              {formatCount(rail.eventsPerSec)}/s · p95 {formatLatency(rail.p95LatencyMs)}
            </p>
          </div>
          <span className={`text-[11px] font-semibold ${railHealthClassName(rail.status)}`}>
            {statusLabel(rail.status)}
          </span>
        </div>
      ))}
    </div>
  );
}

function OpsBottomBand({ snapshot }: { snapshot: OpsStreamSnapshot }) {
  return (
    <section className="grid gap-4 xl:grid-cols-4">
      <SparklinePanel
        icon={Activity}
        label="Throughput"
        tooltip="Warm snapshot of hot stream movement rate. This should track the selected stream rate, while React only receives coalesced snapshots."
        value={`${formatCount(snapshot.eventRate)}/s`}
        points={snapshot.chart}
        valueForPoint={(point) => point.eventRate}
      />
      <SparklinePanel
        icon={Timer}
        label="Movement p95"
        tooltip="Simulated bank-core movement latency at p95 for the rolling chart window. This is rail/settlement latency, not UI or canvas render latency."
        value={formatLatencySeconds(lastChartPoint(snapshot.chart)?.latencyP95Ms ?? 0)}
        points={snapshot.chart}
        valueForPoint={(point) => point.latencyP95Ms}
      />
      <SparklinePanel
        icon={AlertTriangle}
        label="Exception rate"
        tooltip="Share of recent movements that are failed, held, or otherwise routed toward exception handling in the synthetic bank model."
        value={formatPercent(lastChartPoint(snapshot.chart)?.failureRate ?? 0)}
        points={snapshot.chart}
        valueForPoint={(point) => point.failureRate}
      />
      <SparklinePanel
        icon={ShieldAlert}
        label="Exception queue"
        tooltip="Open exception backlog awaiting reconciliation or manual review. It rises when failed or held movements arrive and falls when simulated reversals clear work."
        value={formatCount(snapshot.exceptionQueueDepth)}
        points={snapshot.chart}
        valueForPoint={(point) => point.exceptionQueueDepth}
      />
    </section>
  );
}

function SparklinePanel({
  icon: Icon,
  label,
  points,
  tooltip,
  value,
  valueForPoint,
}: {
  icon: React.ComponentType<{ "aria-hidden": true; className: string }>;
  label: string;
  points: OpsChartPoint[];
  tooltip: string;
  value: string;
  valueForPoint: (point: OpsChartPoint) => number;
}) {
  const values = points.map(valueForPoint);

  return (
    <Panel className="min-w-0 p-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-bankops-muted">
            <Icon aria-hidden={true} className="size-3.5" />
            {label}
            <InfoTooltip label={`Explain ${label}`}>{tooltip}</InfoTooltip>
          </div>
          <p className="mt-2 text-lg font-semibold leading-none text-white">{value}</p>
        </div>
      </div>
      <Sparkline values={values} />
    </Panel>
  );
}

function Sparkline({ values }: { values: number[] }) {
  if (values.length < 2) {
    return (
      <div className="mt-3 flex h-12 items-center border border-white/[0.055] bg-white/[0.018] px-3 text-xs text-bankops-muted">
        Waiting for samples
      </div>
    );
  }

  const width = 160;
  const height = 48;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const path = values
    .map((value, index) => {
      const x = (index / (values.length - 1)) * width;
      const y = height - ((value - min) / span) * (height - 8) - 4;

      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  return (
    <svg
      aria-hidden="true"
      className="mt-3 h-12 w-full border border-white/[0.055] bg-white/[0.018]"
      preserveAspectRatio="none"
      viewBox={`0 0 ${width} ${height}`}
    >
      <polyline
        fill="none"
        points={path}
        stroke="#86efac"
        strokeWidth="2"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
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
              <InfoTooltip label="Explain live flow concentration">
                Each cell summarizes balance-sheet tape movements over the last 5 seconds. Rows are
                payment rails; columns are balance-sheet buckets. Dollar values are amount/sec; /s
                is movement count/sec. Stronger green/red tint means more amount/sec, with color
                indicating the dominant side. Yellow borders mark cells where pending, held, or
                failed movements are at least 5%.
              </InfoTooltip>
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
      className="relative min-h-[64px] bg-[#101315] p-2.5"
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

function formatMinorString(value: string) {
  return formatMinorUsdNumber(Number.parseFloat(value));
}

function formatCount(value: number) {
  return Math.round(value).toLocaleString("en-US");
}

function formatLatency(value: number) {
  return `${Math.round(value).toLocaleString("en-US")}ms`;
}

function formatLatencySeconds(value: number) {
  return `${(value / 1_000).toFixed(1)}s`;
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

function lastChartPoint(points: OpsChartPoint[]) {
  return points.at(-1);
}

function mostSevereRail(rails: RailHealthSnapshot[]) {
  return rails.reduce<RailHealthSnapshot | undefined>((current, rail) => {
    if (current === undefined || railSeverity(rail.status) > railSeverity(current.status)) {
      return rail;
    }

    return current;
  }, undefined);
}

function railSeverity(status: RailHealthSnapshot["status"]) {
  switch (status) {
    case "incident":
      return 2;
    case "degraded":
      return 1;
    case "nominal":
      return 0;
  }

  return 0;
}

function railStatusLabel(rail: RailHealthSnapshot) {
  return `${railLabel(rail.rail)} ${statusLabel(rail.status)}`;
}

function statusLabel(status: RailHealthSnapshot["status"]) {
  return status[0].toUpperCase() + status.slice(1);
}

function railHealthClassName(status: RailHealthSnapshot["status"]) {
  switch (status) {
    case "incident":
      return "text-rose-300";
    case "degraded":
      return "text-amber-300";
    case "nominal":
      return "text-emerald-300";
  }

  return "text-bankops-muted";
}

function streamPressure(snapshot: OpsStreamSnapshot): {
  label: string;
  level: keyof typeof pressureClassNames;
} {
  const { renderer } = snapshot;

  if (snapshot.connectionStatus === "connecting" || snapshot.connectionStatus === "reconnecting") {
    return { label: "Watch", level: "watch" };
  }

  if (snapshot.connectionStatus === "degraded" || renderer.fps < 35 || renderer.frameCostMs > 18) {
    return { label: "Strained", level: "strained" };
  }

  if (
    renderer.fps < 55 ||
    renderer.frameCostMs > 10 ||
    renderer.sequenceLag > Math.max(250, snapshot.eventRate * 0.25) ||
    renderer.backlog > 0
  ) {
    return { label: "Watch", level: "watch" };
  }

  return { label: "Nominal", level: "nominal" };
}

function railLabel(rail: Rail) {
  return titleize(rail);
}

function bucketLabel(bucket: BalanceSheetBucket) {
  return titleize(bucket);
}

function heatmapKey(rail: Rail, bucket: BalanceSheetBucket) {
  return `${rail}:${bucket}`;
}

function titleize(value: string) {
  return value
    .split("_")
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join(" ");
}
