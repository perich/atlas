import { ANALYST_REPORT_VERSION, type AnalystRunEvent } from "@bankops/contracts";
import { describe, expect, it } from "vitest";

import {
  analystModelOptions,
  reasoningTraceDetail,
  runAnalystReportAttempts,
} from "./analyst-runner.js";

describe("Analyst OpenRouter model options", () => {
  it("enables explicit high-effort reasoning", () => {
    expect(analystModelOptions()).toEqual({
      reasoning: { effort: "high" },
    });
  });
});

describe("Analyst reasoning traces", () => {
  it("extracts reasoning deltas as raw model trace details", () => {
    expect(
      reasoningTraceDetail({ type: "REASONING_MESSAGE_CONTENT", delta: " planning tools " }),
    ).toBe("planning tools");
    expect(
      reasoningTraceDetail({ type: "TEXT_MESSAGE_CONTENT", delta: "visible answer" }),
    ).toBeUndefined();
  });
});

describe("Analyst CodeMode repair loop", () => {
  it("captures the first valid submitted report", async () => {
    const events: AnalystRunEvent[] = [];
    const report = await runAnalystReportAttempts({
      emit: (event) => events.push(event),
      runAttempt: async () => validReport(),
    });

    expect(report.title).toBe("ACH review");
    expect(events.map((event) => event.type)).toContain("report");
    expect(events).toContainEqual({ attempt: 1, ok: true, type: "validation" });
  });

  it("stops after three repair retries", async () => {
    const attempts: number[] = [];
    const events: AnalystRunEvent[] = [];

    await expect(
      runAnalystReportAttempts({
        emit: (event) => events.push(event),
        runAttempt: async ({ attempt }) => {
          attempts.push(attempt);
          return { title: "missing required fields" };
        },
      }),
    ).rejects.toThrow();

    expect(attempts).toEqual([1, 2, 3, 4]);
    expect(events.filter((event) => event.type === "validation" && !event.ok)).toHaveLength(4);
    expect(
      events
        .filter((event) => event.type === "phase")
        .map((event) => event.phase)
        .filter((phase) => phase !== "validating"),
    ).toEqual(["generating", "repairing", "repairing", "repairing"]);
  });
});

function validReport() {
  return {
    version: ANALYST_REPORT_VERSION,
    title: "ACH review",
    generatedAt: "2026-05-18T18:30:00.000Z",
    question: "Where are ACH returns elevated?",
    summary: "ACH return pressure is elevated in payroll cohorts.",
    blocks: [
      {
        type: "summary",
        items: ["Return pressure is concentrated.", "Liquidity remains stable."],
      },
    ],
  };
}
