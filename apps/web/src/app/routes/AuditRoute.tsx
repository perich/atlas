import React from "react";
import { Columns3, Database, ListFilter, Rows3 } from "lucide-react";

import { PageHeader, Panel, StatCard } from "../../design/components";

type AuditRow = [
  time: string,
  side: "credit" | "debit",
  client: string,
  amount: string,
  rail: string,
  status: string,
];

const rows: AuditRow[] = [
  ["18:42:11.091", "credit", "Northstar Robotics", "$84,120.00", "wire", "posted"],
  ["18:42:11.088", "debit", "Valkyrie Compute", "$12,440.25", "ach", "posted"],
  ["18:42:11.084", "credit", "Helio Defense", "$240,000.00", "stablecoin", "pending"],
  ["18:42:11.079", "debit", "Foundry AI", "$9,771.18", "card", "posted"],
  ["18:42:11.075", "credit", "Axis Hardware", "$55,300.00", "wire", "posted"],
];

export function AuditRoute() {
  return (
    <div className="space-y-5">
      <PageHeader eyebrow="Bank Core Audit" title="Balance sheet movement history" />

      <section className="grid gap-3 xl:grid-cols-4">
        <StatCard icon={Database} label="Dataset" value="500k" />
        <StatCard icon={Rows3} label="Rows mounted" value="<100" />
        <StatCard icon={ListFilter} label="Filters" value="Sparse" />
        <StatCard icon={Columns3} label="Columns" value="Draggable" />
      </section>

      <Panel className="overflow-hidden p-0">
        <div className="grid grid-cols-[150px_90px_1fr_150px_120px_110px] border-b border-white/[0.075] bg-white/[0.025] px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-bankops-muted">
          <span>Time</span>
          <span>Side</span>
          <span>Client</span>
          <span>Amount</span>
          <span>Rail</span>
          <span>Status</span>
        </div>
        {rows.map(([time, side, client, amount, rail, status]) => (
          <div
            className="grid grid-cols-[150px_90px_1fr_150px_120px_110px] border-b border-white/[0.055] px-4 py-2 font-mono text-xs last:border-b-0"
            key={`${time}-${client}`}
          >
            <span className="text-bankops-muted">{time}</span>
            <span className={side === "credit" ? "text-emerald-300" : "text-rose-300"}>{side}</span>
            <span className="truncate text-white">{client}</span>
            <span className="text-white">{amount}</span>
            <span className="text-bankops-muted">{rail}</span>
            <span className="text-bankops-muted">{status}</span>
          </div>
        ))}
      </Panel>
    </div>
  );
}
