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
        <PageHeader eyebrow="CodeMode Analyst" title="Analyst workspace" />
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
