import { decodeMovementBatch } from "@bankops/contracts";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import WebSocket from "ws";
import type { RawData } from "ws";

import { buildServer } from "./main.js";
import type { WarmOpsSnapshotMessage } from "./ops-stream.js";

let app: Awaited<ReturnType<typeof buildServer>>;

describe("/stream", () => {
  beforeEach(async () => {
    app = await buildServer(false);
    await app.ready();
  });

  afterEach(async () => {
    await app.close();
  });

  it("emits binary hot movement batches and warm aggregate snapshots", async () => {
    const socket = await connect();

    const hotBatch = decodeMovementBatch(await nextBinary(socket));
    const firstSnapshot = await nextSnapshot(socket);
    const secondSnapshot = await nextSnapshot(socket);

    expect(hotBatch.fromSeq).toBe(1n);
    expect(hotBatch.movements.length).toBeGreaterThan(0);
    expect(firstSnapshot.type).toBe("ops.snapshot");
    expect(firstSnapshot.channel).toBe(2);
    expect(Number(secondSnapshot.seq)).toBeGreaterThan(Number(firstSnapshot.seq));

    socket.close();
  });

  it("changes stream rate without reconnecting", async () => {
    const socket = await connect();

    socket.send(JSON.stringify({ type: "stream.rate.set", targetRate: 50 }));

    const slowBatch = decodeMovementBatch(
      await nextBinary(socket, (data) => decodeMovementBatch(data).movements.length <= 1),
    );

    socket.send(JSON.stringify({ type: "stream.rate.set", targetRate: 10_000 }));

    const fastBatch = decodeMovementBatch(
      await nextBinary(socket, (data) => decodeMovementBatch(data).movements.length >= 160),
    );

    expect(slowBatch.movements.length).toBeLessThanOrEqual(1);
    expect(fastBatch.movements.length).toBeGreaterThanOrEqual(160);

    socket.close();
  });

  it("starts a fresh sequence after reconnect", async () => {
    const firstSocket = await connect();
    const firstBatch = decodeMovementBatch(await nextBinary(firstSocket));
    firstSocket.close();

    const secondSocket = await connect();
    const secondBatch = decodeMovementBatch(await nextBinary(secondSocket));
    secondSocket.close();

    expect(firstBatch.fromSeq).toBe(1n);
    expect(secondBatch.fromSeq).toBe(1n);
  });
});

function connect(): Promise<WebSocket> {
  return app.injectWS("/stream");
}

function nextBinary(
  socket: WebSocket,
  predicate: (data: Buffer) => boolean = () => true,
): Promise<Buffer> {
  return new Promise((resolve) => {
    const onMessage = (data: RawData, isBinary: boolean) => {
      if (!isBinary) {
        return;
      }

      const buffer = rawDataToBuffer(data);

      if (!predicate(buffer)) {
        return;
      }

      socket.off("message", onMessage);
      resolve(buffer);
    };

    socket.on("message", onMessage);
  });
}

function nextSnapshot(socket: WebSocket): Promise<WarmOpsSnapshotMessage> {
  return new Promise((resolve) => {
    const onMessage = (data: RawData, isBinary: boolean) => {
      if (isBinary) {
        return;
      }

      const parsed: unknown = JSON.parse(rawDataToText(data));
      assertWarmOpsSnapshotMessage(parsed);

      socket.off("message", onMessage);
      resolve(parsed);
    };

    socket.on("message", onMessage);
  });
}

function rawDataToBuffer(data: RawData): Buffer {
  if (Buffer.isBuffer(data)) {
    return data;
  }

  if (data instanceof ArrayBuffer) {
    return Buffer.from(data);
  }

  return Buffer.concat(data);
}

function rawDataToText(data: RawData): string {
  return rawDataToBuffer(data).toString("utf8");
}

function assertWarmOpsSnapshotMessage(value: unknown): asserts value is WarmOpsSnapshotMessage {
  if (typeof value !== "object" || value === null) {
    throw new Error("Expected warm ops snapshot message");
  }

  if (!("type" in value) || !("channel" in value)) {
    throw new Error("Expected warm ops snapshot message");
  }

  expect(value.type).toBe("ops.snapshot");
  expect(value.channel).toBe(2);
}
