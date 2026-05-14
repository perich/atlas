const usdCompact = new Intl.NumberFormat("en-US", {
  currency: "USD",
  maximumFractionDigits: 1,
  notation: "compact",
  style: "currency",
});

export function formatMinorUsd(value: number) {
  return usdCompact.format(value / 100);
}

export function formatMinorUsdString(value: string) {
  return formatMinorUsd(Number.parseFloat(value));
}

export function formatCount(value: number) {
  return Math.round(value).toLocaleString("en-US");
}

export function formatMilliseconds(value: number) {
  return `${Math.round(value).toLocaleString("en-US")}ms`;
}

export function formatSecondsFromMs(value: number) {
  return `${(value / 1_000).toFixed(1)}s`;
}

export function formatPercent(value: number) {
  return `${Math.round(value * 100)}%`;
}
