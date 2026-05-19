import type { Truncation } from "./types.js";

export const DEFAULT_ROLLUP_LIMIT = 20;
export const MAX_ROLLUP_LIMIT = 80;

export function capped<T>(rows: T[], requestedLimit: number) {
  const limit = Math.min(requestedLimit, MAX_ROLLUP_LIMIT);

  return {
    rows: rows.slice(0, limit),
    truncation: {
      limit,
      total: rows.length,
      truncated: rows.length > limit,
    } satisfies Truncation,
  };
}
