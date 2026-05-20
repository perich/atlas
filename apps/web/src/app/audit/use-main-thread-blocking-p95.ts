import { useSyncExternalStore } from "react";

const LONG_TASK_SAMPLE_LIMIT = 40;
const longTaskSamples: number[] = [];
const longTaskListeners = new Set<() => void>();
let longTaskObserverStarted = false;

export type MainThreadBlockingP95Snapshot =
  | { status: "pending"; p95: undefined }
  | { status: "unsupported"; p95: undefined }
  | { status: "observing"; p95: undefined }
  | { status: "sampled"; p95: number };

let latestLongTaskSnapshot: MainThreadBlockingP95Snapshot = {
  p95: undefined,
  status: "pending",
};

export function useMainThreadBlockingP95() {
  return useSyncExternalStore(subscribeToLongTasks, readLongTaskP95, readLongTaskP95);
}

function subscribeToLongTasks(listener: () => void) {
  longTaskListeners.add(listener);
  startLongTaskObserver();

  return () => longTaskListeners.delete(listener);
}

function readLongTaskP95() {
  return latestLongTaskSnapshot;
}

function startLongTaskObserver() {
  if (longTaskObserverStarted) {
    return;
  }

  longTaskObserverStarted = true;

  if (
    typeof PerformanceObserver === "undefined" ||
    !PerformanceObserver.supportedEntryTypes.includes("longtask")
  ) {
    updateLongTaskSnapshot({ p95: undefined, status: "unsupported" });
    return;
  }

  updateLongTaskSnapshot({ p95: undefined, status: "observing" });
  new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      longTaskSamples.push(entry.duration);
    }

    if (longTaskSamples.length > LONG_TASK_SAMPLE_LIMIT) {
      longTaskSamples.splice(0, longTaskSamples.length - LONG_TASK_SAMPLE_LIMIT);
    }

    updateLongTaskSnapshot({ p95: percentile(longTaskSamples, 0.95), status: "sampled" });
  }).observe({ entryTypes: ["longtask"] });
}

function updateLongTaskSnapshot(snapshot: MainThreadBlockingP95Snapshot) {
  latestLongTaskSnapshot = snapshot;
  longTaskListeners.forEach((listener) => listener());
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
