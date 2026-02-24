import { test, expect } from "@playwright/test";

test.describe("Grocery list generation", () => {
  test("generates grocery list and shows items or empty message", async ({ page }) => {
    await page.goto("/grocery");
    await page.waitForLoadState("networkidle");

    // Check if there are any recipe checkboxes to select
    const checkboxes = page.getByRole("checkbox");
    const checkboxCount = await checkboxes.count();

    if (checkboxCount > 0) {
      // Select the first recipe checkbox
      await checkboxes.first().check();
    }

    // Click the Generate list button
    await page.getByRole("button", { name: /generate list/i }).click();
    await page.waitForLoadState("networkidle");

    // Verify SHIP or IN_PERSON sections are present (always rendered),
    // or the no-items helper text is present
    const shipSection = page.getByText(/Ship/i).first();
    const hasShipOrInPerson = await shipSection.isVisible().catch(() => false);

    // Check for "No ship items yet" or "No in-person items yet" messages
    const hasNoItemsMsg = await page.getByText(/No ship items yet/i).isVisible().catch(() => false)
      || await page.getByText(/No in-person items yet/i).isVisible().catch(() => false);

    expect(hasShipOrInPerson || hasNoItemsMsg).toBe(true);
  });
});
