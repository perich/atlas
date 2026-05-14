import React from "react";

import { BalanceSheetTape } from "../ops/BalanceSheetTape";
import { OpsBottomBand } from "../ops/OpsBottomBand";
import { OpsSideRail } from "../ops/OpsSideRail";
import { OpsTopBand } from "../ops/OpsTopBand";
import { RailBucketHeatmap } from "../ops/RailBucketHeatmap";
import { useOpsStream } from "../ops/ops-stream-store";
import { PageHeader, Panel } from "../../design/components";

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
