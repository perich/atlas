import { describe, expect, it } from "vitest";

import {
  applyAnalystRunEvent,
  createAnalystRunTimeline,
  projectAnalystRunTimeline,
  type AnalystProgressEvent,
} from "./analyst-run-timeline";

describe("analyst run timeline", () => {
  it("keeps the current execution fact out of the historical facts", () => {
    const first = progress("Starting CodeMode run");
    const second = progress("Planning bounded analyst queries");
    const third = progress("Loaded dataset overview");

    const view = projectAnalystRunTimeline({
      ...createAnalystRunTimeline(),
      progressEvents: [first, second, third],
    });

    expect(view.currentFact).toBe(third);
    expect(view.observableFacts).toEqual([second, first]);
  });

  it("projects status, validation attempts, and raw trace from streamed events", () => {
    const timeline = [
      { type: "phase" as const, phase: "generating" as const },
      progress("Loaded rail health rollup"),
      {
        at: "2026-05-18T18:00:01.000Z",
        detail: "6 rails",
        label: "get_rail_health_rollup result",
        source: "tool" as const,
        type: "trace" as const,
      },
      { attempt: 2, ok: false, type: "validation" as const },
    ].reduce(applyAnalystRunEvent, createAnalystRunTimeline());
    const view = projectAnalystRunTimeline(timeline);

    expect(view.statusMessage).toBe("Repairing report shape");
    expect(view.validationAttempts).toBe(2);
    expect(view.rawTrace).toHaveLength(1);
  });

  it("does not duplicate progress labels into the top-level status", () => {
    const timeline = [
      { type: "phase" as const, phase: "generating" as const },
      progress("Planning bounded analyst queries"),
    ].reduce(applyAnalystRunEvent, createAnalystRunTimeline());
    const view = projectAnalystRunTimeline(timeline);

    expect(view.currentFact?.label).toBe("Planning bounded analyst queries");
    expect(view.statusMessage).toBe("Generating report");
  });
});

function progress(label: string): AnalystProgressEvent {
  return {
    at: "2026-05-18T18:00:00.000Z",
    label,
    type: "progress",
  };
}
