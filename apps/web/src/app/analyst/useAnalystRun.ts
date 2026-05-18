import { useCallback, useRef, useState } from "react";

import type { AnalystReportRunPhase, AnalystReportSpec, AnalystRunEvent } from "@bankops/contracts";

import { streamAnalystRun } from "./analyst-run-api";

export type AnalystProgressEvent = Extract<AnalystRunEvent, { type: "progress" }>;
export type AnalystTraceEvent = Extract<AnalystRunEvent, { type: "trace" }>;

type AnalystRunState = {
  error: string | null;
  phase: AnalystReportRunPhase;
  progressEvents: AnalystProgressEvent[];
  report: AnalystReportSpec | null;
  startedAt: number | null;
  statusMessage: string | null;
  traceEvents: AnalystTraceEvent[];
  validationAttempts: number;
};

const initialState: AnalystRunState = {
  error: null,
  phase: "idle",
  progressEvents: [],
  report: null,
  startedAt: null,
  statusMessage: null,
  traceEvents: [],
  validationAttempts: 0,
};

export function useAnalystRun() {
  const abortRef = useRef<AbortController | null>(null);
  const [state, setState] = useState<AnalystRunState>(initialState);

  const run = useCallback(
    async (question: string) => {
      abortRef.current?.abort();
      const abortController = new AbortController();
      abortRef.current = abortController;

      setState((current) => ({
        error: null,
        phase: "generating",
        progressEvents: [],
        report: current.report,
        startedAt: Date.now(),
        statusMessage: "Starting CodeMode run",
        traceEvents: [],
        validationAttempts: 0,
      }));

      try {
        const report = await streamAnalystRun({
          onEvent: (event) => {
            if (event.type === "phase") {
              setState((current) => ({
                ...current,
                phase: event.phase,
                statusMessage: event.message ?? statusCopy(event.phase),
              }));
            }
            if (event.type === "progress") {
              setState((current) => ({
                ...current,
                progressEvents: [...current.progressEvents, event].slice(-24),
                statusMessage: event.label,
              }));
            }
            if (event.type === "trace") {
              setState((current) => ({
                ...current,
                traceEvents: [...current.traceEvents, event].slice(-80),
              }));
            }
            if (event.type === "validation") {
              setState((current) => ({
                ...current,
                phase: event.ok ? "validating" : "repairing",
                statusMessage: event.ok ? "Report validated" : "Repairing report shape",
                validationAttempts: Math.max(current.validationAttempts, event.attempt),
              }));
            }
          },
          previousReport: state.report ?? undefined,
          question,
          signal: abortController.signal,
        });

        setState((current) => ({
          error: null,
          phase: "done",
          progressEvents: current.progressEvents,
          report,
          startedAt: current.startedAt,
          statusMessage: "Validated report ready",
          traceEvents: current.traceEvents,
          validationAttempts: current.validationAttempts,
        }));
      } catch (error) {
        if (abortController.signal.aborted) {
          return;
        }
        setState((current) => ({
          ...current,
          error: error instanceof Error ? error.message : "Analyst run failed",
          phase: "error",
          statusMessage: "Run failed",
        }));
      }
    },
    [state.report],
  );

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

function statusCopy(phase: AnalystReportRunPhase) {
  if (phase === "querying") {
    return "Querying analyst tools";
  }
  if (phase === "validating") {
    return "Validating report";
  }
  if (phase === "repairing") {
    return "Repairing report";
  }
  if (phase === "done") {
    return "Done";
  }
  if (phase === "error") {
    return "Error";
  }
  return "Generating report";
}
