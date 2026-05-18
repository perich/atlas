import React from "react";
import { Bot, Braces, ShieldCheck } from "lucide-react";

import { PageHeader } from "../../design/components";

export function AnalystWorkspaceShell({
  canvas,
  controlRail,
}: {
  canvas: React.ReactNode;
  controlRail: React.ReactNode;
}) {
  return (
    <div className="min-h-[calc(100vh-5.25rem)] rounded-md border border-white/[0.08] bg-bankops-bg">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-white/[0.08] bg-bankops-sidebar px-6 py-5">
        <PageHeader eyebrow="CodeMode Analyst" title="Analyst workspace" />
        <div className="flex gap-3">
          <StatusPill icon={Bot} label="Model" value="Server configured" />
          <StatusPill icon={Braces} label="Output" value="Validated spec" />
          <StatusPill icon={ShieldCheck} label="Renderer" value="BankOps owned" />
        </div>
      </div>

      <div className="grid min-h-[calc(100vh-12rem)] xl:grid-cols-[360px_minmax(0,1fr)]">
        <aside className="border-b border-white/[0.08] bg-bankops-sidebar p-5 xl:border-b-0 xl:border-r">
          {controlRail}
        </aside>
        <main className="p-5">{canvas}</main>
      </div>
    </div>
  );
}

function StatusPill({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-2 rounded-md border border-white/[0.08] bg-black/20 px-3 py-2">
      <Icon className="size-4 text-sky-300/85" />
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-bankops-muted">
          {label}
        </p>
        <p className="text-xs text-bankops-text">{value}</p>
      </div>
    </div>
  );
}
