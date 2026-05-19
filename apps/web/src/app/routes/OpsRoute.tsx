import React from "react";
import type { StreamRate } from "@bankops/contracts";

import { BalanceSheetTape } from "../ops/BalanceSheetTape";
import { OpsBottomBand } from "../ops/OpsBottomBand";
import { OpsSideRail } from "../ops/OpsSideRail";
import { OpsTopBand } from "../ops/OpsTopBand";
import { RailBucketHeatmap } from "../ops/RailBucketHeatmap";
import {
  selectOpsRenderer,
  selectRailBucketHeatmap,
  useOpsStreamControls,
  useOpsStreamSelector,
  useOpsStreamSnapshot,
} from "../ops/ops-stream-store";
import { Panel } from "../../design/components";

export function OpsRoute() {
  const { attachTapeCanvas, resizeTapeCanvas, setStreamRate } = useOpsStreamControls();

  return (
    <div className="min-h-[calc(100vh-5.25rem)] overflow-hidden rounded-[4px] border border-white/[0.06] bg-bankops-panel shadow-[0_8px_40px_rgba(0,0,0,0.6)]">
      <OpsHeroHeaderStream />

      <OpsTopBandStream />

      <div className="grid h-[clamp(40rem,calc(100vh-30rem),68rem)] items-stretch xl:grid-cols-[minmax(0,1fr)_18.75rem]">
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
  return <OpsHeroHeader />;
}

const OpsHeroHeader = React.memo(function OpsHeroHeader() {
  return (
    <div className="border-b border-white/[0.06] bg-bankops-sidebar px-6 py-5">
      <div>
        <h1 className="mb-3 text-2xl font-semibold leading-tight tracking-[-0.02em] text-bankops-text">
          Operations Control Plane
        </h1>
        <div className="flex items-center gap-1.5">
          <span className="inline-flex border border-bankops-positive-strong/20 bg-bankops-positive-strong/10 px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-bankops-positive-strong">
            Live
          </span>
        </div>
      </div>
    </div>
  );
});

function OpsTopBandStream() {
  return <OpsTopBand snapshot={useOpsStreamSnapshot()} />;
}

function TapeHeaderStream() {
  const renderer = useOpsStreamSelector(selectOpsRenderer);

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
  return <RailBucketHeatmap cells={useOpsStreamSelector(selectRailBucketHeatmap)} />;
}
