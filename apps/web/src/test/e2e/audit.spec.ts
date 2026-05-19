import { expect, test } from "@playwright/test";

import { selectAuditFilter } from "./helpers";

test("audit route virtualizes, filters, sorts, and loads more rows", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/audit");

  await expect(page.getByRole("heading", { name: "Bank Core Audit Log" })).toBeVisible();
  await expect(page.getByTestId("audit-row").first()).toBeVisible();
  await expect(page.getByTestId("audit-rows-cached")).toBeVisible();

  const [firstHeaderBottom, firstRowTop] = await Promise.all([
    page
      .getByTestId("audit-column-header-ts")
      .evaluate((element) => element.getBoundingClientRect().bottom),
    page
      .getByTestId("audit-row")
      .first()
      .evaluate((element) => element.getBoundingClientRect().top),
  ]);

  expect(Math.abs(firstRowTop - firstHeaderBottom)).toBeLessThanOrEqual(1);

  const initialMountedRows = await page.getByTestId("audit-row").count();

  expect(initialMountedRows).toBeGreaterThan(0);
  expect(initialMountedRows).toBeLessThan(80);

  await selectAuditFilter(page, "Status", "failed");
  await expect(page).toHaveURL(/status=failed/);
  await expect(page.getByText("Filtered")).toBeVisible();
  await expect(page.getByText("status: failed")).toBeVisible();
  await expect(page.getByTestId("audit-row").first()).toContainText("failed");
  await page.getByRole("button", { name: "Reset" }).click();
  await expect(page).not.toHaveURL(/status=failed/);
  await expect(page.getByText("status: failed")).toHaveCount(0);
  await selectAuditFilter(page, "Status", "failed");
  await expect(page).toHaveURL(/status=failed/);
  await expect(page.getByTestId("audit-row").first()).toContainText("failed");

  let releaseSortedRequest!: () => void;
  const sortedRequestPending = new Promise<void>((resolve) => {
    releaseSortedRequest = resolve;
  });
  await page.route("**/api/audit?**sortField=status**", async (route) => {
    await sortedRequestPending;
    await route.continue();
  });
  const statusHeader = page.getByTestId("audit-column-header-status");

  await statusHeader.click();
  await expect(page).toHaveURL(/sortField=status/);
  await expect(page.getByTestId("audit-row").first()).toBeVisible();
  await expect(page.getByTestId("audit-row-placeholder")).toHaveCount(0);
  releaseSortedRequest();
  await page.evaluate(() => window.scrollTo(0, 260));
  const beforeSortScrollY = await page.evaluate(() => window.scrollY);

  await statusHeader.click();
  await expect(page).toHaveURL(/sortDir=asc/);
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(beforeSortScrollY);
  await expect(page.getByTestId("audit-rows-cached")).toHaveText("200");

  const scroll = page.getByTestId("audit-table-scroll");
  const nextPageRequest = page.waitForRequest(
    (request) => request.url().includes("/api/audit?") && request.url().includes("after="),
  );
  const rowHeight = await page
    .getByTestId("audit-row")
    .first()
    .evaluate((element) => element.getBoundingClientRect().height);

  await scroll.evaluate((element, nextPageScrollTop) => {
    element.scrollTop = nextPageScrollTop;
    element.dispatchEvent(new Event("scroll", { bubbles: true }));
  }, rowHeight * 100);

  await nextPageRequest;
  await expect
    .poll(async () => Number((await page.getByTestId("audit-rows-cached").textContent()) ?? 0))
    .toBeGreaterThanOrEqual(400);
  await expect(page.getByTestId("audit-row-placeholder")).toHaveCount(0);

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
    .toBeLessThanOrEqual(1_000);
});

test("audit route persists column controls and shows render trace", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/audit");

  await expect(page.getByLabel("Render trace")).toBeVisible();
  await expect(page.getByText("Visible Range")).toBeVisible();
  await expect(page.getByText("Query Latency")).toBeVisible();
  await expect(page.getByRole("button", { name: /Copy trace ID/ }).first()).toBeVisible();

  const railHeader = page.getByTestId("audit-column-header-rail");
  await railHeader.click();
  await expect(page).toHaveURL(/sortField=rail/);
  await expect(railHeader).toHaveAttribute("aria-sort", "descending");
  await railHeader.click();
  await expect(page).toHaveURL(/sortDir=asc/);
  await expect(railHeader).toHaveAttribute("aria-sort", "ascending");
  await expect
    .poll(() => railHeader.evaluate((element) => getComputedStyle(element).cursor))
    .toBe("pointer");
  await expect
    .poll(() =>
      page
        .getByTestId("audit-column-header-amountMinor")
        .evaluate((element) => getComputedStyle(element).cursor),
    )
    .toBe("grab");

  await page.getByRole("button", { name: "Columns" }).click();
  await page.getByRole("menuitemcheckbox", { name: /Show Actor/ }).click();
  await page.keyboard.press("Escape");

  await expect(page.getByTestId("audit-column-header-actor")).toHaveCount(0);

  await page.reload();

  await expect(page.getByTestId("audit-row").first()).toBeVisible();
  await expect(page.getByTestId("audit-column-header-actor")).toHaveCount(0);
});

test("audit route degrades gracefully when the backend is unavailable", async ({ page }) => {
  await page.route("**/api/audit**", (route) =>
    route.fulfill({ body: "unavailable", status: 503 }),
  );
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/audit");

  await expect(page.getByText("Audit backend unavailable")).toBeVisible();
});
