/**
 * Playwright E2E tests (requires Playwright to be installed locally)
 * Run with: npx playwright test tests/playwright
 */
import { test, expect } from '@playwright/test';

test.describe('Assistant E2E', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://127.0.0.1:5173/#section-dashboard');
    await page.waitForSelector('#loginDemoBtn', { state: 'visible', timeout: 15000 });
    await page.click('#loginDemoBtn');
    await page.waitForURL('**/#section-dashboard', { timeout: 20000 });
    await page.waitForSelector('#assistant-card', { state: 'visible', timeout: 30000 });
  });

  test('assistant visible and KPIs', async ({ page }) => {
    await page.waitForSelector('#assistant-card', { state: 'visible', timeout: 30000 });
    await expect(page.locator('#assistant-kpis-grid')).toBeVisible();
    await expect(page.locator('#assistant-forecast-grid .forecast-card')).toHaveCount(4);
  });

  test('charts visible and no horizontal overflow', async ({ page }) => {
    await page.waitForSelector('.chart-card', { state: 'visible', timeout: 30000 });
    await expect(page.locator('.chart-card').first()).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    expect(overflow).toBeFalsy();
  });
});
