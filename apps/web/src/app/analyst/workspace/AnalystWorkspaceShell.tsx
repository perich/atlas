import React from "react";

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
    <div className="flex min-h-[calc(100vh-5.25rem)] flex-col overflow-hidden rounded-[4px] border border-white/[0.06] bg-bankops-panel">
      <div className="border-b border-white/[0.06] bg-bankops-panel px-6 py-5">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <h1 className="text-2xl font-semibold leading-tight tracking-[-0.02em] text-bankops-text">
            Analyst Workspace
          </h1>
          <span className="inline-flex shrink-0 rounded-[2px] border border-bankops-accent/35 px-2 py-1 font-mono text-[9px] font-semibold uppercase tracking-[0.18em] text-bankops-accent">
            Experimental
          </span>
        </div>
      </div>
      <div className="border-b border-white/[0.06] bg-bankops-sidebar px-6 py-0">{statusBar}</div>

      <div className="grid min-h-0 flex-1 xl:grid-cols-[340px_minmax(0,1fr)]">
        <aside className="overflow-y-auto border-b border-white/[0.06] bg-bankops-sidebar p-5 xl:border-b-0 xl:border-r">
          {controlRail}
        </aside>
        <main className="overflow-y-auto bg-bankops-panel p-6">{canvas}</main>
      </div>
    </div>
  );
}
