import { DEFAULT_STREAM_RATE, type Rail, type StreamRate } from "@bankops/contracts";

export type OpsConnectionStatus = "connecting" | "open" | "reconnecting" | "degraded";

export type RailHealthSnapshot = {
  rail: Rail;
  status: "nominal" | "degraded" | "incident";
  eventCount: number;
  eventsPerSec: number;
  failureRate: number;
  pendingCount: number;
  heldCount: number;
  averageLatencyMs: number;
  p95LatencyMs: number;
  lastEventTs: number;
};

export type OpsStreamSnapshot = {
  connectionStatus: OpsConnectionStatus;
  streamRate: StreamRate;
  seq: string;
  eventRate: number;
  movementRate: number;
  cumulativeCreditsMinor: string;
  cumulativeDebitsMinor: string;
  liquidityReserveMinor: string;
  exceptionQueueDepth: number;
  railHealth: RailHealthSnapshot[];
};

export const INITIAL_OPS_STREAM_SNAPSHOT: OpsStreamSnapshot = {
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

export type OpsWorkerCommand =
  | { type: "connect" }
  | { type: "disconnect" }
  | { type: "stream.rate.set"; targetRate: StreamRate };

export type OpsWorkerMessage = {
  type: "snapshot";
  snapshot: OpsStreamSnapshot;
};
