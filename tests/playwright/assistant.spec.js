/**
 * Playwright E2E tests (requires Playwright to be installed locally)
 * Run with: npx playwright test tests/playwright
 */
import { test, expect } from '@playwright/test';

test.describe('Assistant E2E', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://127.0.0.1:5180/#section-dashboard');
    await page.waitForSelector('#loginDemoBtn', { state: 'visible', timeout: 15000 });
    await page.click('#loginDemoBtn');
    await page.waitForURL('**/#section-dashboard', { timeout: 20000 });
    await page.waitForSelector('#assistant-card', { state: 'visible', timeout: 30000 });
    await page.getByRole('button', { name: 'Voir l’analyse' }).click();
    await expect(page.locator('#assistant-details')).toBeVisible();
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

test.describe('Dashboard visual hierarchy', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://127.0.0.1:5180/#section-dashboard');
    await page.waitForSelector('#loginDemoBtn', { state: 'visible', timeout: 15000 });
    await page.click('#loginDemoBtn');
    await page.waitForURL('**/#section-dashboard', { timeout: 20000 });
    await page.waitForSelector('#dashboard-coach-card .dashboard-coach-content', {
      state: 'visible',
      timeout: 30000
    });
  });

  test('keeps judgment, action and indicators compact and ordered', async ({ page }) => {
    const metrics = await page.evaluate(() => {
      const rect = (selector) => {
        const node = document.querySelector(selector);
        const box = node.getBoundingClientRect();
        return { top: box.top, bottom: box.bottom, height: box.height };
      };
      const status = rect('#nexora-status-bar');
      const priorityAction = rect('#dashboard-coach-action');

      return {
        width: window.innerWidth,
        overflowX: document.documentElement.scrollWidth > window.innerWidth,
        header: rect('.dashboard-clean-header'),
        core: rect('#nexora-core-panel'),
        coach: rect('#dashboard-coach-card'),
        indicators: rect('.dashboard-secondary-kpis'),
        statusOverlap: Math.max(
          0,
          Math.min(status.bottom, priorityAction.bottom) - Math.max(status.top, priorityAction.top)
        )
      };
    });

    expect(metrics.overflowX).toBeFalsy();
    expect(metrics.header.height).toBeLessThanOrEqual(70);
    expect(metrics.core.height).toBeLessThanOrEqual(metrics.width <= 719 ? 380 : 300);
    expect(metrics.core.bottom).toBeLessThan(metrics.coach.top);
    expect(metrics.coach.bottom).toBeLessThan(metrics.indicators.top);
    if (metrics.width <= 480) expect(metrics.statusOverlap).toBe(0);

    for (const selector of ['#nexora-core-primary-cta', '#dashboard-coach-action']) {
      const action = page.locator(selector);
      await action.focus();
      await page.keyboard.press('Tab');
      await page.keyboard.press('Shift+Tab');
      await expect(action).toBeFocused();
      const outlineWidth = await action.evaluate((node) => parseFloat(getComputedStyle(node).outlineWidth));
      expect(outlineWidth).toBeGreaterThanOrEqual(2);
    }
  });
});
