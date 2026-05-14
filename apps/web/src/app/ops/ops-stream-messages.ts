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
  renderer: OpsRendererMetrics;
};

export type OpsRendererMetrics = {
  supported: boolean;
  fps: number;
  frameCostMs: number;
  backlog: number;
  sequenceLag: number;
  decodedRate: number;
  renderedRowRate: number;
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
  renderer: {
    supported: false,
    fps: 0,
    frameCostMs: 0,
    backlog: 0,
    sequenceLag: 0,
    decodedRate: 0,
    renderedRowRate: 0,
  },
};

export type OpsWorkerCommand =
  | { type: "canvas.attach"; canvas: OffscreenCanvas }
  | { type: "connect" }
  | { type: "disconnect" }
  | { type: "stream.rate.set"; targetRate: StreamRate };

export type OpsWorkerMessage = {
  type: "snapshot";
  snapshot: OpsStreamSnapshot;
};
