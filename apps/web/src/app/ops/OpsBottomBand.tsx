import React from "react";
import { Activity, AlertTriangle, ShieldAlert, Timer } from "lucide-react";

import type { OpsChartPoint, OpsStreamSnapshot } from "./ops-stream-messages";
import { InfoTooltip, Panel } from "../../design/components";
import { formatCount, formatPercent, formatSecondsFromMs } from "../../design/format";

export function OpsBottomBand({ snapshot }: { snapshot: OpsStreamSnapshot }) {
  return (
    <section className="grid border-t border-white/[0.08] xl:grid-cols-4">
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
        value={formatSecondsFromMs(lastChartPoint(snapshot.chart)?.p95LatencyMs ?? 0)}
        points={snapshot.chart}
        valueForPoint={(point) => point.p95LatencyMs}
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
    <Panel className="min-w-0 rounded-none border-0 border-r border-white/[0.08] bg-bankops-panel p-3 last:border-r-0">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-bankops-muted">
            <Icon aria-hidden={true} className="size-3.5" />
            {label}
            <InfoTooltip label={`Explain ${label}`}>{tooltip}</InfoTooltip>
          </div>
          <p className="mt-2 font-mono text-lg leading-none text-bankops-text">{value}</p>
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
      className="mt-3 h-10 w-full border border-white/[0.055] bg-[#0d0f10]"
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

function lastChartPoint(points: OpsChartPoint[]) {
  return points.at(-1);
}
