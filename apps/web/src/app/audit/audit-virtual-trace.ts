import { useSyncExternalStore } from "react";

const AUDIT_VIRTUAL_TRACE_NOTIFY_INTERVAL_MS = 250;

type AuditVirtualTraceSnapshot = {
  firstVirtualIndex: number | undefined;
  lastVirtualIndex: number | undefined;
  mountedRows: number;
};

const EMPTY_AUDIT_VIRTUAL_TRACE_SNAPSHOT: AuditVirtualTraceSnapshot = {
  firstVirtualIndex: undefined,
  lastVirtualIndex: undefined,
  mountedRows: 0,
};

const subscribers = new Set<() => void>();
let currentSnapshot = EMPTY_AUDIT_VIRTUAL_TRACE_SNAPSHOT;
let lastPublishedAt = 0;
let pendingSnapshot = EMPTY_AUDIT_VIRTUAL_TRACE_SNAPSHOT;
let pendingTimeoutId: number | undefined;

function sameAuditVirtualTraceSnapshot(
  left: AuditVirtualTraceSnapshot,
  right: AuditVirtualTraceSnapshot,
) {
  return (
    left.firstVirtualIndex === right.firstVirtualIndex &&
    left.lastVirtualIndex === right.lastVirtualIndex &&
    left.mountedRows === right.mountedRows
  );
}

function publishNow(snapshot: AuditVirtualTraceSnapshot) {
  pendingTimeoutId = undefined;

  if (sameAuditVirtualTraceSnapshot(currentSnapshot, snapshot)) {
    return;
  }

  currentSnapshot = snapshot;
  lastPublishedAt = Date.now();

  for (const subscriber of subscribers) {
    subscriber();
  }
}

export function publishAuditVirtualTraceSnapshot(snapshot: AuditVirtualTraceSnapshot) {
  if (
    sameAuditVirtualTraceSnapshot(currentSnapshot, snapshot) ||
    sameAuditVirtualTraceSnapshot(pendingSnapshot, snapshot)
  ) {
    return;
  }

  pendingSnapshot = snapshot;

  if (pendingTimeoutId !== undefined) {
    return;
  }

  const nextDelay = AUDIT_VIRTUAL_TRACE_NOTIFY_INTERVAL_MS - (Date.now() - lastPublishedAt);

  if (nextDelay <= 0) {
    publishNow(pendingSnapshot);
    return;
  }

  pendingTimeoutId = window.setTimeout(() => publishNow(pendingSnapshot), nextDelay);
}

function subscribeToAuditVirtualTrace(onStoreChange: () => void) {
  subscribers.add(onStoreChange);

  return () => subscribers.delete(onStoreChange);
}

function readAuditVirtualTraceSnapshot() {
  return currentSnapshot;
}

export function useAuditVirtualTraceSnapshot() {
  return useSyncExternalStore(
    subscribeToAuditVirtualTrace,
    readAuditVirtualTraceSnapshot,
    readAuditVirtualTraceSnapshot,
  );
}
