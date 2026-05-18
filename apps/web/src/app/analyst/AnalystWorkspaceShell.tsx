import React from "react";

import { PageHeader } from "../../design/components";

export function AnalystWorkspaceShell({
  canvas,
  controlRail,
  statusBar,
}: {
  canvas: React.ReactNode;
  controlRail: React.ReactNode;
  statusBar: React.ReactNode;
}) {
  return (
    <div className="min-h-[calc(100vh-5.25rem)] rounded-md border border-white/[0.08] bg-bankops-bg">
      <div className="border-b border-white/[0.08] bg-bankops-sidebar px-6 py-5">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div>
            <PageHeader eyebrow="Experimental CodeMode Analyst" title="Analyst workspace" />
            <p className="mt-3 max-w-3xl text-sm leading-6 text-bankops-muted">
              This is an experimental GenAI workflow for exploring what operational analysis can
              feel like when an LLM writes and validates report specs against live BankOps data
              tools. Expect rough edges, occasional bugs, and reports that should be reviewed before
              acting on them.
            </p>
          </div>
          <span className="inline-flex shrink-0 rounded-full border border-sky-300/25 bg-sky-300/[0.07] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-sky-100">
            Experimental
          </span>
        </div>
      </div>
      <div className="border-b border-white/[0.08] bg-[#0d0f11] px-6 py-3">{statusBar}</div>

      <div className="grid min-h-[calc(100vh-15.25rem)] xl:grid-cols-[336px_minmax(0,1fr)]">
        <aside className="border-b border-white/[0.08] bg-bankops-sidebar/80 p-5 xl:border-b-0 xl:border-r">
          {controlRail}
        </aside>
        <main className="p-5">{canvas}</main>
      </div>
    </div>
  );
}
