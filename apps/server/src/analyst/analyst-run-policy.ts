import type { OpenRouterTextModelOptions } from "@tanstack/ai-openrouter";

export const ANALYST_MAX_ATTEMPTS = 4;
export const ANALYST_CODE_MODE_TIMEOUT_MS = 120_000;

export const ANALYST_SYSTEM_PROMPT = `You are the BankOps CodeMode Analyst.

Use execute_typescript to call bounded external_get_* analyst tools, analyze their compact outputs,
and submit exactly one complete AnalystReportSpec by calling external_submit_report(spec).

Hard constraints:
- Do all work inside execute_typescript. Do not answer in prose.
- Use console.log for short safe milestones before tool calls, after tool results, before report assembly, and before final submit.
- End the execute_typescript program with: await external_submit_report(report);
- Do not generate React, JSX, CSS, handlers, subscriptions, watchers, or browser code.
- Do not invent hidden scenario labels. Only describe observable audit-log facts returned by tools.
- Embed all chart, dataTable, timeline, metric, markdown, and summary data in the submitted report.
- Chart data must contain every declared xKey and series key on every row. Use numeric values for series fields.
- For get_breakdown outputs, convert rows like { key, value } into chart rows like { label: key, count: Number(value) } and set xKey/series to those exact property names.
- Tables must use type "dataTable" and contain capped rows useful for local rendering.
- Table cells must be primitive strings, numbers, booleans, or null. Never place raw objects in table cells; use summary/detail strings instead.
- external_get_audit_sample rows expose detail and detailSummary as safe strings for evidence tables. Use row.summary, row.detail, or row.detailSummary; never stringify whole row objects.
- When using external_get_audit_sample for evidence tables, request limit 40-80 unless the user's ask is very narrow.
- external_get_customer_risk_rollup rows expose numeric risk and riskScore aliases; use those for priority/risk columns.
- When using external_get_customer_risk_rollup for prioritization views, request limit 40-80 unless the user's ask is very narrow.
- Narrative text must use type "markdown" or "summary"; never use a block type named "narrative".
- Metrics must use type "metric" with a nested metric object, or type "metricGrid" with a metrics array.
- Use version "2026-05-analyst-report" and an ISO datetime generatedAt value.
`;

export const ANALYST_CODE_MODE_SCAFFOLD = `Use this exact shape inside execute_typescript:
const overview = await external_get_dataset_overview({});
console.log("loaded dataset overview", overview.totalEntries, "entries");
const risk = await external_get_customer_risk_rollup({ limit: 40 });
console.log("loaded customer risk rows", risk.rows.length);
const report = {
  version: "2026-05-analyst-report",
  title: "...",
  generatedAt: new Date().toISOString(),
  question: "copy the user's question",
  summary: "...",
  blocks: [
    {
      type: "metricGrid",
      title: "Current posture",
      metrics: [
        { label: "Failed rate", value: "8.6%", delta: "+210 bps", tone: "warning" },
        { label: "Impacted customers", value: 12, tone: "neutral" }
      ]
    },
    {
      type: "barChart",
      title: "Exception pressure by rail",
      xKey: "rail",
      series: [{ key: "exceptions", label: "Exceptions" }],
      data: [
        { rail: "ACH", exceptions: 120 },
        { rail: "Wire", exceptions: 38 }
      ]
    },
    {
      type: "dataTable",
      title: "Customers needing review",
      columns: [
        { key: "customer", label: "Customer" },
        { key: "risk", label: "Risk", align: "right" },
        { key: "reason", label: "Reason" }
      ],
      rows: [
        { customer: "Aster Payroll", risk: 92, reason: "High failed-count and exception pressure" }
      ]
    },
    {
      type: "markdown",
      title: "Operational readout",
      markdown: "The riskiest pattern is **ACH exception pressure** concentrated near cutoff."
    },
    {
      type: "summary",
      items: ["Prioritize customers with critical failures.", "Keep unaffected rails moving."]
    }
  ]
};
await external_submit_report(report);

Valid block types only:
- "summary": { type, title?, items: string[] }
- "markdown": { type, title?, markdown }
- "callout": { type, title, body, tone?: "info" | "warning" | "critical" | "success" }
- "metric": { type, metric: { label, value, delta?, tone?: "neutral" | "good" | "warning" | "critical" } }
- "metricGrid": { type, title?, metrics: metric[] }
- "lineChart" | "barChart" | "areaChart" | "donutChart" | "sparkline": { type, title, xKey, series: [{ key, label? }], data }
- "dataTable": { type, title, columns: [{ key, label, align?: "left" | "right" }], rows }
- "timeline": { type, title, events: [{ ts: number, title, detail?, tone? }] }
- "railMatrix": { type, title, rails, metrics, cells: [{ rail, metric, value, tone? }] }
- "customerList" | "customerCarousel": { type, title, customers: [{ id, name, metric, detail?, tone? }] }
- "section" | "grid" | "stack": container blocks with nested blocks arrays.

Never use these invalid block types: "table", "narrative", "chart", "text".
Never put title/value/delta directly on a "metric" block; put them inside block.metric.`;

export function analystModelOptions(): OpenRouterTextModelOptions {
  return {
    reasoning: { effort: "medium" },
  };
}

export function analystUserPrompt({
  question,
  validationError,
}: {
  question: string;
  validationError?: string;
}) {
  return JSON.stringify({
    question,
    repairInstruction:
      validationError === undefined
        ? undefined
        : `The submitted report failed validation: ${validationError}. Submit a corrected full report.`,
  });
}

export function reasoningTraceDelta(event: unknown) {
  if (event === null || typeof event !== "object" || !("type" in event)) {
    return undefined;
  }

  const candidate = event as { type?: unknown; delta?: unknown };
  if (candidate.type !== "REASONING_MESSAGE_CONTENT" || typeof candidate.delta !== "string") {
    return undefined;
  }

  return candidate.delta;
}

export function reasoningTraceSnippet(value: string) {
  const detail = value.replace(/\s+/g, " ").trim();
  return detail.length > 0 ? detail.slice(0, 1_500) : undefined;
}
