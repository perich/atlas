import React from "react";
import { Activity, CheckCircle2, Layers3 } from "lucide-react";

import { Button, Panel, StatCard } from "../../design/components";

export function HomeRoute() {
  return (
    <div className="space-y-6">
      <header className="flex flex-col justify-between gap-4 border-b border-white/[0.075] pb-5 lg:flex-row lg:items-end">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-bankops-muted">
            Operations Prototype
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-white">
            BankOps Mission Control
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-bankops-muted">
            A real-time bank operations control plane prototype for payment rails, ledger
            reconciliation, liquidity, and stablecoin settlement.
          </p>
        </div>
        <Button>Open ops view</Button>
      </header>

      <section className="grid gap-4 md:grid-cols-3">
        <StatCard icon={Layers3} label="Target routes" value="3" />
        <StatCard icon={Activity} label="Stream model" value="Server-owned" />
        <StatCard icon={CheckCircle2} label="Spec" value="Drafted" />
      </section>

      <Panel title="Current focus">
        <div className="grid gap-3 text-sm text-bankops-muted md:grid-cols-2">
          <p>Move from the starter shell into `/ops`, `/ledger`, and `/analyst` product routes.</p>
          <p>
            Introduce the stream server, shared protocol package, and deterministic bank simulator.
          </p>
        </div>
      </Panel>
    </div>
  );
}
