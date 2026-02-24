import { test, expect } from "@playwright/test";

test.describe("Suggest page", () => {
  test("loads page and finds recipes with Find Recipes button", async ({ page }) => {
    await page.goto("/suggest");

    // Click Find Recipes
    await page.getByRole("button", { name: /find recipes/i }).click();

    // Wait for results to appear — either recipe cards or the empty state
    await page.waitForLoadState("networkidle");

    // Should see either results or empty state (no crash)
    const hasResults = await page.locator(".card").count() > 1;
    if (hasResults) {
      // If we have recipe results, verify at least one card renders
      await expect(page.locator(".card").nth(1)).toBeVisible();
    } else {
      // Empty state should render cleanly
      await expect(page.getByText(/no recipes/i)).toBeVisible();
    }
  });

  test("cost-per-serving field renders on result cards when data available", async ({ page }) => {
    await page.goto("/suggest");

    await page.getByRole("button", { name: /find recipes/i }).click();
    await page.waitForLoadState("networkidle");

    // If any results appear with cost data, verify the badge format
    const costBadges = page.locator(".tag.cost");
    const count = await costBadges.count();
    if (count > 0) {
      // At least one badge should contain the expected format
      await expect(costBadges.first()).toContainText("/serving");
    }
    // If count is 0, no cost data is in inventory — that's a valid state
  });
});
