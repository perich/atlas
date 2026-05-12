import React from "react";

import { Panel } from "../../design/components";

export function AboutRoute() {
  return (
    <div className="space-y-6">
      <header className="border-b border-white/[0.075] pb-5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-bankops-muted">
          Project Frame
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-white">
          BankOps project spec
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-bankops-muted">
          The product target is a staff-level internal operations surface for bank rails, ledger
          finality, liquidity, and constrained AI analysis.
        </p>
      </header>

      <Panel title="Next steps">
        <ul className="space-y-2 text-sm text-bankops-muted">
          <li>Move the current Vite app into the planned workspace shape.</li>
          <li>Add the server-owned SettlementStream protocol and simulator packages.</li>
          <li>Replace this placeholder route with the `/ops` dashboard surface.</li>
        </ul>
      </Panel>
    </div>
  );
}
