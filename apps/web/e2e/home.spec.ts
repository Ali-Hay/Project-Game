import { expect, test } from "@playwright/test";

test("loads the landing page and campaign shell", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: /Run the room/i })).toBeVisible();
  await page.getByRole("link", { name: /The Candlekeep Breach/i }).click();

  await expect(page.getByRole("heading", { name: /The Candlekeep Breach/i })).toBeVisible();
  await expect(page.getByText(/Graceful degradation active/i)).toBeVisible();
  await expect(page.getByRole("button", { name: /Refresh copilot/i })).toBeVisible();
});
