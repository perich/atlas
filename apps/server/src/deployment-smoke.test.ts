import { mkdtemp, rm, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { buildServer, resolveListenOptions } from "./main.js";

let app: Awaited<ReturnType<typeof buildServer>>;
let staticRoot: string;

describe("single-service production deploy behavior", () => {
  beforeEach(async () => {
    staticRoot = await mkdtemp(path.join(tmpdir(), "bankops-static-"));
    await mkdir(path.join(staticRoot, "assets"));
    await writeFile(
      path.join(staticRoot, "index.html"),
      '<!doctype html><html><body><div id="root">BankOps shell</div></body></html>',
    );
    await writeFile(path.join(staticRoot, "assets", "app.js"), "window.__bankops = true;");

    app = await buildServer({ logger: false, serveStatic: true, staticRoot });
    await app.ready();
  });

  afterEach(async () => {
    await app.close();
    await rm(staticRoot, { force: true, recursive: true });
  });

  it("serves health, API, static assets, SPA fallbacks, and WebSocket upgrades from one app", async () => {
    const health = await app.inject({ method: "GET", url: "/healthz" });
    const audit = await app.inject({ method: "GET", url: "/api/audit?limit=1" });
    const asset = await app.inject({ method: "GET", url: "/assets/app.js" });
    const root = await app.inject({ method: "GET", url: "/" });
    const spaRoute = await app.inject({ method: "GET", url: "/audit?sortField=rail" });
    const streamHttp = await app.inject({ method: "GET", url: "/stream" });
    const socket = await app.injectWS("/stream");

    expect(health.statusCode).toBe(200);
    expect(health.json()).toMatchObject({ ok: true, service: "@bankops/server" });
    expect(audit.statusCode).toBe(200);
    expect(asset.statusCode).toBe(200);
    expect(asset.body).toContain("window.__bankops");
    expect(root.statusCode).toBe(200);
    expect(root.body).toContain("BankOps shell");
    expect(spaRoute.statusCode).toBe(200);
    expect(spaRoute.body).toContain("BankOps shell");
    expect(streamHttp.statusCode).toBe(404);

    socket.close();
  });

  it("uses Render-compatible listen defaults and PORT overrides", () => {
    expect(resolveListenOptions({})).toEqual({ host: "0.0.0.0", port: 8787 });
    expect(resolveListenOptions({ HOST: "127.0.0.1", PORT: "4317" })).toEqual({
      host: "127.0.0.1",
      port: 4317,
    });
  });
});
