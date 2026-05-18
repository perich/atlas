import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";

import { analystReportFixture } from "../analyst/report-fixture";
import { AnalystRoute } from "./AnalystRoute";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
  vi.restoreAllMocks();
  document.body.innerHTML = "";
});

describe("AnalystRoute", () => {
  it("renders the empty analyst workspace", () => {
    const { host, root } = renderRoute();

    expect(host.textContent).toContain("No active report");
    expect(host.textContent).toContain("Idle");

    act(() => root.unmount());
  });

  it("shows loading state while the run is active", async () => {
    globalThis.fetch = vi.fn(
      () =>
        new Promise<Response>(() => {
          // Keep the request pending so the loading state remains visible.
        }),
    );
    const { host, root } = renderRoute();

    await submit(host);

    expect(host.textContent).toContain("Generating Analyst Report");
    expect(host.querySelector("button[type='submit']")?.getAttribute("disabled")).toBe("");

    act(() => root.unmount());
  });

  it("renders the final report on success", async () => {
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
    const { host, root } = renderRoute();

    await submit(host);
    await settle();

    expect(host.textContent).toContain("Validated report ready");
    expect(host.textContent).toContain("ACH return wave containment");

    act(() => root.unmount());
  });

  it("renders plain run errors", async () => {
    globalThis.fetch = vi.fn(
      async () =>
        new Response(sse([{ type: "error", message: "Model unavailable" }]), {
          headers: { "content-type": "text/event-stream" },
        }),
    );
    const { host, root } = renderRoute();

    await submit(host);
    await settle();

    expect(host.textContent).toContain("Run failed");
    expect(host.textContent).toContain("Model unavailable");

    act(() => root.unmount());
  });

  it("sends the active report for follow-up replacement", async () => {
    const replacementReport = {
      ...analystReportFixture,
      question: "Show only customer risk",
      summary: "Customer risk replacement report.",
      title: "Customer Risk Replacement",
    };
    const requests: unknown[] = [];

    globalThis.fetch = vi.fn(async (_url, init) => {
      requests.push(JSON.parse(String(init?.body)));
      const report = requests.length === 1 ? analystReportFixture : replacementReport;
      return new Response(
        sse([
          { type: "phase", phase: "generating" },
          { type: "validation", ok: true, attempt: 1 },
          { type: "report", report },
          { type: "phase", phase: "done" },
        ]),
        { headers: { "content-type": "text/event-stream" } },
      );
    });
    const { host, root } = renderRoute();

    await submit(host);
    await settle();
    await editQuestion(host, "Show only customer risk");
    await submit(host);
    await settle();

    expect(JSON.stringify(requests[1])).toContain(analystReportFixture.title);
    expect(host.textContent).toContain("Customer Risk Replacement");

    act(() => root.unmount());
  });

  it("clears report and prompt state for a new analysis", async () => {
    globalThis.fetch = vi.fn(
      async () =>
        new Response(
          sse([
            { type: "validation", ok: true, attempt: 1 },
            { type: "report", report: analystReportFixture },
          ]),
          { headers: { "content-type": "text/event-stream" } },
        ),
    );
    const { host, root } = renderRoute();

    await submit(host);
    await settle();
    await act(async () => {
      buttonByText(host, "New analysis")?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(host.textContent).toContain("No active report");
    expect(host.querySelector("textarea")?.value).toBe("");

    act(() => root.unmount());
  });
});

function renderRoute(): { host: HTMLDivElement; root: Root } {
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);

  act(() => {
    root.render(<AnalystRoute />);
  });

  return { host, root };
}

function buttonByText(host: HTMLElement, text: string) {
  return [...host.querySelectorAll("button")].find((button) => button.textContent?.includes(text));
}

async function submit(host: HTMLElement) {
  await act(async () => {
    host.querySelector("form")?.dispatchEvent(new Event("submit", { bubbles: true }));
  });
}

async function editQuestion(host: HTMLElement, question: string) {
  await act(async () => {
    const textarea = host.querySelector("textarea");
    if (textarea) {
      textarea.value = question;
      textarea.dispatchEvent(new Event("input", { bubbles: true }));
    }
  });
}

async function settle() {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
}

function sse(events: unknown[]) {
  return events.map((event) => `event: message\ndata: ${JSON.stringify(event)}\n\n`).join("");
}
