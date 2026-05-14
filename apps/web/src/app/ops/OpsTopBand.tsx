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
    <section className="flex w-full overflow-x-auto border-b border-white/[0.08]">
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
    <article className="min-w-48 flex-1 border-r border-white/[0.08] bg-bankops-panel p-3 last:border-r-0">
      <div className="mb-1 flex items-center gap-2 text-bankops-muted">
        <Icon aria-hidden={true} className="size-3 shrink-0 text-[#5a6272]" />
        <p className="truncate text-[9px] font-semibold uppercase tracking-widest text-[#5a6272]">
          {label}
        </p>
        <InfoTooltip label={`Explain ${label}`}>{tooltip}</InfoTooltip>
      </div>
      <p
        className={`truncate font-mono text-xl leading-none ${tone === undefined ? "text-bankops-text" : railHealthClassNames[tone]}`}
      >
        {value}
      </p>
    </article>
  );
}
