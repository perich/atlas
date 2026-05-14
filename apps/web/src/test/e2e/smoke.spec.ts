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
