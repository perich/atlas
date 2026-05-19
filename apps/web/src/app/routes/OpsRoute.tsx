import React from "react";
import type { StreamRate } from "@bankops/contracts";

import { BalanceSheetTape } from "../ops/BalanceSheetTape";
import { OpsBottomBand } from "../ops/OpsBottomBand";
import { OpsSideRail, streamPressure } from "../ops/OpsSideRail";
import { OpsTopBand } from "../ops/OpsTopBand";
import { RailBucketHeatmap } from "../ops/RailBucketHeatmap";
import type { OpsStreamSnapshot, RailHealthSnapshot } from "../ops/ops-stream-messages";
import { useOpsStreamControls, useOpsStreamSnapshot } from "../ops/ops-stream-store";
import { railHealthSeverity, railStatusLabel } from "../ops/ops-rail-health";
import { Panel } from "../../design/components";

export function OpsRoute() {
  const { attachTapeCanvas, resizeTapeCanvas, setStreamRate } = useOpsStreamControls();

  return (
    <div className="min-h-[calc(100vh-5.25rem)] overflow-hidden rounded-[4px] border border-white/[0.06] bg-bankops-panel shadow-[0_8px_40px_rgba(0,0,0,0.6)]">
      <OpsHeroHeaderStream />

      <OpsTopBandStream />

      <div className="grid min-h-[calc(100vh-22rem)] items-stretch xl:grid-cols-[minmax(0,1fr)_18.75rem]">
        <Panel className="flex min-h-0 flex-col overflow-hidden rounded-none border-0 border-r border-white/[0.06] p-0">
          <TapeHeaderStream />

          <BalanceSheetTape
            attachTapeCanvas={attachTapeCanvas}
            resizeTapeCanvas={resizeTapeCanvas}
          />

          <OpsBottomBandStream />
        </Panel>

        <OpsSideRailStream setStreamRate={setStreamRate} />
      </div>

      <RailBucketHeatmapStream />
    </div>
  );
}

function OpsHeroHeaderStream() {
  return <OpsHeroHeader snapshot={useOpsStreamSnapshot()} />;
}

const OpsHeroHeader = React.memo(function OpsHeroHeader({
  snapshot,
}: {
  snapshot: OpsStreamSnapshot;
}) {
  const worstRail = worstRailHealth(snapshot);
  const pressure = streamPressure(snapshot);

  return (
    <div className="border-b border-white/[0.06] bg-bankops-sidebar px-6 py-5">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="mb-3 text-2xl font-semibold leading-tight tracking-[-0.02em] text-bankops-text">
            Operations Control Plane
          </h1>
          <div className="flex items-center gap-1.5">
            <span className="inline-flex border border-emerald-400/20 bg-emerald-400/10 px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-emerald-400">
              Live
            </span>
            {worstRail !== undefined ? (
              <span
                className={`inline-flex border px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-[0.14em] ${
                  worstRail.status === "incident"
                    ? "border-red-400/20 bg-red-400/10 text-red-400"
                    : worstRail.status === "degraded"
                      ? "border-amber-400/20 bg-amber-400/10 text-amber-400"
                      : "border-emerald-400/20 bg-emerald-400/10 text-emerald-400"
                }`}
              >
                {railStatusLabel(worstRail).toUpperCase()}
              </span>
            ) : null}
          </div>
        </div>
        <div className="grid grid-cols-3 gap-6 text-right">
          <HeaderMetric
            label="Pressure"
            tone={
              pressure.level === "nominal" ? "green" : pressure.level === "watch" ? "amber" : "red"
            }
            value={pressure.label.toUpperCase()}
          />
          <HeaderMetric label="Backlog" value={snapshot.renderer.backlog.toLocaleString()} />
          <HeaderMetric
            label="Frame cost"
            value={`${snapshot.renderer.frameCostMs.toFixed(1)}ms`}
          />
        </div>
      </div>
    </div>
  );
});

function HeaderMetric({
  label,
  tone,
  value,
}: {
  label: string;
  tone?: "amber" | "green" | "red";
  value: string;
}) {
  return (
    <div>
      <p className="font-mono text-[10px] font-medium uppercase tracking-[0.18em] text-bankops-subtle">
        {label}
      </p>
      <p
        className={`mt-1 font-mono text-xl font-semibold tracking-[-0.01em] ${
          tone === "green"
            ? "text-emerald-400"
            : tone === "amber"
              ? "text-amber-400"
              : tone === "red"
                ? "text-red-400"
                : "text-bankops-text"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function OpsTopBandStream() {
  return <OpsTopBand snapshot={useOpsStreamSnapshot()} />;
}

function TapeHeaderStream() {
  const { renderer } = useOpsStreamSnapshot();

  return (
    <div className="flex shrink-0 items-center justify-between border-b border-white/[0.06] border-l-2 border-l-bankops-accent bg-bankops-sidebar px-4 py-2.5">
      <div className="flex items-center gap-3">
        <p className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-bankops-muted">
          Live Tape Feed
        </p>
      </div>
      <div className="flex items-center gap-3 font-mono text-[10px] text-bankops-subtle">
        <span>decoded {renderer.decodedRate.toLocaleString()}/s</span>
        <span>latency {renderer.frameCostMs.toFixed(1)}ms</span>
        <span>backlog {renderer.backlog.toLocaleString()}</span>
      </div>
    </div>
  );
}

function OpsBottomBandStream() {
  return <OpsBottomBand snapshot={useOpsStreamSnapshot()} />;
}

function OpsSideRailStream({ setStreamRate }: { setStreamRate: (streamRate: StreamRate) => void }) {
  return <OpsSideRail setStreamRate={setStreamRate} snapshot={useOpsStreamSnapshot()} />;
}

function RailBucketHeatmapStream() {
  return <RailBucketHeatmap cells={useOpsStreamSnapshot().railBucketHeatmap} />;
}

function worstRailHealth(snapshot: OpsStreamSnapshot) {
  return snapshot.railHealth.reduce<RailHealthSnapshot | undefined>((current, rail) => {
    if (
      current === undefined ||
      railHealthSeverity[rail.status] > railHealthSeverity[current.status]
    ) {
      return rail;
    }

    return current;
  }, undefined);
}
