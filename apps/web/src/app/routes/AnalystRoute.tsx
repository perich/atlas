import React from "react";
import { Bot, Braces, ShieldCheck } from "lucide-react";

import { PageHeader, Panel, StatCard } from "../../design/components";

export function AnalystRoute() {
  return (
    <div className="space-y-5">
      <PageHeader eyebrow="CodeMode Analyst" title="Analyst workspace" />

      <section className="grid gap-3 xl:grid-cols-3">
        <StatCard icon={Bot} label="Model path" value="Deferred" />
        <StatCard icon={Braces} label="UI output" value="Schema" />
        <StatCard icon={ShieldCheck} label="Rendering" value="Typed" />
      </section>

      <Panel className="min-h-[360px]" title="Future Analyst Surface">
        <div className="grid h-[290px] place-items-center border border-dashed border-white/[0.1] bg-black/20">
          <div className="max-w-lg text-center">
            <p className="text-sm font-medium text-white">Constrained generative UI placeholder</p>
            <p className="mt-2 text-xs leading-5 text-bankops-muted">
              This route is reserved for a sandboxed CodeMode analyst that can query BankOps data
              and return validated dashboard specs.
            </p>
          </div>
        </div>
      </Panel>
    </div>
  );
}
