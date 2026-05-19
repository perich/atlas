import React from "react";
import { Bot, Braces, Database, ShieldCheck } from "lucide-react";

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
      <div className="rounded-md border border-white/[0.08] bg-black/20 p-5">
        <AnalystReportRenderer report={report} />
      </div>
    );
  }

  if (error) {
    return <AnalystRunTracePanel error={error} startedAt={startedAt} timeline={timeline} />;
  }

  return (
    <div className="min-h-[520px] rounded-md border border-white/[0.08] bg-bankops-panel p-6">
      <div className="grid h-full min-h-[472px] place-items-center rounded-md border border-dashed border-white/[0.12] bg-black/20">
        <div className="max-w-2xl px-6 text-center">
          <Braces className="mx-auto size-9 text-sky-300/80" />
          <p className="mt-4 text-lg font-semibold tracking-tight text-white">
            Ask for an operational analysis
          </p>
          <p className="mt-3 text-sm leading-6 text-bankops-muted">
            Start with a plain-English request. The Analyst reviews capped Audit Entry rollups and
            returns a validated report rendered by BankOps UI.
          </p>

          <div className="mt-6 grid gap-3 text-left md:grid-cols-3">
            <EmptyStep
              icon={Bot}
              label="Describe"
              text="Ask for patterns, risks, customers, rails, exceptions, or a broad readout."
            />
            <EmptyStep
              icon={Database}
              label="Generate"
              text="Runs bounded audit-log queries and streams observable progress."
            />
            <EmptyStep
              icon={ShieldCheck}
              label="Review"
              text="Validated reports render as charts, tables, summaries, and Customer lists."
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function EmptyStep({
  icon: Icon,
  label,
  text,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  text: string;
}) {
  return (
    <div className="rounded-md border border-white/[0.08] bg-bankops-sidebar/70 p-3">
      <Icon className="size-4 text-sky-300/85" />
      <p className="mt-3 text-xs font-semibold uppercase tracking-[0.13em] text-bankops-text">
        {label}
      </p>
      <p className="mt-2 text-xs leading-5 text-bankops-muted">{text}</p>
    </div>
  );
}
