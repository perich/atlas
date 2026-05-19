import path from "node:path";
import { loadEnvFile } from "node:process";
import { fileURLToPath } from "node:url";

import fastifyStatic from "@fastify/static";
import websocket from "@fastify/websocket";
import Fastify from "fastify";
import { z } from "zod";

import { registerAuditApi } from "./audit-api.js";
import { registerAnalystApi } from "./analyst/analyst-api.js";
import { startOpsStreamSession } from "./ops-stream.js";

const DEFAULT_PORT = 8787;
const DEFAULT_HOST = "0.0.0.0";
const listenPortSchema = z.coerce.number().int().min(1).max(65_535);

loadOptionalEnvFile(path.resolve(process.cwd(), ".env"));
loadOptionalEnvFile(path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..", ".env"));

type BuildServerOptions = {
  logger?: boolean;
  serveStatic?: boolean;
  staticRoot?: string;
};

export async function buildServer(options: BuildServerOptions = {}) {
  const app = Fastify({
    logger: options.logger ?? true,
  });

  await app.register(websocket);

  app.get("/healthz", async () => ({
    ok: true,
    service: "@bankops/server",
    uptimeSec: Math.round(process.uptime()),
  }));

  registerAuditApi(app);
  registerAnalystApi(app);

  app.get("/stream", { websocket: true }, (socket) => {
    startOpsStreamSession(socket);
  });

  if (options.serveStatic ?? process.env["NODE_ENV"] === "production") {
    const webDistDir = options.staticRoot ?? defaultWebDistDir();

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
  return {
    host: env["HOST"] ?? DEFAULT_HOST,
    port: parseListenPort(env["PORT"]),
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

function parseListenPort(port: string | undefined) {
  if (port === undefined) {
    return DEFAULT_PORT;
  }

  const result = listenPortSchema.safeParse(port);

  if (!result.success) {
    throw new Error("PORT must be an integer between 1 and 65535");
  }

  return result.data;
}

function loadOptionalEnvFile(filePath: string) {
  try {
    loadEnvFile(filePath);
  } catch {
    // Local .env is optional in tests and production deploys.
  }
}

// ESM version of "only start the server if this file is run directly".
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  void start();
}
