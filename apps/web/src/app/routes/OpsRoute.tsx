import React from "react";
import type { StreamRate } from "@bankops/contracts";

import { BalanceSheetTape } from "../ops/BalanceSheetTape";
import { OpsBottomBand } from "../ops/OpsBottomBand";
import { OpsSideRail } from "../ops/OpsSideRail";
import { OpsTopBand } from "../ops/OpsTopBand";
import { RailBucketHeatmap } from "../ops/RailBucketHeatmap";
import { useOpsStreamControls, useOpsStreamSnapshot } from "../ops/ops-stream-store";
import { PageHeader, Panel } from "../../design/components";

export function OpsRoute() {
  const { attachTapeCanvas, resizeTapeCanvas, setStreamRate } = useOpsStreamControls();

  return (
    <div className="min-h-[calc(100vh-5.25rem)] overflow-hidden rounded-md border border-white/[0.08] bg-bankops-bg">
      <OpsHeroHeader />

      <OpsTopBandStream />

      <div className="grid min-h-[calc(100vh-22rem)] items-stretch xl:grid-cols-[minmax(0,3fr)_20rem]">
        <Panel className="flex min-h-0 flex-col overflow-hidden rounded-none border-0 border-r border-white/[0.08] p-0">
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

const OpsHeroHeader = React.memo(function OpsHeroHeader() {
  return (
    <div className="border-b border-white/[0.08] bg-bankops-sidebar px-6 py-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="mb-2 flex items-center gap-3">
            <span className="border border-white/[0.08] px-2 py-0.5 font-mono text-[10px] uppercase tracking-widest text-bankops-muted">
              God Mode
            </span>
            <span className="inline-flex items-center gap-1.5 bg-emerald-400/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-300">
              <span className="size-1.5 rounded-full bg-emerald-300 shadow-[0_0_8px_rgba(74,222,128,0.7)]" />
              Live
            </span>
          </div>
          <PageHeader eyebrow="Operations" title="Operations Control Plane" />
        </div>
      </div>
    </div>
  );
});

function OpsTopBandStream() {
  return <OpsTopBand snapshot={useOpsStreamSnapshot()} />;
}

function TapeHeaderStream() {
  const { renderer } = useOpsStreamSnapshot();

  return (
    <div className="flex shrink-0 items-center justify-between border-b border-white/[0.08] bg-bankops-panel px-4 py-3">
      <div className="flex items-center gap-3">
        <span className="h-4 w-0.5 bg-bankops-text" />
        <p className="text-xs font-bold uppercase tracking-widest text-bankops-muted">
          Live Tape Feed
        </p>
      </div>
      <div className="flex items-center gap-4 font-mono text-[10px] uppercase text-[#5a6272]">
        <span>Packet latency {renderer.frameCostMs.toFixed(1)}ms</span>
        <span>Backlog {renderer.backlog}</span>
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
