import { expect, test } from "@playwright/test";

test("bankops app renders and routes", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "BankOps Mission Control" })).toBeVisible();

  await page.getByRole("link", { name: "About" }).click();
  await expect(page.getByRole("heading", { name: "BankOps project spec" })).toBeVisible();
});
