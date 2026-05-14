import { useSyncExternalStore } from "react";
import type { StreamRate } from "@bankops/contracts";

import {
  INITIAL_OPS_STREAM_SNAPSHOT,
  type OpsStreamSnapshot,
  type OpsWorkerCommand,
  type OpsWorkerMessage,
} from "./ops-stream-messages";

export function createOpsStreamStore(createWorker: () => Worker) {
  let worker: Worker | undefined;
  let pendingTapeCanvas: OffscreenCanvas | undefined;
  let stopTimer: number | undefined;
  let snapshot = INITIAL_OPS_STREAM_SNAPSHOT;
  const listeners = new Set<() => void>();

  function emit(nextSnapshot: OpsStreamSnapshot) {
    snapshot = nextSnapshot;
    listeners.forEach((listener) => listener());
  }

  function start() {
    worker = createWorker();
    worker.onmessage = (event: MessageEvent<OpsWorkerMessage>) => {
      emit(event.data.snapshot);
    };
    attachPendingTapeCanvas();
    post({ type: "connect" });
  }

  function stop() {
    stopTimer = undefined;
    post({ type: "disconnect" });
    worker?.terminate();
    worker = undefined;
    pendingTapeCanvas = undefined;
    snapshot = INITIAL_OPS_STREAM_SNAPSHOT;
  }

  function post(command: OpsWorkerCommand) {
    worker?.postMessage(command);
  }

  return {
    attachTapeCanvas: (canvas: OffscreenCanvas) => {
      pendingTapeCanvas = canvas;
      attachPendingTapeCanvas();
    },
    getSnapshot: () => snapshot,
    setStreamRate: (streamRate: StreamRate) => {
      emit({ ...snapshot, streamRate });
      post({ type: "stream.rate.set", targetRate: streamRate });
    },
    subscribe: (listener: () => void) => {
      window.clearTimeout(stopTimer);
      listeners.add(listener);

      if (worker === undefined) {
        start();
      }

      return () => {
        listeners.delete(listener);

        if (listeners.size === 0) {
          stopTimer = window.setTimeout(stop, 100);
        }
      };
    },
  };

  function attachPendingTapeCanvas() {
    if (worker === undefined || pendingTapeCanvas === undefined) {
      return;
    }

    worker.postMessage({ type: "canvas.attach", canvas: pendingTapeCanvas }, [pendingTapeCanvas]);
    pendingTapeCanvas = undefined;
  }
}

export const opsStreamStore = createOpsStreamStore(
  // Standard Vite worker bundling pattern: resolve the worker relative to this module.
  () => new Worker(new URL("./ops-stream.worker.ts", import.meta.url), { type: "module" }),
);

export function useOpsStream() {
  const snapshot = useSyncExternalStore(
    opsStreamStore.subscribe,
    opsStreamStore.getSnapshot,
    opsStreamStore.getSnapshot,
  );

  return {
    attachTapeCanvas: opsStreamStore.attachTapeCanvas,
    setStreamRate: opsStreamStore.setStreamRate,
    snapshot,
  };
}
