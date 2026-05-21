import React, { useContext, useEffect, useMemo, useState, useSyncExternalStore } from "react";

import type { AnalystReportRunPhase, AnalystReportSpec } from "@bankops/contracts";

import { streamAnalystRun } from "./analyst-run-api";
import {
  applyAnalystRunEvent,
  createAnalystRunTimeline,
  type AnalystRunTimeline,
} from "./analyst-run-timeline";

export type AnalystRunSnapshot = {
  completedDurationSeconds: number | null;
  error: string | null;
  phase: AnalystReportRunPhase;
  report: AnalystReportSpec | null;
  startedAt: number | null;
  timeline: AnalystRunTimeline;
};

type AnalystRunStore = {
  dispose: () => void;
  getSnapshot: () => AnalystRunSnapshot;
  reset: () => void;
  run: (question: string) => Promise<void>;
  subscribe: (listener: () => void) => () => void;
};

const AnalystRunStoreContext = React.createContext<AnalystRunStore | null>(null);

function createInitialSnapshot(): AnalystRunSnapshot {
  return {
    completedDurationSeconds: null,
    error: null,
    phase: "idle",
    report: null,
    startedAt: null,
    timeline: createAnalystRunTimeline(),
  };
}

function createAnalystRunStore(): AnalystRunStore {
  let abortController: AbortController | null = null;
  let snapshot = createInitialSnapshot();
  const listeners = new Set<() => void>();

  function emit(
    update: AnalystRunSnapshot | ((current: AnalystRunSnapshot) => AnalystRunSnapshot),
  ) {
    snapshot = typeof update === "function" ? update(snapshot) : update;

    for (const listener of listeners) {
      listener();
    }
  }

  async function run(question: string) {
    abortController?.abort();
    const nextAbortController = new AbortController();
    abortController = nextAbortController;

    emit({
      completedDurationSeconds: null,
      error: null,
      phase: "generating",
      report: null,
      startedAt: Date.now(),
      timeline: createAnalystRunTimeline(),
    });

    try {
      const report = await streamAnalystRun({
        onEvent: (event) => {
          if (event.type === "phase") {
            emit((current) => ({
              ...current,
              phase: event.phase,
              timeline: applyAnalystRunEvent(current.timeline, event),
            }));
            return;
          }
          emit((current) => ({
            ...current,
            phase:
              event.type === "validation" && !event.ok
                ? "repairing"
                : event.type === "validation"
                  ? "validating"
                  : current.phase,
            timeline: applyAnalystRunEvent(current.timeline, event),
          }));
        },
        question,
        signal: nextAbortController.signal,
      });

      emit((current) => ({
        completedDurationSeconds:
          current.startedAt === null
            ? null
            : Math.max(0, Math.round((Date.now() - current.startedAt) / 1000)),
        error: null,
        phase: "done",
        report,
        startedAt: current.startedAt,
        timeline: {
          ...current.timeline,
          statusMessage: "Validated report ready",
        },
      }));
    } catch (error) {
      if (nextAbortController.signal.aborted) {
        return;
      }
      emit((current) => ({
        ...current,
        error: error instanceof Error ? error.message : "Analyst run failed",
        phase: "error",
        timeline: {
          ...current.timeline,
          statusMessage: "Run failed",
        },
      }));
    }
  }

  function reset() {
    abortController?.abort();
    abortController = null;
    emit(createInitialSnapshot());
  }

  return {
    dispose: () => {
      abortController?.abort();
      listeners.clear();
    },
    getSnapshot: () => snapshot,
    reset,
    run,
    subscribe: (listener) => {
      listeners.add(listener);

      return () => listeners.delete(listener);
    },
  };
}

export function AnalystRunProvider({ children }: { children: React.ReactNode }) {
  const [store] = useState(createAnalystRunStore);

  useEffect(() => {
    return () => store.dispose();
  }, [store]);

  return React.createElement(AnalystRunStoreContext.Provider, { value: store }, children);
}

function useAnalystRunStore() {
  const store = useContext(AnalystRunStoreContext);

  if (store === null) {
    throw new Error("Analyst run store is not available");
  }

  return store;
}

export function useAnalystRunActions() {
  const store = useAnalystRunStore();

  return useMemo(() => ({ reset: store.reset, run: store.run }), [store]);
}

export function useAnalystRunSelector<T>(
  selector: (snapshot: AnalystRunSnapshot) => T,
  isEqual: (left: T, right: T) => boolean = Object.is,
) {
  const store = useAnalystRunStore();
  const getSelection = useMemo(
    () => createAnalystRunSelectionGetter(store.getSnapshot, selector, isEqual),
    [isEqual, selector, store],
  );

  return useSyncExternalStore(store.subscribe, getSelection, getSelection);
}

function createAnalystRunSelectionGetter<T>(
  getSnapshot: () => AnalystRunSnapshot,
  selector: (snapshot: AnalystRunSnapshot) => T,
  isEqual: (left: T, right: T) => boolean = Object.is,
) {
  let hasSelection = false;
  let selected: T;

  return () => {
    const nextSelected = selector(getSnapshot());

    if (hasSelection && isEqual(selected, nextSelected)) {
      return selected;
    }

    hasSelection = true;
    selected = nextSelected;
    return selected;
  };
}
