import { useSyncExternalStore } from "react";

const LONG_TASK_SAMPLE_LIMIT = 40;
const longTaskSamples: number[] = [];
const longTaskListeners = new Set<() => void>();
let longTaskObserverStarted = false;
let latestLongTaskP95: number | undefined;

export function useMainThreadBlockingP95() {
  return useSyncExternalStore(subscribeToLongTasks, readLongTaskP95, readLongTaskP95);
}

function subscribeToLongTasks(listener: () => void) {
  longTaskListeners.add(listener);
  startLongTaskObserver();

  return () => longTaskListeners.delete(listener);
}

function readLongTaskP95() {
  return latestLongTaskP95;
}

function startLongTaskObserver() {
  if (
    longTaskObserverStarted ||
    typeof PerformanceObserver === "undefined" ||
    !PerformanceObserver.supportedEntryTypes.includes("longtask")
  ) {
    return;
  }

  longTaskObserverStarted = true;
  new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      longTaskSamples.push(entry.duration);
    }

    if (longTaskSamples.length > LONG_TASK_SAMPLE_LIMIT) {
      longTaskSamples.splice(0, longTaskSamples.length - LONG_TASK_SAMPLE_LIMIT);
    }

    latestLongTaskP95 = percentile(longTaskSamples, 0.95);
    longTaskListeners.forEach((listener) => listener());
  }).observe({ entryTypes: ["longtask"] });
}

function percentile(values: number[], point: number) {
  if (values.length === 0) {
    return 0;
  }

  const sorted = values.slice();
  sorted.sort((left, right) => left - right);
  const index = Math.min(sorted.length - 1, Math.floor((sorted.length - 1) * point));

  return sorted[index];
}
