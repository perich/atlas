import { describe, expect, it } from "vitest";

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

function analystTool(name: string): { execute: (input: unknown) => unknown } {
  const found = createAnalystDataTools().find((tool) => tool.name === name);

  if (!found || typeof found.execute !== "function") {
    throw new Error(`Missing executable analyst tool: ${name}`);
  }

  return { execute: found.execute };
}
