import { test, expect } from "@playwright/test";

test.describe("Inventory CRUD", () => {
  // Name must not contain hyphens or underscores — normName() converts them to spaces
  const testItemName = `e2e test item ${Date.now()}`;

  test.beforeEach(async ({ page }) => {
    // Clean up any leftover test items from previous runs
    const res = await page.request.get("/api/inventory/items");
    const data = await res.json();
    for (const item of (data.items ?? []) as { name: string; id: string }[]) {
      if (item.name.startsWith("e2e test item ")) {
        await page.request.delete(`/api/inventory/items?id=${item.id}`);
      }
    }
  });

  test.afterEach(async ({ page }) => {
    // Best-effort cleanup
    const res = await page.request.get("/api/inventory/items");
    const data = await res.json();
    for (const item of (data.items ?? []) as { name: string; id: string }[]) {
      if (item.name.startsWith("e2e test item ")) {
        await page.request.delete(`/api/inventory/items?id=${item.id}`);
      }
    }
  });

  test("add item, verify in table, delete, verify gone", async ({ page }) => {
    await page.goto("/inventory");
    await page.waitForLoadState("networkidle");

    // Fill in the add item form (qty is required by the API — min 1 char)
    await page.getByPlaceholder("item name (e.g., canned chickpeas)").fill(testItemName);
    await page.getByPlaceholder("qty (e.g., 2 cans)").fill("1");

    // Submit the form — button text is "Add"
    await page.getByRole("button", { name: /^add$/i }).click();

    // Verify item appears in the table (look for a <td> cell, not just any text)
    const itemCell = page.getByRole("cell", { name: testItemName, exact: true });
    await expect(itemCell).toBeVisible({ timeout: 10_000 });

    // Delete the item — find the Delete button in the row containing the test item
    const row = page.locator("tr", { hasText: testItemName });
    await row.getByRole("button", { name: /delete/i }).click();

    // Confirm the delete modal
    const confirmBtn = page.getByRole("button", { name: /^delete$/i }).last();
    await expect(confirmBtn).toBeVisible({ timeout: 3_000 });
    await confirmBtn.click();

    // Verify the table cell is gone (modal may briefly still contain the name, so target the cell)
    await expect(itemCell).not.toBeVisible({ timeout: 10_000 });
  });
});
