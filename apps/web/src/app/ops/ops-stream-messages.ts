import {
  DEFAULT_STREAM_RATE,
  type BalanceSheetBucket,
  type Rail,
  type StreamRate,
} from "@bankops/contracts";

export type OpsConnectionStatus = "connecting" | "open" | "reconnecting" | "degraded";

export type OpsStreamSnapshot = {
  connectionStatus: OpsConnectionStatus;
  streamRate: StreamRate;
  seq: string;
  railBucketHeatmap: RailBucketHeatmapCell[];
  renderer: OpsRendererMetrics;
};

export type RailBucketHeatmapCell = {
  rail: Rail;
  bucket: BalanceSheetBucket;
  movementRate: number;
  amountPerSecMinor: number;
  creditMinor: number;
  debitMinor: number;
  exceptionRate: number;
  skew: number;
  intensity: number;
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

export type TapeCanvasLayout = {
  width: number;
  height: number;
  dpr: number;
};

export const INITIAL_OPS_STREAM_SNAPSHOT: OpsStreamSnapshot = {
  connectionStatus: "connecting",
  streamRate: DEFAULT_STREAM_RATE,
  seq: "0",
  railBucketHeatmap: [],
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
  | { type: "canvas.attach"; canvas: OffscreenCanvas; layout: TapeCanvasLayout }
  | { type: "canvas.resize"; layout: TapeCanvasLayout }
  | { type: "connect" }
  | { type: "disconnect" }
  | { type: "stream.rate.set"; targetRate: StreamRate };

export type OpsWorkerMessage = {
  type: "snapshot";
  snapshot: OpsStreamSnapshot;
};
