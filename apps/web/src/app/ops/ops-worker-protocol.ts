import { StreamChannel } from "@bankops/contracts";

import type { OpsStreamSnapshot } from "./ops-stream-messages";

export type WarmOpsSnapshotMessage = Omit<
  OpsStreamSnapshot,
  "connectionStatus" | "streamRate" | "railBucketHeatmap" | "renderer"
> & {
  channel: typeof StreamChannel.AggregateSnapshot;
  type: "ops.snapshot";
};

export function readWarmSnapshot(raw: string): WarmOpsSnapshotMessage {
  const value: unknown = JSON.parse(raw);
  assertWarmSnapshot(value);

  return value;
}

function assertWarmSnapshot(value: unknown): asserts value is WarmOpsSnapshotMessage {
  if (typeof value !== "object" || value === null) {
    throw new Error("Expected warm ops snapshot");
  }

  if (!("type" in value) || !("channel" in value)) {
    throw new Error("Expected warm ops snapshot");
  }

  if (value.type !== "ops.snapshot" || value.channel !== StreamChannel.AggregateSnapshot) {
    throw new Error("Unknown SettlementStream warm message");
  }
}
