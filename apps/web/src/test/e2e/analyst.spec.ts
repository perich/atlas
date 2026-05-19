import { expect, test } from "@playwright/test";

test("analyst route can complete a real model report when configured", async ({ page }) => {
  test.skip(
    !process.env.OPENROUTER_API_KEY || !process.env.ANALYST_MODEL,
    "Set OPENROUTER_API_KEY and ANALYST_MODEL to run the real CodeMode happy path.",
  );

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/analyst");
  await page
    .getByRole("textbox")
    .fill("Create a report with one bar chart, one data table, and a customer watchlist.");
  await page.getByRole("button", { name: /Generate/ }).click();

  await expect(page.getByText("Validated report ready")).toBeVisible({ timeout: 420_000 });
  await expect(page.getByText("Validated Analyst Report")).toBeVisible();
  await expect(page.locator(".recharts-wrapper").first()).toBeVisible();
  await expect(page.locator("table").first()).toBeVisible();
});
