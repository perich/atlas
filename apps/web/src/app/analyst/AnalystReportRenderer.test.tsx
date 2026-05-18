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
