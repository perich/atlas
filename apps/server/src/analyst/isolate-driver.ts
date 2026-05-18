import type { IsolateDriver } from "@tanstack/ai-code-mode";

let cachedDriver: IsolateDriver | undefined;

export async function createAnalystIsolateDriver(): Promise<IsolateDriver> {
  if (cachedDriver !== undefined) {
    return cachedDriver;
  }

  try {
    const { createNodeIsolateDriver } = await import("@tanstack/ai-isolate-node");
    cachedDriver = createNodeIsolateDriver();
    return cachedDriver;
  } catch {
    const { createQuickJSIsolateDriver } = await import("@tanstack/ai-isolate-quickjs");
    cachedDriver = createQuickJSIsolateDriver();
    return cachedDriver;
  }
}
