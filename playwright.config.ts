import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./apps/web/src/test/e2e",
  fullyParallel: true,
  reporter: "html",
  use: {
    baseURL: "http://127.0.0.1:5173",
    trace: "on-first-retry",
  },
  webServer: [
    {
      command: "pnpm dev:server",
      reuseExistingServer: !process.env.CI,
      url: "http://127.0.0.1:8787/healthz",
    },
    {
      command: "pnpm dev:web",
      reuseExistingServer: !process.env.CI,
      url: "http://127.0.0.1:5173",
    },
  ],
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
