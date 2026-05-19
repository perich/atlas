import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { describe, expect, it } from "vitest";

import { AnalystReportRenderer } from "./AnalystReportRenderer";
import { analystReportFixture } from "./report-fixture";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

describe("AnalystReportRenderer", () => {
  it("renders a valid Analyst Report", () => {
    const { host, root } = renderReport(analystReportFixture);

    expect(host.textContent).toContain("ACH return wave containment");
    expect(host.textContent).toContain("Originator exposure");
    expect(host.textContent).toContain("Northstar Payroll");

    act(() => root.unmount());
    host.remove();
  });

  it("rejects invalid report specs before rendering", () => {
    expect(() =>
      renderReport({
        ...analystReportFixture,
        blocks: [{ type: "metric", metric: { label: "Incomplete" } }],
      }),
    ).toThrow();
  });

  it("renders native chart and specialized block primitives", async () => {
    await loadChartModules();

    const { host, root } = renderReport({
      ...analystReportFixture,
      blocks: [
        {
          type: "grid",
          blocks: [
            chartBlock("barChart"),
            chartBlock("areaChart"),
            chartBlock("donutChart"),
            chartBlock("sparkline"),
          ],
        },
        {
          type: "customerCarousel",
          title: "Customer watchlist",
          customers: [
            { id: "c1", name: "Northstar Payroll", metric: "$4.8M", tone: "warning" },
            { id: "c2", name: "Aster Marketplace", metric: "$2.9M", tone: "critical" },
          ],
        },
        { type: "empty", title: "No gaps", body: "No missing reconciliation windows." },
        { type: "error", title: "Tool warning", body: "A capped sample omitted older rows." },
      ],
    });

    await settleLazyRender();
    await settleLazyRender();

    expect(host.querySelectorAll(".recharts-wrapper").length).toBeGreaterThanOrEqual(4);
    expect(host.textContent).toContain("Customer watchlist");
    expect(host.textContent).toContain("No missing reconciliation windows.");
    expect(host.textContent).toContain("A capped sample omitted older rows.");

    act(() => root.unmount());
    host.remove();
  });

  it("sorts and paginates embedded table rows locally", () => {
    const { host, root } = renderReport({
      ...analystReportFixture,
      blocks: [
        {
          type: "dataTable",
          title: "Sortable rows",
          columns: [
            { key: "name", label: "Name" },
            { key: "count", label: "Count", align: "right" },
          ],
          rows: Array.from({ length: 12 }, (_, index) => ({
            count: 12 - index,
            name: `Customer ${String(index + 1).padStart(2, "0")}`,
          })),
        },
      ],
    });

    expect(host.textContent).toContain("Page 1 of 2");
    expect(host.textContent).toContain("Customer 01");
    expect(host.textContent).not.toContain("Customer 12");

    act(() => {
      buttonByText(host, "Next")?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    expect(host.textContent).toContain("Customer 11");

    act(() => {
      buttonByText(host, "Count")?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    expect(host.textContent).toContain("Customer 12");

    act(() => root.unmount());
    host.remove();
  });
});

function renderReport(report: unknown): { host: HTMLDivElement; root: Root } {
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);

  act(() => {
    root.render(<AnalystReportRenderer report={report} />);
  });

  return { host, root };
}

function chartBlock(type: "barChart" | "areaChart" | "donutChart" | "sparkline") {
  return {
    type,
    title: `${type} block`,
    xKey: "label",
    series: [{ key: "value", label: "Value" }],
    data: [
      { label: "ACH", value: 12 },
      { label: "Wire", value: 8 },
    ],
  };
}

function buttonByText(host: HTMLElement, text: string) {
  return [...host.querySelectorAll("button")].find((button) => button.textContent?.includes(text));
}

async function loadChartModules() {
  await import("recharts");
}

async function settleLazyRender() {
  await act(async () => {
    await Promise.resolve();
  });
}
