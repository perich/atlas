import { useSyncExternalStore } from "react";
import { DEFAULT_STREAM_RATE, type StreamRate } from "@bankops/contracts";

import type { OpsStreamSnapshot, OpsWorkerCommand, OpsWorkerMessage } from "./ops-stream-messages";

export const initialOpsStreamSnapshot: OpsStreamSnapshot = {
  connectionStatus: "connecting",
  streamRate: DEFAULT_STREAM_RATE,
  seq: "0",
  eventRate: 0,
  movementRate: 0,
  cumulativeCreditsMinor: "0",
  cumulativeDebitsMinor: "0",
  liquidityReserveMinor: "0",
  exceptionQueueDepth: 0,
  railHealth: [],
};

export function createOpsStreamStore(createWorker: () => Worker) {
  let worker: Worker | undefined;
  let snapshot = initialOpsStreamSnapshot;
  const listeners = new Set<() => void>();

  function emit(nextSnapshot: OpsStreamSnapshot) {
    snapshot = nextSnapshot;
    listeners.forEach((listener) => listener());
  }

  function start() {
    worker = createWorker();
    worker.onmessage = (event: MessageEvent<OpsWorkerMessage>) => {
      if (event.data.type === "snapshot") {
        emit(event.data.snapshot);
      }
    };
    post({ type: "connect" });
  }

  function stop() {
    post({ type: "disconnect" });
    worker?.terminate();
    worker = undefined;
    snapshot = initialOpsStreamSnapshot;
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
