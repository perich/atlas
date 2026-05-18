import { describe, expect, it } from "vitest";

import {
  ANALYST_REPORT_VERSION,
  MAX_ANALYST_CHART_POINTS,
  MAX_ANALYST_MARKDOWN_LENGTH,
  MAX_ANALYST_NESTING_DEPTH,
  MAX_ANALYST_TABLE_ROWS,
  analystReportSpecSchema,
  analystRunEventSchema,
  type AnalystReportBlock,
  type AnalystReportSpec,
} from "./analyst.js";

const baseReport = {
  version: ANALYST_REPORT_VERSION,
  title: "ACH return pressure",
  subtitle: "Elevated returns are concentrated in two windows.",
  generatedAt: "2026-05-18T15:45:00.000Z",
  question: "Where are ACH returns clustering today?",
  summary: "ACH return pressure is elevated but operationally contained.",
  blocks: [
    {
      type: "metricGrid",
      metrics: [
        { label: "Return rate", value: "3.8%", delta: "+90 bps", tone: "warning" },
        { label: "Impacted customers", value: 42, tone: "neutral" },
      ],
    },
    {
      type: "lineChart",
      title: "Hourly return rate",
      xKey: "hour",
      series: [{ key: "returnRate", label: "Return rate" }],
      data: [
        { hour: "09:00", returnRate: 0.024 },
        { hour: "10:00", returnRate: 0.038 },
      ],
    },
    {
      type: "dataTable",
      title: "Largest impacted originators",
      columns: [
        { key: "customer", label: "Customer" },
        { key: "returns", label: "Returns", align: "right" },
      ],
      rows: [
        { customer: "Northstar Payroll", returns: 18 },
        { customer: "Aster Marketplace", returns: 11 },
      ],
    },
  ],
} satisfies AnalystReportSpec;

describe("Analyst Report contract", () => {
  it("accepts a representative report spec", () => {
    expect(analystReportSpecSchema.parse(baseReport).title).toBe("ACH return pressure");
  });

  it("rejects over-cap table rows, chart points, and markdown", () => {
    expect(() =>
      analystReportSpecSchema.parse({
        ...baseReport,
        blocks: [
          {
            type: "dataTable",
            title: "Too many rows",
            columns: [{ key: "id", label: "ID" }],
            rows: Array.from({ length: MAX_ANALYST_TABLE_ROWS + 1 }, (_, index) => ({
              id: `row-${index}`,
            })),
          },
        ],
      }),
    ).toThrow();

    expect(() =>
      analystReportSpecSchema.parse({
        ...baseReport,
        blocks: [
          {
            type: "lineChart",
            title: "Too many points",
            xKey: "x",
            series: [{ key: "y" }],
            data: Array.from({ length: MAX_ANALYST_CHART_POINTS + 1 }, (_, index) => ({
              x: String(index),
              y: index,
            })),
          },
        ],
      }),
    ).toThrow();

    expect(() =>
      analystReportSpecSchema.parse({
        ...baseReport,
        summary: "x".repeat(MAX_ANALYST_MARKDOWN_LENGTH + 1),
      }),
    ).toThrow();
  });

  it("rejects invalid blocks and excessive nesting", () => {
    expect(() =>
      analystReportSpecSchema.parse({
        ...baseReport,
        blocks: [{ type: "metric", metric: { label: "Missing value" } }],
      }),
    ).toThrow();

    expect(() =>
      analystReportSpecSchema.parse({
        ...baseReport,
        blocks: [nestedStack(MAX_ANALYST_NESTING_DEPTH + 1)],
      }),
    ).toThrow(/nesting/);
  });

  it("validates run events", () => {
    const event = analystRunEventSchema.parse({ type: "phase", phase: "generating" });

    expect(event.type).toBe("phase");
    if (event.type === "phase") {
      expect(event.phase).toBe("generating");
    }
    expect(() =>
      analystRunEventSchema.parse({ type: "validation", attempt: 5, ok: false }),
    ).toThrow();
    expect(
      analystRunEventSchema.parse({
        at: "2026-05-18T18:00:00.000Z",
        detail: "100,000 entries",
        label: "Loaded dataset overview",
        type: "progress",
      }).type,
    ).toBe("progress");
    expect(
      analystRunEventSchema.parse({
        at: "2026-05-18T18:00:00.000Z",
        detail: "get_dataset_overview",
        label: "tool result",
        source: "tool",
        type: "trace",
      }).type,
    ).toBe("trace");
  });
});

function nestedStack(depth: number): AnalystReportBlock {
  if (depth === 1) {
    return { type: "summary", items: ["Leaf insight"] };
  }

  return {
    type: "stack",
    blocks: [nestedStack(depth - 1)],
  };
}
