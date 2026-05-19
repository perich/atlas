import React from "react";
import { AlertTriangle, CheckCircle2, CircleAlert, Info } from "lucide-react";
import {
  analystReportSpecSchema,
  type AnalystReportBlock,
  type AnalystReportSpec,
} from "@bankops/contracts";

import { AnalystReportChart } from "./AnalystReportChart";
import { AnalystReportTable } from "./AnalystReportTable";
import { cn } from "../../../design/utils";

const dateTimeFormat = new Intl.DateTimeFormat(undefined, {
  dateStyle: "short",
  timeStyle: "medium",
});

export function AnalystReportRenderer({ report }: { report: unknown }) {
  const parsed = analystReportSpecSchema.parse(report);

  return <AnalystReportCanvas report={parsed} />;
}

function AnalystReportCanvas({ report }: { report: AnalystReportSpec }) {
  return (
    <article className="space-y-4">
      <header className="border-b border-white/[0.08] pb-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-bankops-muted">
              Validated Analyst Report
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-white">
              {report.title}
            </h2>
            {report.subtitle ? (
              <p className="mt-2 max-w-3xl text-sm leading-6 text-bankops-muted">
                {report.subtitle}
              </p>
            ) : null}
          </div>
          <time className="shrink-0 border border-white/[0.08] bg-black/20 px-3 py-2 font-mono text-[11px] text-bankops-muted">
            {formatDateTime(report.generatedAt)}
          </time>
        </div>
        <p className="mt-4 text-sm leading-6 text-bankops-text">{report.summary}</p>
      </header>

      {report.blocks.map((block, index) => (
        <ReportBlock block={block} key={blockKey(block, index)} />
      ))}

      {report.warnings?.length ? (
        <div className="space-y-2 border border-amber-300/20 bg-amber-300/[0.06] p-3">
          {report.warnings.map((warning) => (
            <p className="text-xs leading-5 text-amber-100/85" key={warning}>
              {warning}
            </p>
          ))}
        </div>
      ) : null}
    </article>
  );
}

function ReportBlock({ block }: { block: AnalystReportBlock }) {
  switch (block.type) {
    case "stack":
      return (
        <section className="space-y-3">
          {block.title ? <BlockTitle>{block.title}</BlockTitle> : null}
          {block.blocks.map((child, index) => (
            <ReportBlock block={child} key={blockKey(child, index)} />
          ))}
        </section>
      );
    case "grid":
      return (
        <section>
          {block.title ? <BlockTitle>{block.title}</BlockTitle> : null}
          <div
            className={cn(
              "grid gap-3",
              (block.columns ?? 2) === 2 && "lg:grid-cols-2",
              block.columns === 3 && "lg:grid-cols-3",
              block.columns === 4 && "lg:grid-cols-4",
            )}
          >
            {block.blocks.map((child, index) => (
              <ReportBlock block={child} key={blockKey(child, index)} />
            ))}
          </div>
        </section>
      );
    case "section":
      return (
        <section className="rounded-md border border-white/[0.08] bg-bankops-panel p-4">
          <BlockTitle>{block.title}</BlockTitle>
          {block.description ? (
            <p className="mb-4 text-sm leading-6 text-bankops-muted">{block.description}</p>
          ) : null}
          <div className="space-y-3">
            {block.blocks.map((child, index) => (
              <ReportBlock block={child} key={blockKey(child, index)} />
            ))}
          </div>
        </section>
      );
    case "summary":
      return (
        <Panel title={block.title}>
          <ul className="space-y-2">
            {block.items.map((item) => (
              <li className="flex gap-2 text-sm leading-6 text-bankops-text" key={item}>
                <CheckCircle2 className="mt-1 size-4 shrink-0 text-bankops-positive/85" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </Panel>
      );
    case "markdown":
      return (
        <Panel title={block.title}>
          <p className="whitespace-pre-wrap text-sm leading-6 text-bankops-text">
            {block.markdown}
          </p>
        </Panel>
      );
    case "callout":
      return (
        <Panel className={toneBorder(block.tone)}>
          <div className="flex gap-3">
            <CalloutIcon tone={block.tone} />
            <div>
              <h3 className="text-sm font-semibold text-white">{block.title}</h3>
              <p className="mt-1 text-sm leading-6 text-bankops-muted">{block.body}</p>
            </div>
          </div>
        </Panel>
      );
    case "metric":
      return <MetricCard metric={block.metric} />;
    case "metricGrid":
      return (
        <section>
          {block.title ? <BlockTitle>{block.title}</BlockTitle> : null}
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {block.metrics.map((metric) => (
              <MetricCard key={metric.label} metric={metric} />
            ))}
          </div>
        </section>
      );
    case "lineChart":
    case "barChart":
    case "areaChart":
    case "donutChart":
    case "sparkline":
      return <AnalystReportChart block={block} />;
    case "dataTable":
      return <AnalystReportTable block={block} />;
    case "timeline":
      return (
        <Panel title={block.title}>
          <ol className="max-h-[520px] space-y-3 overflow-y-auto pr-1">
            {block.events.map((event) => (
              <li
                className={cn("border-l pl-3", toneBorder(event.tone) ?? "border-white/[0.1]")}
                key={`${event.ts}-${event.title}`}
              >
                <time className="font-mono text-[11px] text-bankops-muted">
                  {formatDateTime(event.ts)}
                </time>
                <p className="mt-1 text-sm font-semibold text-white">{event.title}</p>
                {event.detail ? (
                  <p className="mt-1 text-xs leading-5 text-bankops-muted">{event.detail}</p>
                ) : null}
              </li>
            ))}
          </ol>
        </Panel>
      );
    case "railMatrix":
      return (
        <Panel title={block.title}>
          <div className="overflow-x-auto">
            <div className="grid min-w-[640px] gap-2">
              <div
                className="grid gap-2"
                style={{
                  gridTemplateColumns: `120px repeat(${block.metrics.length}, minmax(120px, 1fr))`,
                }}
              >
                <div />
                {block.metrics.map((metric) => (
                  <div
                    className="text-[10px] font-semibold uppercase tracking-[0.12em] text-bankops-muted"
                    key={metric}
                  >
                    {metric}
                  </div>
                ))}
              </div>
              {block.rails.map((rail) => (
                <div
                  className="grid gap-2"
                  key={rail}
                  style={{
                    gridTemplateColumns: `120px repeat(${block.metrics.length}, minmax(120px, 1fr))`,
                  }}
                >
                  <div className="truncate text-xs font-semibold text-white">{rail}</div>
                  {block.metrics.map((metric) => {
                    const cell = block.cells.find(
                      (candidate) => candidate.rail === rail && candidate.metric === metric,
                    );
                    return (
                      <div
                        className={cn(
                          "truncate border border-white/[0.07] bg-black/20 px-3 py-2 font-mono text-xs text-bankops-text",
                          toneBorder(cell?.tone),
                        )}
                        key={`${rail}-${metric}`}
                        title={String(cell?.value ?? "")}
                      >
                        {cell?.value ?? "-"}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </Panel>
      );
    case "customerList":
    case "customerCarousel":
      return (
        <Panel title={block.title}>
          <div
            className={cn(
              "gap-2",
              block.type === "customerCarousel"
                ? "flex snap-x overflow-x-auto pb-1"
                : "grid md:grid-cols-2",
            )}
          >
            {block.customers.map((customer) => (
              <div
                className={cn(
                  "border border-white/[0.08] bg-black/20 p-3",
                  block.type === "customerCarousel" && "min-w-72 snap-start",
                  toneBorder(customer.tone),
                )}
                key={customer.id}
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-white">{customer.name}</p>
                  <p className="font-mono text-xs text-bankops-text">{customer.metric}</p>
                </div>
                {customer.detail ? (
                  <p className="mt-2 text-xs leading-5 text-bankops-muted">{customer.detail}</p>
                ) : null}
              </div>
            ))}
          </div>
        </Panel>
      );
    case "empty":
    case "error":
      return (
        <Panel
          className={block.type === "error" ? "border-bankops-negative/24" : undefined}
          title={block.title}
        >
          <p className="text-sm leading-6 text-bankops-muted">{block.body}</p>
        </Panel>
      );
    default: {
      const exhaustive: never = block;
      return exhaustive;
    }
  }
}

function MetricCard({
  metric,
}: {
  metric: Extract<AnalystReportBlock, { type: "metric" }>["metric"];
}) {
  return (
    <div
      className={cn(
        "rounded-md border border-white/[0.08] bg-bankops-panel p-3.5",
        toneBorder(metric.tone),
      )}
    >
      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-bankops-muted">
        {metric.label}
      </p>
      <p className="mt-3 text-2xl font-semibold tracking-tight text-white">{metric.value}</p>
      {metric.delta ? <p className="mt-2 text-xs text-bankops-muted">{metric.delta}</p> : null}
    </div>
  );
}

function Panel({
  children,
  className,
  title,
}: {
  children: React.ReactNode;
  className?: string;
  title?: string;
}) {
  return (
    <section
      className={cn("rounded-md border border-white/[0.08] bg-bankops-panel p-4", className)}
    >
      {title ? <BlockTitle>{title}</BlockTitle> : null}
      {children}
    </section>
  );
}

function BlockTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.13em] text-bankops-muted">
      {children}
    </h3>
  );
}

function CalloutIcon({ tone }: { tone?: "info" | "warning" | "critical" | "success" }) {
  if (tone === "warning") {
    return <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-300" />;
  }
  if (tone === "critical") {
    return <CircleAlert className="mt-0.5 size-4 shrink-0 text-bankops-negative" />;
  }
  if (tone === "success") {
    return <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-bankops-positive" />;
  }
  return <Info className="mt-0.5 size-4 shrink-0 text-sky-300" />;
}

function toneBorder(tone?: "neutral" | "good" | "warning" | "critical" | "success" | "info") {
  if (tone === "good" || tone === "success") {
    return "border-bankops-positive/20";
  }
  if (tone === "warning") {
    return "border-amber-300/24";
  }
  if (tone === "critical") {
    return "border-bankops-negative/24";
  }
  if (tone === "info") {
    return "border-sky-300/20";
  }
  return undefined;
}

function blockKey(block: AnalystReportBlock, index: number) {
  const title = "title" in block ? block.title : undefined;
  return `${block.type}-${title ?? index}`;
}

function formatDateTime(value: string | number) {
  return dateTimeFormat.format(typeof value === "number" ? value : Date.parse(value));
}
