import React from "react";
import { STREAM_RATES, type StreamRate } from "@bankops/contracts";
import { Gauge } from "lucide-react";

import type {
  OpsConnectionStatus,
  OpsStreamSnapshot,
  RailHealthSnapshot,
} from "./ops-stream-messages";
import { titleize } from "./ops-format";
import { railHealthClassNames, railHealthLabels } from "./ops-rail-health";
import { Button, Panel } from "../../design/components";
import { formatCount, formatMilliseconds } from "../../design/format";

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

const pressureClassNames = {
  nominal: "text-emerald-300",
  watch: "text-amber-300",
  strained: "text-rose-300",
} as const;

export function OpsSideRail({
  setStreamRate,
  snapshot,
}: {
  setStreamRate: (streamRate: StreamRate) => void;
  snapshot: OpsStreamSnapshot;
}) {
  const pressure = streamPressure(snapshot);

  return (
    <aside className="flex min-h-0 flex-col bg-bankops-sidebar">
      <Panel className="rounded-none border-0 border-b border-white/[0.08]" title="Stream Control">
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
                  className="min-h-10 px-3 text-[10px]"
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

      <Panel className="rounded-none border-0 border-b border-white/[0.08]" title="Performance HUD">
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

      <Panel className="min-h-0 flex-1 overflow-y-auto rounded-none border-0" title="Rail Health">
        <RailHealthList rails={snapshot.railHealth} />
      </Panel>
    </aside>
  );
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
    <div className="grid grid-cols-3 gap-px border border-white/[0.08] bg-white/[0.05] text-[11px]">
      {metrics.map(([label, value]) => (
        <div
          className="bg-[#0d0f10] px-2 py-2"
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
      {rails.map((rail) => {
        const borderClassName = railStatusBorderClassName(rail.status);

        return (
          <div
            className={`grid grid-cols-[1fr_auto] gap-3 border-l-2 bg-bankops-panel p-3 ${borderClassName}`}
            key={rail.rail}
          >
            <div>
              <p className="text-xs font-medium text-white">{titleize(rail.rail)}</p>
              <p className="mt-0.5 font-mono text-[10px] text-[#5a6272]">
                {formatCount(rail.eventsPerSec)}/s · p95 {formatMilliseconds(rail.p95LatencyMs)}
              </p>
            </div>
            <span className={`text-[11px] font-semibold ${railHealthClassNames[rail.status]}`}>
              {railHealthLabels[rail.status]}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function railStatusBorderClassName(status: RailHealthSnapshot["status"]) {
  switch (status) {
    case "degraded":
      return "border-l-amber-300";
    case "incident":
      return "border-l-rose-400";
    case "nominal":
      return "border-l-transparent";
  }
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
