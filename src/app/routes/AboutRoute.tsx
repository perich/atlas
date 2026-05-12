import React from "react";

import { Panel } from "../../design/components";

export function AboutRoute() {
  return (
    <div className="space-y-6">
      <header className="border-b border-white/[0.075] pb-5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-atlas-muted">
          About
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-white">
          Minimal app scaffold
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-atlas-muted">
          This page exists to keep route structure and e2e coverage in place while leaving the
          product domain blank.
        </p>
      </header>

      <Panel title="Next steps">
        <ul className="space-y-2 text-sm text-atlas-muted">
          <li>Replace these starter routes with the next product concept.</li>
          <li>Add feature modules only when they have a real domain boundary.</li>
          <li>Keep tests small and targeted as the app grows.</li>
        </ul>
      </Panel>
    </div>
  );
}
