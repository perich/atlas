import React from "react";
import { Activity, CheckCircle2, Layers3 } from "lucide-react";

import { Button, Panel, StatCard } from "../../design/components";

export function HomeRoute() {
  return (
    <div className="space-y-6">
      <header className="flex flex-col justify-between gap-4 border-b border-white/[0.075] pb-5 lg:flex-row lg:items-end">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-atlas-muted">
            Boilerplate
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-white">
            React SPA starter
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-atlas-muted">
            A clean base for a logged-in product surface: routing, styling, tests, linting, and
            formatting are already wired.
          </p>
        </div>
        <Button>Primary action</Button>
      </header>

      <section className="grid gap-4 md:grid-cols-3">
        <StatCard icon={Layers3} label="Routes" value="2" />
        <StatCard icon={Activity} label="Tooling" value="Ready" />
        <StatCard icon={CheckCircle2} label="Checks" value="Green" />
      </section>

      <Panel title="What stayed">
        <div className="grid gap-3 text-sm text-atlas-muted md:grid-cols-2">
          <p>Vite, React, TypeScript, TanStack Router, Tailwind CSS, and pinned dependencies.</p>
          <p>oxlint, oxfmt, Vitest, Playwright, and a small design primitive layer.</p>
        </div>
      </Panel>
    </div>
  );
}
