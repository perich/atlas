import React from "react";
import { STREAM_RATES, type StreamRate } from "@bankops/contracts";

import type {
  OpsConnectionStatus,
  OpsStreamSnapshot,
  RailHealthSnapshot,
} from "./ops-stream-messages";
import { titleize } from "./ops-format";
import { railHealthClassNames, railHealthLabels } from "./ops-rail-health";
import { Panel } from "../../design/components";
import { formatCount, formatMilliseconds } from "../../design/format";

const statusLabels: Record<OpsConnectionStatus, string> = {
  connecting: "Connecting",
  degraded: "Backend unavailable",
  open: "Open",
  reconnecting: "Reconnecting",
};

const statusClassNames: Record<OpsConnectionStatus, string> = {
  connecting: "font-semibold text-bankops-accent",
  degraded: "font-semibold text-amber-300",
  open: "font-semibold text-bankops-positive-strong",
  reconnecting: "font-semibold text-bankops-accent",
};

const streamRateLabels: Record<StreamRate, string> = {
  1: "1/s",
  50: "50/s",
  2_000: "2k/s",
  10_000: "10k/s",
};

export function OpsSideRail({
  setStreamRate,
  snapshot,
}: {
  setStreamRate: (streamRate: StreamRate) => void;
  snapshot: OpsStreamSnapshot;
}) {
  return (
    <aside className="flex min-h-0 flex-col bg-bankops-sidebar">
      <Panel className="rounded-none border-0 border-b border-white/[0.06]" title="Stream Control">
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs text-bankops-muted">Connection</span>
            <span
              className={`inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.08em] ${statusClassNames[snapshot.connectionStatus]}`}
              data-testid="ops-connection-status"
            >
              {snapshot.connectionStatus === "open" ? (
                <span className="size-1.5 rounded-full bg-bankops-positive-strong" />
              ) : null}
              {statusLabels[snapshot.connectionStatus]}
            </span>
          </div>
          {snapshot.streamIssue !== undefined ? (
            <p
              className="rounded-[3px] border border-amber-300/15 bg-amber-300/[0.06] px-2 py-1 font-mono text-[10px] text-amber-200"
              data-testid="ops-stream-issue"
            >
              {snapshot.streamIssue}
            </p>
          ) : null}

          <div className="flex items-center justify-between gap-3">
            <span className="text-xs text-bankops-muted">Sequence</span>
            <span className="font-mono text-[11px] font-semibold text-white">
              seq {formatCount(Number(snapshot.seq))}
            </span>
          </div>

          <StreamRateControl
            currentStreamRate={snapshot.streamRate}
            setStreamRate={setStreamRate}
          />
        </div>
      </Panel>

      <Panel className="rounded-none border-0 border-b border-white/[0.06]" title="Performance HUD">
        <RendererMetrics snapshot={snapshot} />
      </Panel>

      <Panel className="min-h-0 flex-1 overflow-y-auto rounded-none border-0" title="Rail Health">
        <RailHealthList rails={snapshot.railHealth} />
      </Panel>
    </aside>
  );
}

function StreamRateControl({
  currentStreamRate,
  setStreamRate,
}: {
  currentStreamRate: StreamRate;
  setStreamRate: (streamRate: StreamRate) => void;
}) {
  return (
    <div>
      <p className="mb-2 text-xs font-medium text-bankops-muted">Stream rate</p>
      <div className="grid grid-cols-2 gap-1.5">
        {STREAM_RATES.map((streamRate) => (
          <button
            className={`h-8 rounded-[4px] border font-mono text-[11px] font-semibold uppercase tracking-[0.08em] transition-colors focus:outline-none focus:ring-2 focus:ring-bankops-accent/30 ${
              currentStreamRate === streamRate
                ? "border-white/[0.10] bg-bankops-surface text-bankops-text"
                : "border-white/[0.06] bg-transparent text-bankops-muted hover:bg-white/[0.035] hover:text-bankops-text"
            }`}
            key={streamRate}
            onClick={() => setStreamRate(streamRate)}
            type="button"
          >
            {streamRateLabels[streamRate]}
          </button>
        ))}
      </div>
    </div>
  );
}

function RendererMetrics({ snapshot }: { snapshot: OpsStreamSnapshot }) {
  const metrics = [
    {
      label: "fps",
      title: "Canvas frames measured during the latest warm snapshot interval.",
      value: Math.round(snapshot.renderer.fps).toString(),
    },
    {
      label: "frame",
      title: "Average worker canvas draw cost during the latest warm snapshot interval.",
      value: `${snapshot.renderer.frameCostMs.toFixed(1)}ms`,
    },
    {
      label: "backlog",
      title: "Decoded movement rows retained beyond the currently visible tape window.",
      value: snapshot.renderer.backlog.toString(),
    },
    {
      label: "lag",
      title: "Sequence gap between the latest server aggregate and the latest decoded hot batch.",
      value: snapshot.renderer.sequenceLag.toString(),
    },
    {
      label: "decoded",
      title:
        "Worker-decoded movements during the latest warm snapshot interval. The top-band event rate uses the simulator rolling window, so brief differences are expected.",
      value: `${snapshot.renderer.decodedRate}/s`,
    },
    {
      label: "new rows",
      title:
        "New movement rows pushed into the canvas tape during the latest warm snapshot interval.",
      value: `${snapshot.renderer.renderedRowRate}/s`,
    },
  ];

  return (
    <div className="grid grid-cols-3 gap-px border border-white/[0.06] bg-white/[0.05] text-[11px]">
      {metrics.map((metric) => (
        <div
          className="bg-bankops-panel p-2"
          data-testid={`renderer-metric-${metric.label.replaceAll(" ", "-")}`}
          key={metric.label}
          title={metric.title}
        >
          <p className="font-mono uppercase text-bankops-muted">{metric.label}</p>
          <p className="font-semibold text-white">{metric.value}</p>
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
    <div className="space-y-1">
      {rails.map((rail) => {
        const borderClassName = railStatusBorderClassName(rail.status);

        return (
          <div
            className={`grid min-h-9 grid-cols-[1fr_auto] items-center gap-3 border-l-2 border-b border-white/[0.04] bg-bankops-sidebar py-2 pl-2.5 pr-1 ${borderClassName}`}
            key={rail.rail}
          >
            <div>
              <p className="font-mono text-[11px] font-medium text-white">
                {railDisplayName(rail)}
              </p>
              <p className="mt-0.5 font-mono text-[10px] text-bankops-subtle">
                {formatCount(rail.eventsPerSec)}/s · p95 {formatMilliseconds(rail.p95LatencyMs)}
              </p>
            </div>
            <span
              className={`font-mono text-[10px] font-semibold ${railHealthClassNames[rail.status]}`}
            >
              {railHealthLabels[rail.status].toUpperCase()}
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
      return "border-l-bankops-negative-strong";
    case "nominal":
      return "border-l-bankops-positive-strong";
  }

  const exhaustive: never = status;
  return exhaustive;
}

function railDisplayName(rail: RailHealthSnapshot) {
  if (rail.rail === "internal_ledger") {
    return "Int. Ledger";
  }

  return titleize(rail.rail);
}
