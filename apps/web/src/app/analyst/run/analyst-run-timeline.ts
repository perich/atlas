import type { AnalystReportRunPhase, AnalystRunEvent } from "@bankops/contracts";

export type AnalystProgressEvent = Extract<AnalystRunEvent, { type: "progress" }>;
export type AnalystTraceEvent = Extract<AnalystRunEvent, { type: "trace" }>;

export type AnalystRunTimeline = {
  progressEvents: AnalystProgressEvent[];
  statusMessage: string | null;
  traceEvents: AnalystTraceEvent[];
  validationAttempts: number;
};

const DEFAULT_FACT_LIMIT = 9;
const DEFAULT_TRACE_LIMIT = 5;
const ACTIVE_ANALYST_RUN_PHASES = new Set<AnalystReportRunPhase>([
  "generating",
  "querying",
  "validating",
  "repairing",
]);

export function createAnalystRunTimeline(statusMessage: string | null = null): AnalystRunTimeline {
  return {
    progressEvents: [],
    statusMessage,
    traceEvents: [],
    validationAttempts: 0,
  };
}

export function applyAnalystRunEvent(
  timeline: AnalystRunTimeline,
  event: AnalystRunEvent,
): AnalystRunTimeline {
  if (event.type === "phase") {
    return {
      ...timeline,
      statusMessage: event.message ?? analystRunPhaseStatusCopy(event.phase),
    };
  }

  if (event.type === "progress") {
    return {
      ...timeline,
      progressEvents: [...timeline.progressEvents, event].slice(-24),
    };
  }

  if (event.type === "trace") {
    return {
      ...timeline,
      traceEvents: [...timeline.traceEvents, event].slice(-80),
    };
  }

  if (event.type === "validation") {
    return {
      ...timeline,
      statusMessage: event.ok ? "Report validated" : "Repairing report shape",
      validationAttempts: Math.max(timeline.validationAttempts, event.attempt),
    };
  }

  return timeline;
}

export function projectAnalystRunTimeline(timeline: AnalystRunTimeline) {
  const currentFact = timeline.progressEvents.at(-1) ?? null;

  return {
    currentFact,
    observableFacts: timeline.progressEvents.slice(0, -1).slice(-DEFAULT_FACT_LIMIT).reverse(),
    rawTrace: timeline.traceEvents.slice(-DEFAULT_TRACE_LIMIT).reverse(),
    statusMessage: timeline.statusMessage,
    validationAttempts: timeline.validationAttempts,
  };
}

export function isAnalystRunPhaseActive(phase: AnalystReportRunPhase) {
  return ACTIVE_ANALYST_RUN_PHASES.has(phase);
}

export function analystRunPhaseStatusCopy(phase: AnalystReportRunPhase) {
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
