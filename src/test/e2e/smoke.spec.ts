import { expect, test } from "@playwright/test";

test("starter app renders and routes", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "React SPA starter" })).toBeVisible();

  await page.getByRole("link", { name: "About" }).click();
  await expect(page.getByRole("heading", { name: "Minimal app scaffold" })).toBeVisible();
});
