import type { AnalystRunEvent } from "@bankops/contracts";

export type EmitAnalystEvent = (event: AnalystRunEvent) => void;
export type AnalystTraceSource = Extract<AnalystRunEvent, { type: "trace" }>["source"];

const EVENT_LIMITS = {
  progressDetail: 500,
  traceDetail: 1_500,
  label: 160,
} as const;

export function emitAnalystProgress(
  emit: EmitAnalystEvent | undefined,
  label: string,
  detail?: string,
) {
  emit?.({
    at: new Date().toISOString(),
    detail: detail?.slice(0, EVENT_LIMITS.progressDetail),
    label: label.slice(0, EVENT_LIMITS.label),
    type: "progress",
  });
}

export function emitAnalystTrace(
  emit: EmitAnalystEvent | undefined,
  source: AnalystTraceSource,
  label: string,
  detail?: string,
) {
  emit?.({
    at: new Date().toISOString(),
    detail: detail?.slice(0, EVENT_LIMITS.traceDetail),
    label: label.slice(0, EVENT_LIMITS.label),
    source,
    type: "trace",
  });
}
