export const TIME_RANGES = [
  { label: "All time", value: "all", durationMs: undefined },
  { label: "Newest 15m", value: "15m", durationMs: 15 * 60_000 },
  { label: "Newest 1h", value: "1h", durationMs: 60 * 60_000 },
  { label: "Newest 4h", value: "4h", durationMs: 4 * 60 * 60_000 },
] as const;

export type TimeRangeValue = (typeof TIME_RANGES)[number]["value"];

export function timeRangeValue(
  tsFrom: number | undefined,
  newestTs: number | undefined,
): TimeRangeValue {
  if (tsFrom === undefined || newestTs === undefined) {
    return "all";
  }

  const durationMs = newestTs - tsFrom;
  const range = TIME_RANGES.find((item) => item.durationMs === durationMs);

  return range?.value ?? "all";
}
