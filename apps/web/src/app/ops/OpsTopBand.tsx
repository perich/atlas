import React from "react";
import {
  Activity,
  BanknoteArrowDown,
  BanknoteArrowUp,
  RadioTower,
  ShieldAlert,
  Wallet,
} from "lucide-react";

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
    <section className="grid gap-3 xl:grid-cols-6">
      <OpsMetricCard
        icon={Activity}
        label="Event rate"
        tooltip="Hot stream movements received from the Node stream server per second. This is stream throughput, not React render frequency."
        value={`${formatCount(snapshot.eventRate)}/s`}
      />
      <OpsMetricCard
        icon={BanknoteArrowUp}
        label="Credits"
        tooltip="Cumulative inbound balance-sheet movement in the current simulator session, counted from synthetic credit entries."
        value={formatMinorUsdString(snapshot.cumulativeCreditsMinor)}
      />
      <OpsMetricCard
        icon={BanknoteArrowDown}
        label="Debits"
        tooltip="Cumulative outbound balance-sheet movement in the current simulator session, counted from synthetic debit entries."
        value={formatMinorUsdString(snapshot.cumulativeDebitsMinor)}
      />
      <OpsMetricCard
        icon={Wallet}
        label="Liquidity"
        tooltip="Current simulated reserve-cash balance after applying raw balance-sheet movements. This is bank liquidity in the model, not browser memory or app health."
        value={formatMinorUsdString(snapshot.liquidityReserveMinor)}
      />
      <OpsMetricCard
        icon={ShieldAlert}
        label="Open exceptions"
        tooltip="Synthetic backlog of failed, held, or exception-hold movements that still need reconciliation or manual review."
        value={formatCount(snapshot.exceptionQueueDepth)}
      />
      <OpsMetricCard
        icon={RadioTower}
        label="Rail health"
        tooltip="Worst current simulated payment-rail status, derived from rail failure rate, held movement count, pending count, and recent activity."
        tone={worstRail?.status}
        value={worstRail === undefined ? "Waiting" : railStatusLabel(worstRail)}
      />
    </section>
  );
}

function OpsMetricCard({
  icon: Icon,
  label,
  tone,
  tooltip,
  value,
}: {
  icon: React.ComponentType<{ "aria-hidden": true; className: string }>;
  label: string;
  tone?: RailHealthSnapshot["status"];
  tooltip: string;
  value: React.ReactNode;
}) {
  return (
    <article className="min-w-0 rounded-[5px] border border-white/[0.075] bg-white/[0.022] p-3 shadow-[0_1px_0_rgba(255,255,255,0.018)_inset]">
      <div className="mb-3 flex items-center gap-2 text-bankops-muted">
        <Icon aria-hidden={true} className="size-3.5 shrink-0 text-sky-300/85" />
        <p className="truncate text-[10px] font-semibold uppercase tracking-[0.14em]">{label}</p>
        <InfoTooltip label={`Explain ${label}`}>{tooltip}</InfoTooltip>
      </div>
      <p
        className={`truncate text-[1.35rem] font-semibold leading-none tracking-tight ${tone === undefined ? "text-white" : railHealthClassNames[tone]}`}
      >
        {value}
      </p>
    </article>
  );
}
