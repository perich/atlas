import React from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { AnalystReportBlock } from "@bankops/contracts";

import { cn } from "../../../design/utils";

type ChartBlock = Extract<
  AnalystReportBlock,
  { type: "lineChart" | "barChart" | "areaChart" | "donutChart" | "sparkline" }
>;

const chartColors = ["#7dd3fc", "#86efac", "#fbbf24", "#fda4af", "#c4b5fd", "#67e8f9"];

export function AnalystReportChart({ block }: { block: ChartBlock }) {
  const data = block.data;
  const height = block.type === "sparkline" ? 96 : 240;

  return (
    <section className="rounded-md border border-white/[0.08] bg-bankops-panel p-4">
      <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.13em] text-bankops-muted">
        {block.title}
      </h3>
      <div className="overflow-x-auto">
        <div className={cn("min-w-[640px]", block.type === "sparkline" && "min-w-[360px]")}>
          {block.type === "lineChart" || block.type === "sparkline" ? (
            <LineChart data={data} height={height} margin={chartMargin(block.type)} width={640}>
              {block.type === "lineChart" ? <ChartFrame xKey={block.xKey} /> : null}
              {block.series.map((series, index) => (
                <Line
                  dataKey={series.key}
                  dot={false}
                  key={series.key}
                  name={series.label ?? series.key}
                  stroke={chartColors[index % chartColors.length]}
                  strokeWidth={2}
                  type="monotone"
                />
              ))}
              {block.type === "sparkline" ? null : <Tooltip content={<ChartTooltip />} />}
            </LineChart>
          ) : null}
          {block.type === "barChart" ? (
            <BarChart data={data} height={height} margin={chartMargin(block.type)} width={640}>
              <ChartFrame xKey={block.xKey} />
              {block.series.map((series, index) => (
                <Bar
                  dataKey={series.key}
                  fill={chartColors[index % chartColors.length]}
                  key={series.key}
                  name={series.label ?? series.key}
                  radius={[3, 3, 0, 0]}
                />
              ))}
              <Tooltip content={<ChartTooltip />} />
            </BarChart>
          ) : null}
          {block.type === "areaChart" ? (
            <AreaChart data={data} height={height} margin={chartMargin(block.type)} width={640}>
              <ChartFrame xKey={block.xKey} />
              {block.series.map((series, index) => (
                <Area
                  dataKey={series.key}
                  fill={chartColors[index % chartColors.length]}
                  fillOpacity={0.18}
                  key={series.key}
                  name={series.label ?? series.key}
                  stroke={chartColors[index % chartColors.length]}
                  strokeWidth={2}
                  type="monotone"
                />
              ))}
              <Tooltip content={<ChartTooltip />} />
            </AreaChart>
          ) : null}
          {block.type === "donutChart" ? <DonutChart block={block} /> : null}
        </div>
      </div>
    </section>
  );
}

function ChartFrame({ xKey }: { xKey: string }) {
  return (
    <>
      <CartesianGrid stroke="rgba(255,255,255,0.08)" vertical={false} />
      <XAxis
        dataKey={xKey}
        minTickGap={18}
        stroke="rgba(207,213,224,0.55)"
        tick={{ fill: "rgba(207,213,224,0.65)", fontSize: 11 }}
        tickLine={false}
      />
      <YAxis
        stroke="rgba(207,213,224,0.55)"
        tick={{ fill: "rgba(207,213,224,0.65)", fontSize: 11 }}
        tickLine={false}
        width={54}
      />
    </>
  );
}

function DonutChart({ block }: { block: ChartBlock }) {
  const seriesKey = block.series[0]?.key;
  const data = seriesKey ? block.data : [];

  return (
    <div className="grid min-h-60 grid-cols-[280px_minmax(0,1fr)] items-center gap-4">
      <PieChart height={240} width={280}>
        <Pie
          cx="50%"
          cy="50%"
          data={data}
          dataKey={seriesKey}
          innerRadius={58}
          nameKey={block.xKey}
          outerRadius={96}
          paddingAngle={2}
        >
          {data.map((point, index) => (
            <Cell fill={chartColors[index % chartColors.length]} key={String(point[block.xKey])} />
          ))}
        </Pie>
        <Tooltip content={<ChartTooltip />} />
      </PieChart>
      <div className="grid gap-2">
        {data.map((point, index) => (
          <div
            className="flex items-center justify-between gap-3 border border-white/[0.06] bg-black/20 px-3 py-2 text-xs"
            key={String(point[block.xKey])}
          >
            <span className="flex min-w-0 items-center gap-2 text-bankops-text">
              <span
                className="size-2 shrink-0 rounded-full"
                style={{ backgroundColor: chartColors[index % chartColors.length] }}
              />
              <span className="truncate">{String(point[block.xKey])}</span>
            </span>
            <span className="font-mono text-bankops-muted">{String(point[seriesKey] ?? "")}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ChartTooltip({ active, payload, label }: Record<string, unknown>) {
  if (!active || !Array.isArray(payload) || payload.length === 0) {
    return null;
  }

  return (
    <div className="border border-white/[0.12] bg-[#101214] px-3 py-2 text-xs shadow-xl shadow-black/35">
      <p className="mb-1 font-mono text-bankops-muted">{formatTooltipValue(label)}</p>
      {payload.map((item) => {
        if (!isTooltipEntry(item)) {
          return null;
        }

        return (
          <p
            className="flex items-center gap-2 text-bankops-text"
            key={formatTooltipValue(item.name)}
          >
            <span className="size-2 rounded-full" style={{ backgroundColor: item.color }} />
            <span>{formatTooltipValue(item.name)}</span>
            <span className="font-mono text-white">{formatTooltipValue(item.value)}</span>
          </p>
        );
      })}
    </div>
  );
}

function isTooltipEntry(
  item: unknown,
): item is { color?: string; name?: string | number; value?: string | number } {
  return item !== null && typeof item === "object" && ("name" in item || "value" in item);
}

function formatTooltipValue(value: unknown) {
  return typeof value === "string" || typeof value === "number" ? String(value) : "";
}

function chartMargin(type: ChartBlock["type"]) {
  return type === "sparkline"
    ? { bottom: 8, left: 0, right: 8, top: 8 }
    : { bottom: 8, left: 0, right: 18, top: 8 };
}
