import { expect, test } from "@playwright/test";

import { hasVariedPngBytes } from "./helpers";

test("bankops app renders a nonblank balance sheet tape canvas", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/ops");

  const tape = page.getByTestId("balance-sheet-tape");
  await expect(tape).toBeVisible();
  await expect(page.getByTestId("ops-connection-status")).toHaveText("Open");
  await expect(page.getByTestId("renderer-metric-new-rows")).not.toHaveText("0/s");

  expect(hasVariedPngBytes(await tape.screenshot())).toBe(true);
});
