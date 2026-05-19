import { expect, test } from "@playwright/test";

test("bankops app exposes the product routes", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/ops");

  await expect(page.getByRole("heading", { name: "Operations Control Plane" })).toBeVisible();

  await page.getByRole("link", { name: "Audit" }).click();
  await expect(page.getByRole("heading", { name: "Bank Core Audit Log" })).toBeVisible();

  await page.getByRole("link", { name: "Analyst" }).click();
  await expect(page.getByRole("heading", { name: "Analyst workspace" })).toBeVisible();
});

test("bankops app asks small screens to use desktop", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/ops");

  await expect(page.getByRole("heading", { name: "Please open on desktop :)" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Audit" })).toBeHidden();
});
