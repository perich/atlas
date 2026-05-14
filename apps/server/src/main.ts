import path from "node:path";
import { fileURLToPath } from "node:url";

import fastifyStatic from "@fastify/static";
import websocket from "@fastify/websocket";
import Fastify from "fastify";

import { startOpsStreamSession } from "./ops-stream.js";

const DEFAULT_PORT = 8787;
const DEFAULT_HOST = "0.0.0.0";

export async function buildServer(logger = true) {
  const app = Fastify({
    logger,
  });

  await app.register(websocket);

  app.get("/healthz", async () => ({
    ok: true,
    service: "@bankops/server",
    uptimeSec: Math.round(process.uptime()),
  }));

  app.get("/api/audit", async () => ({
    rows: [],
    nextCursor: undefined,
    prevCursor: undefined,
    totalMatched: 0,
    queryMs: 0,
  }));

  app.get("/api/audit/facets", async () => ({
    severity: {},
    rail: {},
    status: {},
  }));

  app.get("/stream", { websocket: true }, (socket) => {
    startOpsStreamSession(socket);
  });

  if (process.env.NODE_ENV === "production") {
    const currentDir = path.dirname(fileURLToPath(import.meta.url));
    const webDistDir = path.resolve(currentDir, "../../web/dist");

    await app.register(fastifyStatic, {
      root: webDistDir,
      wildcard: false,
    });

    app.setNotFoundHandler((request, reply) => {
      const url = request.raw.url ?? "";

      if (url.startsWith("/api/") || url === "/stream") {
        void reply.code(404).send({ error: "not_found" });
        return;
      }

      void reply.sendFile("index.html");
    });
  }

  return app;
}

async function start() {
  const app = await buildServer();
  const port = Number(process.env.PORT ?? DEFAULT_PORT);
  const host = process.env.HOST ?? DEFAULT_HOST;

  await app.listen({ host, port });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  void start();
}
