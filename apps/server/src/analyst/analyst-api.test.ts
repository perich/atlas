import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { buildServer } from "../main.js";

let app: Awaited<ReturnType<typeof buildServer>>;

describe("/api/analyst/runs", () => {
  const originalApiKey = process.env["OPENROUTER_API_KEY"];
  const originalModel = process.env["ANALYST_MODEL"];

  beforeEach(async () => {
    delete process.env["OPENROUTER_API_KEY"];
    delete process.env["ANALYST_MODEL"];
    app = await buildServer({ logger: false });
    await app.ready();
  });

  afterEach(async () => {
    await app.close();
    restoreEnv("OPENROUTER_API_KEY", originalApiKey);
    restoreEnv("ANALYST_MODEL", originalModel);
  });

  it("rejects invalid run requests before opening SSE", async () => {
    const response = await app.inject({
      method: "POST",
      payload: { question: "" },
      url: "/api/analyst/runs",
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({ error: "bad_request" });
  });

  it("streams visible configuration errors when the model env is missing", async () => {
    const response = await app.inject({
      method: "POST",
      payload: { question: "Show ACH return pressure" },
      url: "/api/analyst/runs",
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers["content-type"]).toContain("text/event-stream");
    expect(response.body).toContain("event: error");
    expect(response.body).toContain("OPENROUTER_API_KEY and ANALYST_MODEL must be configured");
  });
});

function restoreEnv(name: "OPENROUTER_API_KEY" | "ANALYST_MODEL", value: string | undefined) {
  if (value === undefined) {
    delete process.env[name];
    return;
  }

  process.env[name] = value;
}
