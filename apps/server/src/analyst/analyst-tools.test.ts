import { describe, expect, it } from "vitest";

import { createAnalystToolCatalog } from "./analyst-tool-catalog.js";
import { createAnalystDataTools } from "./analyst-tools.js";

describe("Analyst CodeMode tool input validation", () => {
  it("rejects unsupported time-series metrics inside the server handler", async () => {
    const timeSeries = analystTool("get_time_series");

    expect(() => timeSeries.execute({ grain: "hour", metric: "amount" })).toThrow();
  });

  it("rejects unsupported audit sample sort values inside the server handler", async () => {
    const sample = analystTool("get_audit_sample");

    expect(() => sample.execute({ limit: 60, sort: "ts_desc" })).toThrow();
  });
});

describe("Analyst tool catalog", () => {
  it("documents table-safe audit sample details", () => {
    expect(catalogTool("get_audit_sample").description).toContain(
      "detail and detailSummary are safe string summaries",
    );
  });

  it("documents numeric customer risk aliases for report prioritization", () => {
    expect(catalogTool("get_customer_risk_rollup").description).toContain(
      "risk and riskScore numeric aliases",
    );
  });
});

function analystTool(name: string): { execute: (input: unknown) => unknown } {
  const found = createAnalystDataTools().find((tool) => tool.name === name);

  if (!found || typeof found.execute !== "function") {
    throw new Error(`Missing executable analyst tool: ${name}`);
  }

  return { execute: found.execute };
}

function catalogTool(name: string) {
  const found = createAnalystToolCatalog().find((tool) => tool.name === name);

  if (found === undefined) {
    throw new Error(`Missing analyst catalog tool: ${name}`);
  }

  return found;
}
