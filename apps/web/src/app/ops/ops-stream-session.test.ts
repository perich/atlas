import { describe, expect, it, vi } from "vitest";

import { sendOpsStreamControlFrame, type OpsStreamControlSocket } from "./ops-stream-session";

const openReadyState = 1;
const connectingReadyState = 0;

describe("Ops Stream Session Adapter", () => {
  it("sends encoded stream controls only when the WebSocket is open", () => {
    const socket = {
      readyState: openReadyState,
      send: vi.fn(),
    } satisfies OpsStreamControlSocket;

    expect(sendOpsStreamControlFrame(socket, { type: "stream.rate.set", targetRate: 10_000 })).toBe(
      true,
    );
    expect(socket.send).toHaveBeenCalledWith(
      JSON.stringify({ type: "stream.rate.set", targetRate: 10_000 }),
    );
  });

  it("does not send controls while the WebSocket is not open", () => {
    const socket = {
      readyState: connectingReadyState,
      send: vi.fn(),
    } satisfies OpsStreamControlSocket;

    expect(sendOpsStreamControlFrame(socket, { type: "stream.rate.set", targetRate: 50 })).toBe(
      false,
    );
    expect(socket.send).not.toHaveBeenCalled();
  });

  it("keeps session callers stable if a browser send races with close", () => {
    const socket = {
      readyState: openReadyState,
      send: vi.fn(() => {
        throw new Error("socket closing");
      }),
    } satisfies OpsStreamControlSocket;

    expect(sendOpsStreamControlFrame(socket, { type: "stream.rate.set", targetRate: 1 })).toBe(
      false,
    );
  });
});
