import React from "react";
import { STREAM_RATES, type StreamRate } from "@bankops/contracts";
import { Activity, Gauge, Landmark, RadioTower } from "lucide-react";

import { useOpsStream } from "../ops/ops-stream-store";
import type { OpsConnectionStatus } from "../ops/ops-stream-messages";
import { Button, PageHeader, Panel, StatCard } from "../../design/components";

const healthChecks = ["Core ledger", "Wire rail", "Stablecoin settlement", "Audit writer"];
const usdCompact = new Intl.NumberFormat("en-US", {
  currency: "USD",
  maximumFractionDigits: 1,
  notation: "compact",
  style: "currency",
});

export function OpsRoute() {
  const { setStreamRate, snapshot } = useOpsStream();
  const railHealth = snapshot.railHealth.length > 0 ? snapshot.railHealth : undefined;

  return (
    <div className="space-y-5">
      <PageHeader eyebrow="God Mode" title="Operations control plane" />

      <section className="grid gap-3 xl:grid-cols-4">
        <StatCard
          icon={RadioTower}
          label="Connection"
          value={statusLabel(snapshot.connectionStatus)}
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
              <span className={statusClassName(snapshot.connectionStatus)}>
                {statusLabel(snapshot.connectionStatus)}
              </span>
            </div>

            <div className="text-center">
              <p className="text-sm font-medium text-white">OffscreenCanvas stream surface</p>
              <p className="mt-2 text-xs text-bankops-muted">
                Worker-owned WebSocket is connected before the Canvas tape lands.
              </p>
            </div>

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
                    {streamRateLabel(streamRate)}
                  </Button>
                ))}
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

function statusLabel(status: OpsConnectionStatus): string {
  if (status === "open") {
    return "Open";
  }

  if (status === "connecting") {
    return "Connecting";
  }

  if (status === "reconnecting") {
    return "Reconnecting";
  }

  if (status === "degraded") {
    return "Backend unavailable";
  }

  return assertNever(status);
}

function statusClassName(status: OpsConnectionStatus) {
  if (status === "open") {
    return "font-medium text-emerald-300";
  }

  if (status === "degraded") {
    return "font-medium text-amber-300";
  }

  return "font-medium text-sky-300";
}

function streamRateLabel(streamRate: StreamRate): string {
  if (streamRate === 50) {
    return "50/s";
  }

  if (streamRate === 2_000) {
    return "2k/s";
  }

  if (streamRate === 10_000) {
    return "10k/s";
  }

  return assertNever(streamRate);
}

function assertNever(value: never): never {
  throw new Error(`Unexpected value: ${String(value)}`);
}
