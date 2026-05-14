import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { OpsRoute } from "../routes/OpsRoute";
import {
  INITIAL_OPS_STREAM_SNAPSHOT,
  type OpsStreamSnapshot,
  type OpsWorkerCommand,
  type OpsWorkerMessage,
} from "./ops-stream-messages";
import { createOpsStreamStore } from "./ops-stream-store";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

class MockWorker {
  static instances: MockWorker[] = [];

  commands: OpsWorkerCommand[] = [];
  onmessage: ((event: { data: OpsWorkerMessage }) => void) | null = null;
  terminated = false;

  constructor() {
    MockWorker.instances.push(this);
  }

  postMessage(command: OpsWorkerCommand) {
    this.commands.push(command);
  }

  terminate() {
    this.terminated = true;
  }

  emit(message: OpsWorkerMessage) {
    this.onmessage?.({ data: message });
  }
}

describe("ops stream store", () => {
  beforeEach(() => {
    MockWorker.instances = [];
    vi.useFakeTimers();
    vi.stubGlobal("Worker", MockWorker);
    vi.stubGlobal("OffscreenCanvas", function MockOffscreenCanvas() {});
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("starts the worker and publishes compact snapshots", () => {
    const store = createOpsStreamStore(() => new Worker("mock"));
    const listener = vi.fn();
    const unsubscribe = store.subscribe(listener);
    const worker = latestWorker();

    expect(worker.commands).toEqual([{ type: "connect" }]);

    worker.emit({
      snapshot: { ...INITIAL_OPS_STREAM_SNAPSHOT, connectionStatus: "open", seq: "42" },
      type: "snapshot",
    });

    expect(listener).toHaveBeenCalledOnce();
    expect(store.getSnapshot().seq).toBe("42");

    store.setStreamRate(10_000);

    expect(store.getSnapshot().streamRate).toBe(10_000);
    expect(worker.commands).toContainEqual({ type: "stream.rate.set", targetRate: 10_000 });

    unsubscribe();

    vi.advanceTimersByTime(100);

    expect(worker.commands).toContainEqual({ type: "disconnect" });
    expect(worker.terminated).toBe(true);
  });

  it("transfers the tape canvas to the worker", () => {
    const store = createOpsStreamStore(() => new Worker("mock"));
    const unsubscribe = store.subscribe(vi.fn());
    const worker = latestWorker();
    const canvas = new OffscreenCanvas(1, 1);
    const layout = { dpr: 2, height: 236, width: 1_100 };

    store.attachTapeCanvas(canvas, layout);

    expect(worker.commands).toContainEqual({ type: "canvas.attach", canvas, layout });

    unsubscribe();
    vi.advanceTimersByTime(100);
  });

  it("keeps a transferred tape canvas until the worker starts", () => {
    const store = createOpsStreamStore(() => new Worker("mock"));
    const canvas = new OffscreenCanvas(1, 1);
    const layout = { dpr: 2, height: 236, width: 1_100 };

    store.attachTapeCanvas(canvas, layout);

    const unsubscribe = store.subscribe(vi.fn());
    const worker = latestWorker();

    expect(worker.commands).toContainEqual({ type: "canvas.attach", canvas, layout });

    unsubscribe();
    vi.advanceTimersByTime(100);
  });
});

describe("OpsRoute", () => {
  let root: Root | undefined;
  let host: HTMLDivElement | undefined;

  beforeEach(() => {
    MockWorker.instances = [];
    vi.useFakeTimers();
    vi.stubGlobal("Worker", MockWorker);
    vi.stubGlobal("OffscreenCanvas", function MockOffscreenCanvas() {});
    Object.defineProperty(HTMLCanvasElement.prototype, "transferControlToOffscreen", {
      configurable: true,
      value: vi.fn(() => new OffscreenCanvas(1, 1)),
    });
    host = document.createElement("div");
    document.body.append(host);
    root = createRoot(host);
  });

  afterEach(() => {
    act(() => root?.unmount());
    vi.advanceTimersByTime(100);
    host?.remove();
    delete (HTMLCanvasElement.prototype as { transferControlToOffscreen?: unknown })
      .transferControlToOffscreen;
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("renders worker snapshots and sends stream-rate commands", () => {
    act(() => root?.render(<OpsRoute />));

    const worker = latestWorker();

    expect(worker.commands).toContainEqual({ type: "connect" });

    act(() => {
      worker.emit({
        snapshot: opsSnapshot({
          connectionStatus: "open",
          eventRate: 2_000,
          seq: "84",
        }),
        type: "snapshot",
      });
    });

    expect(host?.textContent).toContain("Open");
    expect(host?.textContent).toContain("Sequence");
    expect(host?.textContent).toContain("seq 84");
    expect(host?.textContent).toContain("2,000/s");
    expect(host?.textContent).toContain("$8.1B");

    const stressButton = findButton("10k/s");

    act(() => {
      stressButton.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(worker.commands).toContainEqual({ type: "stream.rate.set", targetRate: 10_000 });
  });

  it("renders reconnecting and degraded stream states", () => {
    act(() => root?.render(<OpsRoute />));

    const worker = latestWorker();

    act(() => {
      worker.emit({
        snapshot: opsSnapshot({
          connectionStatus: "reconnecting",
          renderer: { ...INITIAL_OPS_STREAM_SNAPSHOT.renderer, fps: 60 },
        }),
        type: "snapshot",
      });
    });

    expect(host?.textContent).toContain("Reconnecting");
    expect(host?.textContent).toContain("Watch");

    act(() => {
      worker.emit({
        snapshot: opsSnapshot({
          connectionStatus: "degraded",
          renderer: { ...INITIAL_OPS_STREAM_SNAPSHOT.renderer, fps: 20, frameCostMs: 24 },
        }),
        type: "snapshot",
      });
    });

    expect(host?.textContent).toContain("Backend unavailable");
    expect(host?.textContent).toContain("Strained");
  });
});

function latestWorker() {
  const worker = MockWorker.instances.at(-1);

  if (worker === undefined) {
    throw new Error("Expected mock worker");
  }

  return worker;
}

function findButton(text: string) {
  const button = [...document.querySelectorAll("button")].find(
    (element) => element.textContent === text,
  );

  if (button === undefined) {
    throw new Error(`Expected ${text} button`);
  }

  return button;
}

function opsSnapshot(overrides: Partial<OpsStreamSnapshot>): OpsStreamSnapshot {
  return {
    ...INITIAL_OPS_STREAM_SNAPSHOT,
    eventRate: 2_000,
    cumulativeCreditsMinor: "812400000000",
    cumulativeDebitsMinor: "621100000000",
    liquidityReserveMinor: "250000000000",
    exceptionQueueDepth: 12,
    chart: [
      {
        creditMinor: "100000000",
        debitMinor: "90000000",
        eventCount: 20,
        eventRate: 1_200,
        exceptionQueueDepth: 8,
        failureRate: 0.01,
        latencyP95Ms: 140,
        liquidityReserveMinor: "250000000000",
        ts: 1,
      },
      {
        creditMinor: "200000000",
        debitMinor: "160000000",
        eventCount: 40,
        eventRate: 2_000,
        exceptionQueueDepth: 12,
        failureRate: 0.02,
        latencyP95Ms: 220,
        liquidityReserveMinor: "249000000000",
        ts: 2,
      },
    ],
    railHealth: [
      {
        averageLatencyMs: 180,
        eventCount: 500,
        eventsPerSec: 900,
        failureRate: 0.01,
        heldCount: 2,
        lastEventTs: 2,
        p95LatencyMs: 420,
        pendingCount: 4,
        rail: "ach",
        status: "nominal",
      },
      {
        averageLatencyMs: 900,
        eventCount: 200,
        eventsPerSec: 320,
        failureRate: 0.03,
        heldCount: 4,
        lastEventTs: 2,
        p95LatencyMs: 2_600,
        pendingCount: 12,
        rail: "wire",
        status: "degraded",
      },
    ],
    renderer: {
      backlog: 0,
      decodedRate: 2_000,
      fps: 60,
      frameCostMs: 4,
      renderedRowRate: 2_000,
      sequenceLag: 0,
      supported: true,
    },
    ...overrides,
  };
}
