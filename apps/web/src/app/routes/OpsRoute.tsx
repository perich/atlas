import React from "react";
import { Activity, Gauge, Landmark, RadioTower } from "lucide-react";

import { PageHeader, Panel, StatCard } from "../../design/components";

const healthChecks = ["Core ledger", "Wire rail", "Stablecoin settlement", "Audit writer"];

export function OpsRoute() {
  return (
    <div className="space-y-5">
      <PageHeader eyebrow="God Mode" title="Operations control plane" />

      <section className="grid gap-3 xl:grid-cols-4">
        <StatCard icon={RadioTower} label="Stream" value="2k/s" />
        <StatCard icon={Activity} label="Rail health" value="Nominal" />
        <StatCard icon={Landmark} label="Liquidity" value="$812.4M" />
        <StatCard icon={Gauge} label="Render path" value="Worker" />
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.5fr_1fr]">
        <Panel className="min-h-[420px]" title="Balance Sheet Tape">
          <div className="grid h-[360px] place-items-center border border-dashed border-white/[0.1] bg-black/20">
            <div className="text-center">
              <p className="text-sm font-medium text-white">OffscreenCanvas stream surface</p>
              <p className="mt-2 text-xs text-bankops-muted">
                Worker-owned WebSocket rendering raw balance sheet movements.
              </p>
            </div>
          </div>
        </Panel>

        <Panel title="System Health">
          <div className="space-y-3">
            {healthChecks.map((label) => (
              <div
                className="flex items-center justify-between border-b border-white/[0.06] pb-3 text-sm last:border-b-0 last:pb-0"
                key={label}
              >
                <span className="text-bankops-muted">{label}</span>
                <span className="font-medium text-emerald-300">Online</span>
              </div>
            ))}
          </div>
        </Panel>
      </section>
    </div>
  );
}
