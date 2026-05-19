import React from "react";

import type { OpsStreamSnapshot, RailHealthSnapshot } from "./ops-stream-messages";
import { railHealthClassNames, railHealthSeverity, railStatusLabel } from "./ops-rail-health";
import { InfoTooltip } from "../../design/components";
import { formatCount, formatMinorUsdString } from "../../design/format";

export function OpsTopBand({ snapshot }: { snapshot: OpsStreamSnapshot }) {
  const worstRail = snapshot.railHealth.reduce<RailHealthSnapshot | undefined>((current, rail) => {
    if (
      current === undefined ||
      railHealthSeverity[rail.status] > railHealthSeverity[current.status]
    ) {
      return rail;
    }

    return current;
  }, undefined);

  return (
    <section className="flex w-full overflow-x-auto border-b border-white/[0.08]">
      <OpsMetricCard
        label="Event Rate"
        tooltip="Hot stream movements received from the Node stream server per second. This is stream throughput, not React render frequency."
        value={`${formatCount(snapshot.eventRate)}/s`}
      />
      <OpsMetricCard
        label="Credits"
        metricTone="positive"
        tooltip="Cumulative inbound balance-sheet movement in the current simulator session, counted from synthetic credit entries."
        value={`+${formatMinorUsdString(snapshot.cumulativeCreditsMinor)}`}
      />
      <OpsMetricCard
        label="Debits"
        metricTone="negative"
        tooltip="Cumulative outbound balance-sheet movement in the current simulator session, counted from synthetic debit entries."
        value={`-${formatMinorUsdString(snapshot.cumulativeDebitsMinor)}`}
      />
      <OpsMetricCard
        label="Liquidity"
        tooltip="Current simulated reserve-cash balance after applying raw balance-sheet movements. This is bank liquidity in the model, not browser memory or app health."
        value={formatMinorUsdString(snapshot.liquidityReserveMinor)}
      />
      <OpsMetricCard
        label="Exceptions"
        tooltip="Synthetic backlog of failed, held, or exception-hold movements that still need reconciliation or manual review."
        value={`${formatCount(snapshot.exceptionQueueDepth)} OPEN`}
      />
      <OpsMetricCard
        label="Rail Health"
        tooltip="Worst current simulated payment-rail status, derived from rail failure rate, held movement count, pending count, and recent activity."
        tone={worstRail?.status}
        value={worstRail === undefined ? "WAITING" : railStatusLabel(worstRail).toUpperCase()}
      />
    </section>
  );
}

const OpsMetricCard = React.memo(function OpsMetricCard({
  label,
  metricTone,
  tone,
  tooltip,
  value,
}: {
  label: string;
  metricTone?: "amber" | "negative" | "positive";
  tone?: RailHealthSnapshot["status"];
  tooltip: string;
  value: React.ReactNode;
}) {
  const valueClassName =
    tone === undefined
      ? metricTone === "positive"
        ? "text-bankops-positive"
        : metricTone === "negative"
          ? "text-bankops-negative"
          : metricTone === "amber"
            ? "text-amber-400"
            : "text-bankops-text"
      : railHealthClassNames[tone];

  return (
    <article className="min-w-48 flex-1 border-r border-white/[0.06] bg-bankops-panel px-5 py-3.5 last:border-r-0">
      <div className="mb-1 flex items-center gap-2 text-bankops-muted">
        <p className="truncate font-mono text-[9px] font-semibold uppercase tracking-[0.18em] text-bankops-subtle">
          {label}
        </p>
        <InfoTooltip label={`Explain ${label}`}>{tooltip}</InfoTooltip>
      </div>
      <p className={`truncate font-mono text-[22px] font-medium leading-none ${valueClassName}`}>
        {value}
      </p>
    </article>
  );
});
