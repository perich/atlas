import { Activity, BadgeDollarSign, ShieldCheck, Workflow } from "lucide-react";
import React from "react";

const metrics = [
  {
    label: "Deposits",
    value: "$1.0B",
    icon: BadgeDollarSign,
  },
  {
    label: "Streaming",
    value: "Ready",
    icon: Activity,
  },
  {
    label: "Risk",
    value: "Modeled",
    icon: ShieldCheck,
  },
  {
    label: "Reconciliation",
    value: "Planned",
    icon: Workflow,
  },
];

export function App() {
  return (
    <main className="min-h-screen bg-atlas-bg px-6 py-8 text-atlas-text">
      <section className="mx-auto flex max-w-6xl flex-col gap-8">
        <header className="flex flex-col gap-3 border-b border-white/10 pb-8">
          <p className="text-sm uppercase tracking-[0.24em] text-atlas-muted">Atlas Bank Ops</p>
          <h1 className="max-w-3xl text-4xl font-semibold tracking-normal text-white">
            Real-time banking operations control plane
          </h1>
          <p className="max-w-2xl text-base leading-7 text-atlas-muted">
            Barebones Vite, React, TypeScript, Tailwind, Motion, TanStack, Radix, Oxlint, Oxfmt,
            Vitest, Playwright, and worker-ready tooling are in place. The implementation can now
            move into product and engine slices.
          </p>
        </header>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {metrics.map((metric) => {
            const Icon = metric.icon;

            return (
              <article
                className="rounded-lg border border-white/10 bg-white/[0.04] p-5 shadow-2xl shadow-black/20"
                key={metric.label}
              >
                <div className="mb-5 flex size-10 items-center justify-center rounded-md bg-cyan-400/10 text-cyan-300">
                  <Icon aria-hidden="true" className="size-5" />
                </div>
                <p className="text-sm text-atlas-muted">{metric.label}</p>
                <p className="mt-1 text-2xl font-semibold text-white">{metric.value}</p>
              </article>
            );
          })}
        </div>
      </section>
    </main>
  );
}
