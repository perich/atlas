import { encodeOpsStreamControlFrame, type OpsStreamRateControlFrame } from "@bankops/contracts";

const SOCKET_OPEN = 1;

export type OpsStreamControlSocket = Pick<WebSocket, "readyState" | "send">;

export function sendOpsStreamControlFrame(
  socket: OpsStreamControlSocket | undefined,
  frame: OpsStreamRateControlFrame,
): boolean {
  if (socket === undefined || socket.readyState !== SOCKET_OPEN) {
    return false;
  }

  try {
    socket.send(encodeOpsStreamControlFrame(frame));
    return true;
  } catch {
    return false;
  }
}
