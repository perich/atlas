import type { JsonAuditEntry, JsonAuditPage } from "./audit-api";

export type AuditVisibleRange = {
  start: number;
  end: number;
};

export type AuditWindow = {
  start: number;
  rows: JsonAuditEntry[];
  prevCursor?: string;
  nextCursor?: string;
};

export type AuditWindowCache = {
  windows: AuditWindow[];
  totalMatched: number;
  queryMs: number;
};

export type AuditWindowRequest =
  | { direction: "initial" }
  | { direction: "after"; cursor: string }
  | { direction: "before"; cursor: string };

export const AUDIT_PAGE_SIZE = 100;
export const AUDIT_MAX_WINDOWS = 5;
export const EMPTY_AUDIT_WINDOW_CACHE = {
  windows: [],
  totalMatched: 0,
  queryMs: 0,
} as AuditWindowCache;

const PREFETCH_DISTANCE = 30;

export function mergeAuditWindow(
  cache: AuditWindowCache,
  request: AuditWindowRequest,
  page: JsonAuditPage,
): AuditWindowCache {
  const last = cache.windows.at(-1);
  let start = 0;

  if (request.direction === "before") {
    start = Math.max(0, cache.windows[0].start - page.rows.length);
  } else if (last !== undefined) {
    start = last.start + last.rows.length;
  }

  const window = {
    rows: page.rows,
    start,
    prevCursor: page.prevCursor,
    nextCursor: page.nextCursor,
  } satisfies AuditWindow;
  let windows =
    request.direction === "before" ? [window, ...cache.windows] : [...cache.windows, window];

  if (windows.length > AUDIT_MAX_WINDOWS) {
    if (request.direction === "before") {
      windows = windows.slice(0, AUDIT_MAX_WINDOWS);
    } else {
      windows = windows.slice(-AUDIT_MAX_WINDOWS);
    }
  }

  return {
    windows,
    totalMatched: page.totalMatched,
    queryMs: page.queryMs,
  };
}

export function nextAuditWindowRequest(
  cache: AuditWindowCache,
  visibleRange: AuditVisibleRange,
): AuditWindowRequest | undefined {
  const first = cache.windows[0];
  const last = cache.windows.at(-1);

  if (first === undefined || last === undefined) {
    return { direction: "initial" };
  }

  if (visibleRange.start <= first.start + PREFETCH_DISTANCE && first.prevCursor !== undefined) {
    return { direction: "before", cursor: first.prevCursor };
  }

  if (
    visibleRange.end >= last.start + last.rows.length - PREFETCH_DISTANCE &&
    last.nextCursor !== undefined
  ) {
    return { direction: "after", cursor: last.nextCursor };
  }

  return undefined;
}
