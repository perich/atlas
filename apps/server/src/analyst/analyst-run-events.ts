import type { AnalystRunEvent } from "@bankops/contracts";

export type EmitAnalystEvent = (event: AnalystRunEvent) => void;
export type AnalystTraceSource = Extract<AnalystRunEvent, { type: "trace" }>["source"];

export function emitAnalystProgress(
  emit: EmitAnalystEvent | undefined,
  label: string,
  detail?: string,
) {
  emit?.({
    at: new Date().toISOString(),
    detail: detail?.slice(0, 500),
    label: label.slice(0, 160),
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
    detail: detail?.slice(0, 1_500),
    label: label.slice(0, 160),
    source,
    type: "trace",
  });
}
