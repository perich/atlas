import { useCallback, useRef, useState } from "react";

import type { AnalystReportRunPhase, AnalystReportSpec } from "@bankops/contracts";

import { streamAnalystRun } from "./analyst-run-api";
import {
  applyAnalystRunEvent,
  createAnalystRunTimeline,
  type AnalystRunTimeline,
} from "./analyst-run-timeline";

type AnalystRunState = {
  completedDurationSeconds: number | null;
  error: string | null;
  phase: AnalystReportRunPhase;
  report: AnalystReportSpec | null;
  startedAt: number | null;
  timeline: AnalystRunTimeline;
};

const initialState: AnalystRunState = {
  completedDurationSeconds: null,
  error: null,
  phase: "idle",
  report: null,
  startedAt: null,
  timeline: createAnalystRunTimeline(),
};

export function useAnalystRun() {
  const abortRef = useRef<AbortController | null>(null);
  const [state, setState] = useState<AnalystRunState>(initialState);

  const run = useCallback(async (question: string) => {
    abortRef.current?.abort();
    const abortController = new AbortController();
    abortRef.current = abortController;

    setState({
      completedDurationSeconds: null,
      error: null,
      phase: "generating",
      report: null,
      startedAt: Date.now(),
      timeline: createAnalystRunTimeline("Starting CodeMode run"),
    });

    try {
      const report = await streamAnalystRun({
        onEvent: (event) => {
          if (event.type === "phase") {
            setState((current) => ({
              ...current,
              phase: event.phase,
              timeline: applyAnalystRunEvent(current.timeline, event),
            }));
            return;
          }
          setState((current) => ({
            ...current,
            phase:
              event.type === "validation" && !event.ok
                ? "repairing"
                : event.type === "validation"
                  ? "validating"
                  : current.phase,
            timeline: applyAnalystRunEvent(current.timeline, event),
          }));
        },
        question,
        signal: abortController.signal,
      });

      setState((current) => ({
        completedDurationSeconds:
          current.startedAt === null
            ? null
            : Math.max(0, Math.round((Date.now() - current.startedAt) / 1000)),
        error: null,
        phase: "done",
        report,
        startedAt: current.startedAt,
        timeline: {
          ...current.timeline,
          statusMessage: "Validated report ready",
        },
      }));
    } catch (error) {
      if (abortController.signal.aborted) {
        return;
      }
      setState((current) => ({
        ...current,
        error: error instanceof Error ? error.message : "Analyst run failed",
        phase: "error",
        timeline: {
          ...current.timeline,
          statusMessage: "Run failed",
        },
      }));
    }
  }, []);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setState(initialState);
  }, []);

  return {
    ...state,
    isRunning:
      state.phase === "generating" ||
      state.phase === "querying" ||
      state.phase === "validating" ||
      state.phase === "repairing",
    reset,
    run,
  };
}
