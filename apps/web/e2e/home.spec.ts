import { expect, test } from "@playwright/test";

test("loads the landing page and split campaign shells", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: /Run the room/i })).toBeVisible();
  await page.getByRole("link", { name: /The Candlekeep Breach/i }).click();

  await expect(page.getByRole("heading", { name: /The Candlekeep Breach/i })).toBeVisible();
  await expect(page.getByText(/Graceful degradation active/i)).toBeVisible();
  await expect(page.getByRole("button", { name: /Refresh copilot/i })).toBeVisible();

  await page.getByRole("link", { name: /Campaign HQ/i }).click();
  await expect(page).toHaveURL(/\/campaigns\/.+\/hq$/);
  await expect(page.getByRole("heading", { name: /Prep from consequences/i })).toBeVisible();
  await expect(page.getByRole("heading", { name: /Between-session fallout/i })).toBeVisible();

  await page.getByRole("link", { name: /Player Companion/i }).click();
  await expect(page).toHaveURL(/\/campaigns\/.+\/companion$/);
  await expect(page.getByRole("heading", { name: /Phone-first, not DM-lite/i })).toBeVisible();
  await expect(page.getByText(/Late join summary/i)).toBeVisible();
});

test("keeps live and companion empty states informative", async ({ page }) => {
  await page.goto("/campaigns/campaign_demo");

  await expect(page.getByText(/No structured facts yet/i)).toBeVisible();

  await page.getByRole("link", { name: /Player Companion/i }).click();
  await expect(page).toHaveURL(/\/campaigns\/.+\/companion$/);
  await expect(page.getByText(/No live turns yet/i)).toBeVisible();
});

test("companion shell buttons switch views and campaign actions propagate across shells", async ({ page }) => {
  await page.goto("/campaigns/campaign_demo/companion");

  await page.getByRole("button", { name: /^Dice$/i }).click();
  await expect(page.getByRole("heading", { name: /Companion quick dice/i })).toBeVisible();

  await page.getByRole("button", { name: /^Quest$/i }).click();
  await expect(page.getByRole("heading", { name: /Open fronts and approvals/i })).toBeVisible();

  await page.getByRole("link", { name: /Live Session/i }).click();
  await page.getByRole("button", { name: /Inject transcript/i }).click();
  await expect(
    page.getByLabel("Transcript rail").getByText(/The enemy standard dips as the rain lashes harder across the shattered parapet\./i)
  ).toBeVisible();

  await page.getByRole("button", { name: /Advance world tick/i }).click();
  await page.getByRole("link", { name: /Campaign HQ/i }).click();
  await expect(page.getByText(/World tick 2/i)).toBeVisible();

  await page.getByRole("link", { name: /Player Companion/i }).click();
  await page.getByRole("button", { name: /^Recap$/i }).click();
  await expect(
    page.locator(".companion-phone").getByText(/The enemy standard dips as the rain lashes harder across the shattered parapet\./i).first()
  ).toBeVisible();
});

// Regression: ISSUE-001 — stale copilot suggestions could be re-requested after approval
// Found by /qa on 2026-04-07
// Report: .gstack/qa-reports/qa-report-project-game-2026-04-07.md
test("approval-backed copilot intents update the live queue and campaign HQ", async ({ page }) => {
  await page.goto("/campaigns/campaign_demo");

  await page.getByRole("button", { name: /Refresh copilot/i }).click();
  await expect(page.getByText(/Advance the front pressure clock/i)).toBeVisible();

  await page.getByRole("button", { name: /Request approval/i }).click();
  await expect(page.getByRole("heading", { name: /Canon changes waiting on the DM/i })).toBeVisible();
  await expect(page.getByRole("button", { name: /Request approval/i })).toHaveCount(0);

  await page.getByRole("button", { name: /Approve canon change/i }).first().click();
  await expect(page.getByText(/No pending approvals/i)).toBeVisible();
  await expect(page.getByText(/already been queued or resolved/i)).toBeVisible();

  await page.getByRole("link", { name: /Campaign HQ/i }).click();
  await expect(page).toHaveURL(/\/campaigns\/.+\/hq$/);
  await expect(page.getByText(/World tick 2/i)).toBeVisible();
  await expect(page.getByText(/Recently resolved/i)).toBeVisible();
  await expect(page.getByText(/Applied/i).first()).toBeVisible();
});
