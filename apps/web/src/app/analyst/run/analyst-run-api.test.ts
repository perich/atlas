import { afterEach, describe, expect, it, vi } from "vitest";

import { streamAnalystRun } from "./analyst-run-api";
import { analystReportFixture } from "../report/report-fixture";

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

  it("parses events split across stream chunks", async () => {
    const payload = sse([
      { type: "phase", phase: "generating" },
      { type: "report", report: analystReportFixture },
    ]);
    globalThis.fetch = vi.fn(
      async () =>
        new Response(chunkedStream([payload.slice(0, 24), payload.slice(24)]), {
          headers: { "content-type": "text/event-stream" },
        }),
    );

    const events: string[] = [];
    const report = await streamAnalystRun({
      onEvent: (event) => events.push(event.type),
      question: "What is risky?",
      signal: new AbortController().signal,
    });

    expect(report.title).toBe(analystReportFixture.title);
    expect(events).toEqual(["phase", "report"]);
  });

  it("parses the final event without a trailing blank line", async () => {
    const payload = `event: message\ndata: ${JSON.stringify({
      report: analystReportFixture,
      type: "report",
    })}`;
    globalThis.fetch = vi.fn(
      async () =>
        new Response(payload, {
          headers: { "content-type": "text/event-stream" },
        }),
    );

    const events: string[] = [];
    const report = await streamAnalystRun({
      onEvent: (event) => events.push(event.type),
      question: "What is risky?",
      signal: new AbortController().signal,
    });

    expect(report.title).toBe(analystReportFixture.title);
    expect(events).toEqual(["report"]);
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

function chunkedStream(chunks: string[]) {
  const encoder = new TextEncoder();

  return new ReadableStream({
    start(controller) {
      for (const chunk of chunks) {
        controller.enqueue(encoder.encode(chunk));
      }
      controller.close();
    },
  });
}
