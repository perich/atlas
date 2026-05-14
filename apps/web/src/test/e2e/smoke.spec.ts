/// <reference types="node" />

import { expect, test } from "@playwright/test";
import { inflateSync } from "node:zlib";

test("bankops app exposes the product routes", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/ops");

  await expect(page.getByRole("heading", { name: "Operations control plane" })).toBeVisible();

  await page.getByRole("link", { name: "Audit" }).click();
  await expect(page.getByRole("heading", { name: "Balance sheet movement history" })).toBeVisible();

  await page.getByRole("link", { name: "Analyst" }).click();
  await expect(page.getByRole("heading", { name: "Analyst workspace" })).toBeVisible();
});

test("bankops app asks small screens to use desktop", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/ops");

  await expect(page.getByRole("heading", { name: "Please open on desktop :)" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Audit" })).toBeHidden();
});

test("bankops app renders a nonblank balance sheet tape canvas", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/ops");

  const tape = page.getByTestId("balance-sheet-tape");
  await expect(tape).toBeVisible();
  await expect(page.getByTestId("ops-connection-status")).toHaveText("Open");
  await expect(page.getByTestId("renderer-metric-new-rows")).not.toHaveText("0/s");

  expect(hasVariedPngBytes(await tape.screenshot())).toBe(true);
});

test("audit route virtualizes, filters, sorts, and loads more rows", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/audit");

  await expect(page.getByRole("heading", { name: "Balance sheet movement history" })).toBeVisible();
  await expect(page.getByTestId("audit-row").first()).toBeVisible();
  await expect(page.getByText("Rows cached")).toBeVisible();

  const initialMountedRows = await page.getByTestId("audit-row").count();

  expect(initialMountedRows).toBeGreaterThan(0);
  expect(initialMountedRows).toBeLessThan(80);

  await page.getByLabel("Status").selectOption("failed");
  await expect(page).toHaveURL(/status=failed/);
  await expect(page.getByTestId("audit-row").first()).toContainText("failed");

  await page.getByLabel("Sort field").selectOption("status");
  await expect(page).toHaveURL(/sortField=status/);

  await page.getByLabel("Sort ascending").click();
  await expect(page).toHaveURL(/sortDir=asc/);

  const scroll = page.getByTestId("audit-table-scroll");

  await scroll.evaluate((element) => {
    element.scrollTop = 3_000;
    element.dispatchEvent(new Event("scroll", { bubbles: true }));
  });

  await expect(page.getByTestId("audit-rows-cached")).toHaveText("200");

  const offsetRequests: string[] = [];

  page.on("request", (request) => {
    const url = request.url();

    if (url.includes("/api/audit?") && url.includes("offset=")) {
      offsetRequests.push(url);
    }
  });

  const directSeekRequest = page.waitForRequest(
    (request) => request.url().includes("/api/audit?") && request.url().includes("offset="),
  );

  await scroll.evaluate((element) => {
    for (const scrollTop of [6_000, 12_000, 18_000, 24_000, 30_000]) {
      element.scrollTop = scrollTop;
      element.dispatchEvent(new Event("scroll", { bubbles: true }));
    }
  });

  await directSeekRequest;
  await page.waitForTimeout(150);

  expect(offsetRequests).toHaveLength(1);
  await expect(page.getByTestId("audit-row").first()).toBeVisible();
  await expect
    .poll(async () => Number((await page.getByTestId("audit-rows-cached").textContent()) ?? 0))
    .toBeLessThanOrEqual(300);
});

test("audit route degrades gracefully when the backend is unavailable", async ({ page }) => {
  await page.route("**/api/audit**", (route) =>
    route.fulfill({ body: "unavailable", status: 503 }),
  );
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/audit");

  await expect(page.getByText("Audit backend unavailable")).toBeVisible();
});

function hasVariedPngBytes(png: Buffer) {
  const inflated = inflateSync(Buffer.concat(readPngChunks(png, "IDAT")));

  return new Set(inflated).size > 4;
}

function readPngChunks(png: Buffer, type: string) {
  const chunks: Buffer[] = [];
  let offset = 8;

  while (offset < png.length) {
    const length = png.readUInt32BE(offset);
    const chunkType = png.toString("ascii", offset + 4, offset + 8);
    const dataStart = offset + 8;

    if (chunkType === type) {
      chunks.push(png.subarray(dataStart, dataStart + length));
    }

    offset = dataStart + length + 4;
  }

  return chunks;
}
