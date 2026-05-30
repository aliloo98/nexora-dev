/**
 * Playwright E2E tests (requires Playwright to be installed locally)
 * Run with: npx playwright test tests/playwright
 */
const { test, expect } = require('@playwright/test');

test.describe('Assistant E2E', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173/#section-dashboard');
  });

  test('assistant visible and KPIs', async ({ page }) => {
    const card = await page.waitForSelector('#assistant-card', { timeout: 5000 });
    expect(card).toBeTruthy();
    await expect(page.locator('#assistant-kpis-grid')).toBeVisible();
    await expect(page.locator('#assistant-forecast-grid .forecast-card')).toHaveCount(4);
  });

  test('charts visible and no horizontal overflow', async ({ page }) => {
    await expect(page.locator('.chart-card')).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    expect(overflow).toBeFalsy();
  });
});
