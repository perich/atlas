import React, { useCallback, useRef } from "react";
import { STREAM_RATES, type StreamRate } from "@bankops/contracts";
import { Activity, Gauge, Landmark, RadioTower } from "lucide-react";

import { useOpsStream } from "../ops/ops-stream-store";
import type { OpsConnectionStatus, OpsStreamSnapshot } from "../ops/ops-stream-messages";
import { Button, PageHeader, Panel, StatCard } from "../../design/components";

const healthChecks = ["Core ledger", "Wire rail", "Stablecoin settlement", "Audit writer"];
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
  50: "50/s",
  2_000: "2k/s",
  10_000: "10k/s",
};

export function OpsRoute() {
  const { attachTapeCanvas, setStreamRate, snapshot } = useOpsStream();
  const railHealth = snapshot.railHealth.length > 0 ? snapshot.railHealth : undefined;

  return (
    <div className="space-y-5">
      <PageHeader eyebrow="God Mode" title="Operations control plane" />

      <section className="grid gap-3 xl:grid-cols-4">
        <StatCard
          icon={RadioTower}
          label="Connection"
          value={statusLabels[snapshot.connectionStatus]}
        />
        <StatCard icon={Activity} label="Warm rate" value={`${Math.round(snapshot.eventRate)}/s`} />
        <StatCard
          icon={Landmark}
          label="Liquidity"
          value={formatMinorUsd(snapshot.liquidityReserveMinor)}
        />
        <StatCard icon={Gauge} label="Hot movement rate" value={`${snapshot.movementRate}/s`} />
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.5fr_1fr]">
        <Panel className="min-h-[420px]" title="Balance Sheet Tape">
          <div className="flex h-[360px] flex-col justify-between border border-dashed border-white/[0.1] bg-black/20 p-4">
            <div className="flex items-center justify-between text-xs text-bankops-muted">
              <span>SettlementStream seq {snapshot.seq}</span>
              <span className={statusClassNames[snapshot.connectionStatus]}>
                {statusLabels[snapshot.connectionStatus]}
              </span>
            </div>

            <BalanceSheetTape attachTapeCanvas={attachTapeCanvas} />

            <div className="grid gap-3">
              <RendererMetrics snapshot={snapshot} />

              <div className="flex items-center justify-between gap-3">
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
        </Panel>

        <Panel title="System Health">
          <div className="space-y-3">
            {railHealth === undefined
              ? healthChecks.map((label) => <HealthRow key={label} label={label} value="Waiting" />)
              : railHealth.map((rail) => (
                  <HealthRow
                    key={rail.rail}
                    label={rail.rail.replaceAll("_", " ")}
                    value={`${rail.status} · ${Math.round(rail.eventsPerSec)}/s`}
                  />
                ))}
          </div>
        </Panel>
      </section>
    </div>
  );
}

function BalanceSheetTape({
  attachTapeCanvas,
}: {
  attachTapeCanvas: (canvas: OffscreenCanvas) => void;
}) {
  const transferredRef = useRef(false);
  const attachCanvasRef = useCallback(
    (canvas: HTMLCanvasElement | null) => {
      if (canvas === null || transferredRef.current || !("transferControlToOffscreen" in canvas)) {
        return;
      }

      transferredRef.current = true;
      attachTapeCanvas(canvas.transferControlToOffscreen());
    },
    [attachTapeCanvas],
  );

  return (
    <div className="relative overflow-hidden border border-white/[0.075] bg-[#070809]">
      <canvas
        aria-label="Live balance sheet movement tape"
        className="block h-[236px] w-full"
        data-testid="balance-sheet-tape"
        height={236}
        ref={attachCanvasRef}
        width={1100}
      />
      {"transferControlToOffscreen" in HTMLCanvasElement.prototype ? null : (
        <div className="absolute inset-0 grid place-items-center bg-black/80 text-xs text-bankops-muted">
          OffscreenCanvas is not supported in this browser.
        </div>
      )}
    </div>
  );
}

function RendererMetrics({ snapshot }: { snapshot: OpsStreamSnapshot }) {
  const metrics = [
    ["fps", Math.round(snapshot.renderer.fps).toString()],
    ["frame", `${snapshot.renderer.frameCostMs.toFixed(1)}ms`],
    ["backlog", snapshot.renderer.backlog.toString()],
    ["lag", snapshot.renderer.sequenceLag.toString()],
    ["decoded", `${snapshot.renderer.decodedRate}/s`],
    ["rendered", `${snapshot.renderer.renderedRowRate}/s`],
  ];

  return (
    <div className="grid grid-cols-6 gap-2 text-[11px]">
      {metrics.map(([label, value]) => (
        <div className="border border-white/[0.06] bg-white/[0.025] px-2 py-1" key={label}>
          <p className="uppercase text-bankops-muted">{label}</p>
          <p className="font-mono text-white">{value}</p>
        </div>
      ))}
    </div>
  );
}

function HealthRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-white/[0.06] pb-3 text-sm capitalize last:border-b-0 last:pb-0">
      <span className="text-bankops-muted">{label}</span>
      <span className="font-medium text-emerald-300">{value}</span>
    </div>
  );
}

function formatMinorUsd(value: string) {
  return usdCompact.format(Number(BigInt(value) / 100n));
}
