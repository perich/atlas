import { z } from "zod";

export const ANALYST_REPORT_VERSION = "2026-05-analyst-report";
export const MAX_ANALYST_BLOCKS = 48;
export const MAX_ANALYST_NESTING_DEPTH = 4;
export const MAX_ANALYST_TABLE_ROWS = 80;
export const MAX_ANALYST_CHART_POINTS = 120;
export const MAX_ANALYST_MARKDOWN_LENGTH = 4_000;
export const MAX_ANALYST_WARNINGS = 8;

const textSchema = z.string().min(1).max(240);
const longTextSchema = z.string().min(1).max(1_200);
const markdownSchema = z.string().min(1).max(MAX_ANALYST_MARKDOWN_LENGTH);
const numberLikeSchema = z.union([z.number().finite(), z.string().min(1).max(80)]);
const tableValueSchema = z.union([z.string(), z.number().finite(), z.boolean(), z.null()]);

export const analystReportRunPhaseSchema = z.enum([
  "idle",
  "generating",
  "querying",
  "validating",
  "repairing",
  "done",
  "error",
]);

export const analystRunEventSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("phase"),
    phase: analystReportRunPhaseSchema,
    message: z.string().max(400).optional(),
  }),
  z.object({
    type: z.literal("progress"),
    at: z.string().datetime(),
    label: z.string().min(1).max(160),
    detail: z.string().max(500).optional(),
  }),
  z.object({
    type: z.literal("trace"),
    at: z.string().datetime(),
    source: z.enum(["model", "codemode", "tool", "validation", "runtime"]),
    label: z.string().min(1).max(160),
    detail: z.string().max(1_500).optional(),
  }),
  z.object({
    type: z.literal("code"),
    code: z.string().max(20_000),
  }),
  z.object({
    type: z.literal("validation"),
    ok: z.boolean(),
    attempt: z.int().min(1).max(4),
    message: z.string().max(1_000).optional(),
  }),
  z.object({
    type: z.literal("report"),
    report: z.unknown(),
  }),
  z.object({
    type: z.literal("error"),
    message: z.string().min(1).max(1_000),
  }),
]);

const chartPointSchema = z.record(
  z.string(),
  z.union([z.string(), z.number().finite(), z.boolean(), z.null()]),
);
const chartSeriesSchema = z
  .object({
    key: z.string().min(1).max(80),
    label: textSchema.optional(),
  })
  .strict();
const dataColumnSchema = z
  .object({
    key: z.string().min(1).max(80),
    label: textSchema,
    align: z.enum(["left", "right"]).optional(),
  })
  .strict();
const dataRowSchema = z.record(z.string(), tableValueSchema);
const metricSchema = z
  .object({
    label: textSchema,
    value: numberLikeSchema,
    delta: z.string().max(80).optional(),
    tone: z.enum(["neutral", "good", "warning", "critical"]).optional(),
  })
  .strict();

type AnalystMetric = z.infer<typeof metricSchema>;
type ChartPoint = z.infer<typeof chartPointSchema>;
type ChartSeries = z.infer<typeof chartSeriesSchema>;
type DataColumn = z.infer<typeof dataColumnSchema>;
type DataRow = z.infer<typeof dataRowSchema>;

export type AnalystReportBlock =
  | { type: "stack"; title?: string; blocks: AnalystReportBlock[] }
  | { type: "grid"; title?: string; columns?: number; blocks: AnalystReportBlock[] }
  | {
      type: "section";
      title: string;
      description?: string;
      blocks: AnalystReportBlock[];
    }
  | { type: "summary"; title?: string; items: string[] }
  | { type: "markdown"; title?: string; markdown: string }
  | {
      type: "callout";
      title: string;
      body: string;
      tone?: "info" | "warning" | "critical" | "success";
    }
  | { type: "metric"; metric: AnalystMetric }
  | { type: "metricGrid"; title?: string; metrics: AnalystMetric[] }
  | {
      type: "lineChart" | "barChart" | "areaChart" | "donutChart" | "sparkline";
      title: string;
      xKey: string;
      series: ChartSeries[];
      data: ChartPoint[];
    }
  | { type: "dataTable"; title: string; columns: DataColumn[]; rows: DataRow[] }
  | {
      type: "timeline";
      title: string;
      events: {
        ts: number;
        title: string;
        detail?: string;
        tone?: "neutral" | "warning" | "critical" | "success";
      }[];
    }
  | {
      type: "railMatrix";
      title: string;
      rails: string[];
      metrics: string[];
      cells: {
        rail: string;
        metric: string;
        value: string | number;
        tone?: "neutral" | "good" | "warning" | "critical";
      }[];
    }
  | {
      type: "customerList" | "customerCarousel";
      title: string;
      customers: {
        id: string;
        name: string;
        metric: string | number;
        detail?: string;
        tone?: "neutral" | "good" | "warning" | "critical";
      }[];
    }
  | { type: "empty"; title: string; body: string }
  | { type: "error"; title: string; body: string };

type AnalystChartBlock = Extract<
  AnalystReportBlock,
  { type: "lineChart" | "barChart" | "areaChart" | "donutChart" | "sparkline" }
>;

export const analystReportBlockSchema: z.ZodType<AnalystReportBlock> = z.lazy(() =>
  z.discriminatedUnion("type", [
    z
      .object({
        type: z.literal("stack"),
        title: textSchema.optional(),
        blocks: z.array(analystReportBlockSchema).min(1).max(12),
      })
      .strict(),
    z
      .object({
        type: z.literal("grid"),
        title: textSchema.optional(),
        columns: z.int().min(2).max(4).optional(),
        blocks: z.array(analystReportBlockSchema).min(1).max(12),
      })
      .strict(),
    z
      .object({
        type: z.literal("section"),
        title: textSchema,
        description: longTextSchema.optional(),
        blocks: z.array(analystReportBlockSchema).min(1).max(16),
      })
      .strict(),
    z
      .object({
        type: z.literal("summary"),
        title: textSchema.optional(),
        items: z.array(longTextSchema).min(1).max(8),
      })
      .strict(),
    z
      .object({
        type: z.literal("markdown"),
        title: textSchema.optional(),
        markdown: markdownSchema,
      })
      .strict(),
    z
      .object({
        type: z.literal("callout"),
        title: textSchema,
        body: longTextSchema,
        tone: z.enum(["info", "warning", "critical", "success"]).optional(),
      })
      .strict(),
    z.object({ type: z.literal("metric"), metric: metricSchema }).strict(),
    z
      .object({
        type: z.literal("metricGrid"),
        title: textSchema.optional(),
        metrics: z.array(metricSchema).min(1).max(12),
      })
      .strict(),
    z
      .object({
        type: z.enum(["lineChart", "barChart", "areaChart", "donutChart", "sparkline"]),
        title: textSchema,
        xKey: z.string().min(1).max(80),
        series: z.array(chartSeriesSchema).min(1).max(6),
        data: z.array(chartPointSchema).min(1).max(MAX_ANALYST_CHART_POINTS),
      })
      .strict(),
    z
      .object({
        type: z.literal("dataTable"),
        title: textSchema,
        columns: z.array(dataColumnSchema).min(1).max(12),
        rows: z.array(dataRowSchema).max(MAX_ANALYST_TABLE_ROWS),
      })
      .strict(),
    z
      .object({
        type: z.literal("timeline"),
        title: textSchema,
        events: z
          .array(
            z
              .object({
                ts: z.number().finite(),
                title: textSchema,
                detail: longTextSchema.optional(),
                tone: z.enum(["neutral", "warning", "critical", "success"]).optional(),
              })
              .strict(),
          )
          .min(1)
          .max(40),
      })
      .strict(),
    z
      .object({
        type: z.literal("railMatrix"),
        title: textSchema,
        rails: z.array(textSchema).min(1).max(8),
        metrics: z.array(textSchema).min(1).max(8),
        cells: z
          .array(
            z
              .object({
                rail: textSchema,
                metric: textSchema,
                value: numberLikeSchema,
                tone: z.enum(["neutral", "good", "warning", "critical"]).optional(),
              })
              .strict(),
          )
          .max(64),
      })
      .strict(),
    z
      .object({
        type: z.enum(["customerList", "customerCarousel"]),
        title: textSchema,
        customers: z
          .array(
            z
              .object({
                id: z.string().min(1).max(80),
                name: textSchema,
                metric: numberLikeSchema,
                detail: longTextSchema.optional(),
                tone: z.enum(["neutral", "good", "warning", "critical"]).optional(),
              })
              .strict(),
          )
          .min(1)
          .max(24),
      })
      .strict(),
    z.object({ type: z.literal("empty"), title: textSchema, body: longTextSchema }).strict(),
    z.object({ type: z.literal("error"), title: textSchema, body: longTextSchema }).strict(),
  ]),
) as z.ZodType<AnalystReportBlock>;

export const analystReportSpecSchema = z
  .object({
    version: z.literal(ANALYST_REPORT_VERSION),
    title: textSchema,
    subtitle: longTextSchema.optional(),
    generatedAt: z.string().datetime(),
    question: longTextSchema,
    summary: markdownSchema,
    blocks: z.array(analystReportBlockSchema).min(1).max(MAX_ANALYST_BLOCKS),
    warnings: z.array(longTextSchema).max(MAX_ANALYST_WARNINGS).optional(),
  })
  .strict()
  .superRefine((report, ctx) => {
    for (const [index, block] of report.blocks.entries()) {
      validateBlockDepth(block, 1, ctx, ["blocks", index]);
      validateBlockSemantics(block, ctx, ["blocks", index]);
    }
  });

function validateBlockDepth(
  block: AnalystReportBlock,
  depth: number,
  ctx: z.RefinementCtx,
  path: (string | number)[],
) {
  if (depth > MAX_ANALYST_NESTING_DEPTH) {
    ctx.addIssue({
      code: "custom",
      message: `Analyst Report block nesting cannot exceed ${MAX_ANALYST_NESTING_DEPTH}`,
      path,
    });
    return;
  }

  if ("blocks" in block) {
    for (const [index, child] of block.blocks.entries()) {
      validateBlockDepth(child, depth + 1, ctx, [...path, "blocks", index]);
    }
  }
}

function validateBlockSemantics(
  block: AnalystReportBlock,
  ctx: z.RefinementCtx,
  path: (string | number)[],
) {
  if ("blocks" in block) {
    for (const [index, child] of block.blocks.entries()) {
      validateBlockSemantics(child, ctx, [...path, "blocks", index]);
    }
    return;
  }

  if (isChartBlock(block)) {
    validateChartBlock(block, ctx, path);
  }

  if (block.type === "dataTable") {
    validateTableBlock(block, ctx, path);
  }
}

function isChartBlock(block: AnalystReportBlock): block is AnalystChartBlock {
  return (
    block.type === "lineChart" ||
    block.type === "barChart" ||
    block.type === "areaChart" ||
    block.type === "donutChart" ||
    block.type === "sparkline"
  );
}

function validateChartBlock(
  block: AnalystChartBlock,
  ctx: z.RefinementCtx,
  path: (string | number)[],
) {
  for (const [rowIndex, point] of block.data.entries()) {
    if (!(block.xKey in point)) {
      ctx.addIssue({
        code: "custom",
        message: `Chart "${block.title}" data row is missing xKey "${block.xKey}"`,
        path: [...path, "data", rowIndex],
      });
    }

    for (const series of block.series) {
      if (!(series.key in point)) {
        ctx.addIssue({
          code: "custom",
          message: `Chart "${block.title}" data row is missing series key "${series.key}"`,
          path: [...path, "data", rowIndex],
        });
        continue;
      }

      if (!isFiniteNumberLike(point[series.key])) {
        ctx.addIssue({
          code: "custom",
          message: `Chart "${block.title}" series key "${series.key}" must contain numeric values`,
          path: [...path, "data", rowIndex, series.key],
        });
      }
    }
  }
}

function validateTableBlock(
  block: Extract<AnalystReportBlock, { type: "dataTable" }>,
  ctx: z.RefinementCtx,
  path: (string | number)[],
) {
  for (const [rowIndex, row] of block.rows.entries()) {
    for (const column of block.columns) {
      if (!(column.key in row)) {
        ctx.addIssue({
          code: "custom",
          message: `Table "${block.title}" row is missing column key "${column.key}"`,
          path: [...path, "rows", rowIndex],
        });
        continue;
      }

      const value = row[column.key];
      if (typeof value === "string" && value.includes("[object Object]")) {
        ctx.addIssue({
          code: "custom",
          message: `Table "${block.title}" column "${column.key}" contains an object placeholder string`,
          path: [...path, "rows", rowIndex, column.key],
        });
      }
    }
  }
}

function isFiniteNumberLike(value: unknown) {
  return (
    typeof value === "number" ||
    (typeof value === "string" && value.trim() !== "" && Number.isFinite(Number(value)))
  );
}

export type AnalystReportRunPhase = z.infer<typeof analystReportRunPhaseSchema>;
export type AnalystRunEvent = z.infer<typeof analystRunEventSchema>;
export type AnalystReportSpec = z.infer<typeof analystReportSpecSchema>;
