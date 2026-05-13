export const STREAM_RATES = [50, 2_000, 10_000] as const;

export type StreamRate = (typeof STREAM_RATES)[number];

export type HealthResponse = {
  ok: true;
  service: string;
  uptimeSec: number;
};

export type AuditPage<TEntry = unknown> = {
  rows: TEntry[];
  nextCursor?: string;
  prevCursor?: string;
  totalMatched: number;
  queryMs: number;
};

export type AuditFacets = {
  severity: Record<string, number>;
  rail: Record<string, number>;
  status: Record<string, number>;
};
