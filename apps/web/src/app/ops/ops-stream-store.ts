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
    post({ type: "connect" });
  }

  function stop() {
    post({ type: "disconnect" });
    worker?.terminate();
    worker = undefined;
    snapshot = INITIAL_OPS_STREAM_SNAPSHOT;
  }

  function post(command: OpsWorkerCommand) {
    worker?.postMessage(command);
  }

  return {
    getSnapshot: () => snapshot,
    setStreamRate: (streamRate: StreamRate) => {
      emit({ ...snapshot, streamRate });
      post({ type: "stream.rate.set", targetRate: streamRate });
    },
    subscribe: (listener: () => void) => {
      listeners.add(listener);

      if (worker === undefined) {
        start();
      }

      return () => {
        listeners.delete(listener);

        if (listeners.size === 0) {
          stop();
        }
      };
    },
  };
}

export const opsStreamStore = createOpsStreamStore(
  () => new Worker(new URL("./ops-stream.worker.ts", import.meta.url), { type: "module" }),
);

export function useOpsStream() {
  const snapshot = useSyncExternalStore(
    opsStreamStore.subscribe,
    opsStreamStore.getSnapshot,
    opsStreamStore.getSnapshot,
  );

  return {
    setStreamRate: opsStreamStore.setStreamRate,
    snapshot,
  };
}
