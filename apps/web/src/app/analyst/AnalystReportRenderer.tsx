import React from "react";
import { AlertTriangle, CheckCircle2, CircleAlert, Info } from "lucide-react";
import {
  analystReportSpecSchema,
  type AnalystReportBlock,
  type AnalystReportSpec,
} from "@bankops/contracts";

import { cn } from "../../design/utils";

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
            {new Date(report.generatedAt).toLocaleString()}
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
                <CheckCircle2 className="mt-1 size-4 shrink-0 text-emerald-300/85" />
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
      return <SimpleChart block={block} />;
    case "dataTable":
      return (
        <Panel title={block.title}>
          <div className="overflow-x-auto">
            <table className="min-w-full border-separate border-spacing-0 text-left text-xs">
              <thead className="text-[10px] uppercase tracking-[0.12em] text-bankops-muted">
                <tr>
                  {block.columns.map((column) => (
                    <th
                      className={cn(
                        "border-b border-white/[0.08] px-3 py-2",
                        column.align === "right" && "text-right",
                      )}
                      key={column.key}
                    >
                      {column.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {block.rows.map((row, rowIndex) => (
                  <tr className="text-bankops-text" key={rowKey(row, rowIndex)}>
                    {block.columns.map((column) => (
                      <td
                        className={cn(
                          "border-b border-white/[0.055] px-3 py-2",
                          column.align === "right" && "text-right",
                        )}
                        key={column.key}
                      >
                        {String(row[column.key] ?? "")}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      );
    case "timeline":
      return (
        <Panel title={block.title}>
          <ol className="space-y-3">
            {block.events.map((event) => (
              <li className="border-l border-white/[0.1] pl-3" key={`${event.ts}-${event.title}`}>
                <time className="font-mono text-[11px] text-bankops-muted">
                  {new Date(event.ts).toLocaleString()}
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
          <div className="grid gap-2">
            {block.cells.map((cell) => (
              <div
                className={cn(
                  "flex items-center justify-between gap-3 border border-white/[0.07] bg-black/20 px-3 py-2 text-xs",
                  toneBorder(cell.tone),
                )}
                key={`${cell.rail}-${cell.metric}`}
              >
                <span className="font-medium text-white">{cell.rail}</span>
                <span className="text-bankops-muted">{cell.metric}</span>
                <span className="font-mono text-bankops-text">{cell.value}</span>
              </div>
            ))}
          </div>
        </Panel>
      );
    case "customerList":
    case "customerCarousel":
      return (
        <Panel title={block.title}>
          <div className="grid gap-2 md:grid-cols-2">
            {block.customers.map((customer) => (
              <div
                className={cn(
                  "border border-white/[0.08] bg-black/20 p-3",
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
        <Panel title={block.title}>
          <p className="text-sm leading-6 text-bankops-muted">{block.body}</p>
        </Panel>
      );
    default: {
      const exhaustive: never = block;
      return exhaustive;
    }
  }
}

function SimpleChart({
  block,
}: {
  block: Extract<
    AnalystReportBlock,
    { type: "lineChart" | "barChart" | "areaChart" | "donutChart" | "sparkline" }
  >;
}) {
  const series = block.series[0];
  const max = Math.max(
    ...block.data.map((point) => {
      const value = point[series.key];
      return typeof value === "number" ? value : 0;
    }),
    1,
  );

  return (
    <Panel title={block.title}>
      <div className="flex h-44 items-end gap-2">
        {block.data.map((point) => {
          const rawValue = point[series.key];
          const value = typeof rawValue === "number" ? rawValue : 0;
          return (
            <div
              className="flex min-w-8 flex-1 flex-col items-center gap-2"
              key={String(point[block.xKey])}
            >
              <div
                aria-label={`${String(point[block.xKey])}: ${value}`}
                className="w-full border border-sky-300/30 bg-sky-300/35"
                style={{ height: `${Math.max((value / max) * 100, 4)}%` }}
              />
              <span className="max-w-16 truncate font-mono text-[10px] text-bankops-muted">
                {String(point[block.xKey])}
              </span>
            </div>
          );
        })}
      </div>
    </Panel>
  );
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
    return <CircleAlert className="mt-0.5 size-4 shrink-0 text-rose-300" />;
  }
  if (tone === "success") {
    return <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-300" />;
  }
  return <Info className="mt-0.5 size-4 shrink-0 text-sky-300" />;
}

function toneBorder(tone?: "neutral" | "good" | "warning" | "critical" | "success" | "info") {
  if (tone === "good" || tone === "success") {
    return "border-emerald-300/20";
  }
  if (tone === "warning") {
    return "border-amber-300/24";
  }
  if (tone === "critical") {
    return "border-rose-300/24";
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

function rowKey(row: Record<string, unknown>, index: number) {
  return `${index}-${Object.values(row).join("|")}`;
}
