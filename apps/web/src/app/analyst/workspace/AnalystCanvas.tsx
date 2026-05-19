import React from "react";

import { AnalystRunTracePanel } from "../run/AnalystRunTracePanel";
import type { AnalystRunTimeline } from "../run/analyst-run-timeline";
import { AnalystReportRenderer } from "../report/AnalystReportRenderer";

export function AnalystCanvas({
  error,
  isRunning,
  report,
  startedAt,
  timeline,
}: {
  error: string | null;
  isRunning: boolean;
  report: unknown;
  startedAt: number | null;
  timeline: AnalystRunTimeline;
}) {
  if (isRunning) {
    return <AnalystRunTracePanel error={null} startedAt={startedAt} timeline={timeline} />;
  }

  if (report) {
    return (
      <div className="rounded-[4px] border border-white/[0.06] bg-black/20 p-5">
        <AnalystReportRenderer report={report} />
      </div>
    );
  }

  if (error) {
    return <AnalystRunTracePanel error={error} startedAt={startedAt} timeline={timeline} />;
  }

  return (
    <div className="grid min-h-[600px] place-items-center">
      <div className="w-full max-w-xl text-center">
        <div className="mx-auto grid size-12 place-items-center rounded-[3px] border border-bankops-accent/25 bg-bankops-accent/[0.06]">
          <svg
            aria-hidden="true"
            className="size-8 text-bankops-accent"
            fill="none"
            viewBox="0 0 32 24"
          >
            <rect height="10" stroke="currentColor" width="5" x="0.5" y="13.5" />
            <rect height="16" stroke="currentColor" width="5" x="10.5" y="7.5" />
            <rect height="22" stroke="currentColor" width="5" x="20.5" y="1.5" />
          </svg>
        </div>
        <p className="mt-5 text-xl font-semibold tracking-[-0.015em] text-bankops-text">
          Awaiting analysis request
          <span className="sr-only">Ask for an operational analysis</span>
        </p>
        <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-bankops-muted">
          <span className="block">Submit a question on the left to begin.</span>
          <span className="block text-bankops-subtle">
            The Analyst runs bounded CodeMode queries and returns a validated AnalystReportSpec.
          </span>
        </p>

        <div className="mt-8 grid gap-4 text-left md:grid-cols-3">
          <Capability
            label="Bounded data access"
            text="Uses analyst tools returning compact rollups, not raw dataset access."
          />
          <Capability
            label="Sandboxed execution"
            text="Model-authored TypeScript runs in an isolated Node environment."
          />
          <Capability
            label="Validated rendering"
            text="AnalystReportSpec is validated before BankOps renders any block."
          />
        </div>
      </div>
    </div>
  );
}

function Capability({ label, text }: { label: string; text: string }) {
  return (
    <div className="border-l-2 border-bankops-accent/35 py-1 pl-3.5">
      <p className="text-xs font-semibold text-bankops-text">{label}</p>
      <p className="mt-1 text-[11px] leading-5 text-bankops-muted">{text}</p>
    </div>
  );
}
