import path from "node:path";
import { fileURLToPath } from "node:url";

import fastifyStatic from "@fastify/static";
import websocket from "@fastify/websocket";
import Fastify from "fastify";

import { registerAuditApi } from "./audit-api.js";
import { startOpsStreamSession } from "./ops-stream.js";

const DEFAULT_PORT = 8787;
const DEFAULT_HOST = "0.0.0.0";

type BuildServerOptions = {
  logger?: boolean;
  serveStatic?: boolean;
  staticRoot?: string;
};

export async function buildServer(options: boolean | BuildServerOptions = true) {
  const resolvedOptions = typeof options === "boolean" ? { logger: options } : options;
  const app = Fastify({
    logger: resolvedOptions.logger ?? true,
  });

  await app.register(websocket);

  app.get("/healthz", async () => ({
    ok: true,
    service: "@bankops/server",
    uptimeSec: Math.round(process.uptime()),
  }));

  registerAuditApi(app);

  app.get("/stream", { websocket: true }, (socket) => {
    startOpsStreamSession(socket);
  });

  if (resolvedOptions.serveStatic ?? process.env.NODE_ENV === "production") {
    const webDistDir = resolvedOptions.staticRoot ?? defaultWebDistDir();

    await app.register(fastifyStatic, {
      root: webDistDir,
      wildcard: false,
    });

    app.setNotFoundHandler((request, reply) => {
      const url = request.raw.url ?? "";

      if (url.startsWith("/api/") || url === "/stream" || url.startsWith("/stream?")) {
        void reply.code(404).send({ error: "not_found" });
        return;
      }

      void reply.sendFile("index.html");
    });
  }

  return app;
}

export function resolveListenOptions(env: NodeJS.ProcessEnv = process.env) {
  const port = Number(env.PORT ?? DEFAULT_PORT);

  return {
    host: env.HOST ?? DEFAULT_HOST,
    port: Number.isFinite(port) ? port : DEFAULT_PORT,
  };
}

async function start() {
  const app = await buildServer();

  await app.listen(resolveListenOptions());
}

function defaultWebDistDir() {
  const currentDir = path.dirname(fileURLToPath(import.meta.url));

  return path.resolve(currentDir, "../../web/dist");
}

// ESM version of "only start the server if this file is run directly".
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  void start();
}
