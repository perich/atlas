import React from "react";
import {
  BALANCE_SHEET_BUCKETS,
  RAILS,
  type BalanceSheetBucket,
  type Rail,
} from "@bankops/contracts";

import type { RailBucketHeatmapCell } from "./ops-stream-messages";
import { titleize } from "./ops-format";
import { InfoTooltip, Panel } from "../../design/components";
import { formatMinorUsd, formatPercent } from "../../design/format";

const elevatedExceptionRate = 0.05;
const emptyHeatmapCells = new Map<string, RailBucketHeatmapCell>(
  RAILS.flatMap((rail) =>
    BALANCE_SHEET_BUCKETS.map((bucket): [string, RailBucketHeatmapCell] => [
      heatmapKey(rail, bucket),
      createEmptyHeatmapCell(rail, bucket),
    ]),
  ),
);

export function RailBucketHeatmap({ cells }: { cells: RailBucketHeatmapCell[] }) {
  const cellsByKey = new Map(cells.map((cell) => [heatmapKey(cell.rail, cell.bucket), cell]));
  const hottestCell = cells.reduce<RailBucketHeatmapCell | undefined>((current, cell) => {
    if (current === undefined || cell.intensity > current.intensity) {
      return cell;
    }

    return current;
  }, undefined);

  return (
    <Panel className="overflow-hidden rounded-none border-0 border-t border-white/[0.08] p-0">
      <div className="border-b border-white/[0.08] bg-bankops-panel px-4 py-3">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="h-4 w-0.5 bg-bankops-text" />
              <p className="text-xs font-bold uppercase tracking-widest text-bankops-muted">
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
            <p className="mt-1 text-xs text-[#5a6272]">
              Rolling 5s amount/sec and movement rate by rail and balance-sheet bucket
            </p>
          </div>

          <HeatmapSignalSummary cell={hottestCell} />
        </div>

        <HeatmapLegend />
      </div>

      <div className="overflow-x-auto bg-bankops-bg p-4">
        <div
          className="grid gap-px overflow-hidden border border-white/[0.08] bg-white/[0.06]"
          style={{
            gridTemplateColumns: `112px repeat(${BALANCE_SHEET_BUCKETS.length}, minmax(92px, 1fr))`,
          }}
        >
          <div className="bg-[#0f1012] px-2.5 py-2 text-[9px] font-semibold uppercase tracking-widest text-[#5a6272]">
            Rail
          </div>
          {BALANCE_SHEET_BUCKETS.map((bucket) => (
            <div
              className="bg-[#0f1012] px-2.5 py-2 text-[9px] font-semibold uppercase tracking-widest text-[#5a6272]"
              key={bucket}
            >
              {titleize(bucket)}
            </div>
          ))}

          {RAILS.map((rail) => (
            <React.Fragment key={rail}>
              <div className="bg-[#0c0d0e] px-2.5 py-3 font-mono text-[10px] font-semibold uppercase tracking-wider text-bankops-text">
                {titleize(rail)}
              </div>
              {BALANCE_SHEET_BUCKETS.map((bucket) => {
                const key = heatmapKey(rail, bucket);

                return (
                  <HeatmapCell
                    cell={cellsByKey.get(key) ?? emptyHeatmapCells.get(key)!}
                    key={bucket}
                  />
                );
              })}
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
      <p className="text-[10px] font-semibold uppercase tracking-widest text-[#5a6272]">
        Highest amount/sec
      </p>
      <p className="mt-1 text-sm font-medium text-bankops-text">
        {titleize(cell.rail)} / {titleize(cell.bucket)}
      </p>
      <p className="mt-0.5 font-mono text-[11px] text-[#5a6272]">
        {formatMinorUsd(cell.amountPerSecMinor)}/s · {formatHeatmapRate(cell.movementRate)}{" "}
        movements/s
      </p>
    </div>
  );
}

const HeatmapLegend = React.memo(function HeatmapLegend() {
  return (
    <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-bankops-muted">
      <LegendItem color="rgba(251,191,36,0.95)" label="Yellow border: 5%+ exceptions" />
      <span className="hidden text-[11px] text-bankops-muted/80 xl:inline">
        Stronger tint means higher amount/sec in the rolling 5s window.
      </span>
    </div>
  );
});

const LegendItem = React.memo(function LegendItem({
  color,
  label,
}: {
  color: string;
  label: string;
}) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="size-2.5 border border-white/15" style={{ backgroundColor: color }} />
      {label}
    </span>
  );
});

const HeatmapCell = React.memo(function HeatmapCell({ cell }: { cell: RailBucketHeatmapCell }) {
  const isActive = cell.intensity > 0;
  const isElevatedException = cell.exceptionRate >= elevatedExceptionRate;
  const sideRgb = cell.skew >= 0 ? "34,197,94" : "244,63,94";
  const heat = isActive ? Math.pow(cell.intensity, 1.55) : 0;
  const primaryAlpha = isActive ? 0.02 + heat * 0.5 : 0.018;
  const secondaryAlpha = isActive ? 0.01 + heat * 0.26 : 0.01;
  const edgeAlpha = isActive ? 0.004 + heat * 0.08 : 0.004;
  const amountLabel = isActive ? formatMinorUsd(cell.amountPerSecMinor) : "$0";
  const rateLabel = isActive ? `${formatHeatmapRate(cell.movementRate)}/s` : "0/s";

  return (
    <div
      className="relative min-h-[64px] bg-[#101315] p-2.5"
      style={{
        background: `linear-gradient(135deg, rgba(${sideRgb},${primaryAlpha}) 0%, rgba(${sideRgb},${secondaryAlpha}) 52%, rgba(${sideRgb},${edgeAlpha}) 100%), #101315`,
      }}
    >
      <div className="flex items-start justify-between gap-2 font-mono text-[11px]">
        <span
          className={isActive ? "font-semibold text-bankops-text" : "font-medium text-[#5a6272]"}
        >
          {amountLabel}
        </span>
        <span className="text-[#5a6272]">{rateLabel}</span>
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
}, areHeatmapCellsEqual);

function areHeatmapCellsEqual(
  previous: { cell: RailBucketHeatmapCell },
  next: { cell: RailBucketHeatmapCell },
) {
  return (
    previous.cell.amountPerSecMinor === next.cell.amountPerSecMinor &&
    previous.cell.bucket === next.cell.bucket &&
    previous.cell.creditMinor === next.cell.creditMinor &&
    previous.cell.debitMinor === next.cell.debitMinor &&
    previous.cell.exceptionRate === next.cell.exceptionRate &&
    previous.cell.intensity === next.cell.intensity &&
    previous.cell.movementRate === next.cell.movementRate &&
    previous.cell.rail === next.cell.rail &&
    previous.cell.skew === next.cell.skew
  );
}

function createEmptyHeatmapCell(rail: Rail, bucket: BalanceSheetBucket): RailBucketHeatmapCell {
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

function formatHeatmapRate(value: number) {
  if (value > 0 && value < 10) {
    return value.toFixed(1);
  }

  return Math.round(value).toString();
}

function heatmapKey(rail: Rail, bucket: BalanceSheetBucket) {
  return `${rail}:${bucket}`;
}
