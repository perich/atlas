import { afterEach, describe, expect, it, vi } from "vitest";

import { analystReportFixture } from "./report-fixture";
import { streamAnalystRun } from "./analyst-run-api";

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
  vi.restoreAllMocks();
});

describe("streamAnalystRun", () => {
  it("returns the final validated report from SSE", async () => {
    globalThis.fetch = vi.fn(
      async () =>
        new Response(
          sse([
            { type: "phase", phase: "generating" },
            { type: "validation", ok: true, attempt: 1 },
            { type: "report", report: analystReportFixture },
            { type: "phase", phase: "done" },
          ]),
          { headers: { "content-type": "text/event-stream" } },
        ),
    );

    const events: string[] = [];
    const report = await streamAnalystRun({
      onEvent: (event) => events.push(event.type),
      question: "What is risky?",
      signal: new AbortController().signal,
    });

    expect(report.title).toBe(analystReportFixture.title);
    expect(events).toEqual(["phase", "validation", "report", "phase"]);
  });

  it("throws plain server errors", async () => {
    globalThis.fetch = vi.fn(
      async () =>
        new Response(sse([{ type: "error", message: "Model unavailable" }]), {
          headers: { "content-type": "text/event-stream" },
        }),
    );

    await expect(
      streamAnalystRun({
        onEvent: () => {},
        question: "What is risky?",
        signal: new AbortController().signal,
      }),
    ).rejects.toThrow("Model unavailable");
  });
});

function sse(events: unknown[]) {
  return events.map((event) => `event: message\ndata: ${JSON.stringify(event)}\n\n`).join("");
}
