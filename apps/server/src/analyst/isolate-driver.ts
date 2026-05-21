import type { IsolateDriver } from "@tanstack/ai-code-mode";

let cachedDriver: Promise<IsolateDriver> | undefined;

export async function createAnalystIsolateDriver(): Promise<IsolateDriver> {
  cachedDriver ??= loadAnalystIsolateDriver();
  return cachedDriver;
}

async function loadAnalystIsolateDriver(): Promise<IsolateDriver> {
  try {
    const { createNodeIsolateDriver } = await import("@tanstack/ai-isolate-node");
    return createNodeIsolateDriver();
  } catch {
    const { createQuickJSIsolateDriver } = await import("@tanstack/ai-isolate-quickjs");
    return createQuickJSIsolateDriver();
  }
}
