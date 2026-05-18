import { useCallback, useRef, useState } from "react";

import type { AnalystReportRunPhase, AnalystReportSpec } from "@bankops/contracts";

import { streamAnalystRun } from "./analyst-run-api";

type AnalystRunState = {
  error: string | null;
  phase: AnalystReportRunPhase;
  report: AnalystReportSpec | null;
  statusMessage: string | null;
};

const initialState: AnalystRunState = {
  error: null,
  phase: "idle",
  report: null,
  statusMessage: null,
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
        report: current.report,
        statusMessage: "Starting CodeMode run",
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
            if (event.type === "validation") {
              setState((current) => ({
                ...current,
                phase: event.ok ? "validating" : "repairing",
                statusMessage: event.ok ? "Report validated" : "Repairing report shape",
              }));
            }
          },
          previousReport: state.report ?? undefined,
          question,
          signal: abortController.signal,
        });

        setState({
          error: null,
          phase: "done",
          report,
          statusMessage: "Validated report ready",
        });
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
