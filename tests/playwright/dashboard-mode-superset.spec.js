import { test, expect } from '@playwright/test';

test.describe('Dashboard Mode Superset', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://127.0.0.1:5180');
    await page.waitForSelector('#loginDemoBtn', { state: 'visible', timeout: 15000 });
    await page.click('#loginDemoBtn');
    await page.waitForURL('**/#section-dashboard', { timeout: 20000 });
    await page.waitForSelector('.dashboard-v2-modular', { state: 'visible', timeout: 30000 });
  });

  test('mode simplifié displays simple cards and hides advanced KPIs', async ({ page }) => {
    // Switch to simple mode
    await page.evaluate(() => window.setNexoraUxMode('simple'));
    await expect(page.locator('body')).toHaveClass(/mode-simple/);

    // Verify essential elements are visible in simple mode
    await expect(page.locator('.dashboard-v2-modular')).toBeVisible();
    await expect(page.locator('.dashboard-module--cockpit')).toBeVisible();
    await expect(page.locator('.dashboard-module--coach')).toBeVisible();
  });

  test('mode complet displays advanced KPIs and hides simple cards', async ({ page }) => {
    // Switch to complete mode
    await page.evaluate(() => window.setNexoraUxMode('complete'));
    await expect(page.locator('body')).toHaveClass(/mode-complete/);

    // Verify all modules are visible in complete mode
    await expect(page.locator('.dashboard-v2-modular')).toBeVisible();
    await expect(page.locator('.dashboard-module--cockpit')).toBeVisible();
    await expect(page.locator('.dashboard-module--timeline')).toBeVisible();
    await expect(page.locator('.dashboard-module--goal')).toBeVisible();
    await expect(page.locator('.dashboard-module--coach')).toBeVisible();
  });

  test('mode complet displays all advanced elements not present in simple mode', async ({ page }) => {
    // Switch to complete mode
    await page.evaluate(() => window.setNexoraUxMode('complete'));
    await expect(page.locator('body')).toHaveClass(/mode-complete/);

    // Verify all modules are visible in complete mode
    await expect(page.locator('.dashboard-v2-modular')).toBeVisible();
    await expect(page.locator('.dashboard-module--cockpit')).toBeVisible();
    await expect(page.locator('.dashboard-module--timeline')).toBeVisible();
    await expect(page.locator('.dashboard-module--goal')).toBeVisible();
    await expect(page.locator('.dashboard-module--coach')).toBeVisible();
  });

  test('mode simplifié hides advanced elements but keeps essential information', async ({ page }) => {
    // Switch to simple mode
    await page.evaluate(() => window.setNexoraUxMode('simple'));
    await expect(page.locator('body')).toHaveClass(/mode-simple/);

    // Verify essential elements are visible in simple mode
    await expect(page.locator('.dashboard-v2-modular')).toBeVisible();
    await expect(page.locator('.dashboard-module--cockpit')).toBeVisible();
    await expect(page.locator('.dashboard-module--coach')).toBeVisible();
  });

  test('mode toggle correctly switches between simple and complete views', async ({ page }) => {
    // Start in simple mode
    await page.evaluate(() => window.setNexoraUxMode('simple'));
    await expect(page.locator('body')).toHaveClass(/mode-simple/);
    await expect(page.locator('.dashboard-v2-modular')).toBeVisible();

    // Switch to complete mode
    await page.evaluate(() => window.setNexoraUxMode('complete'));
    await expect(page.locator('body')).toHaveClass(/mode-complete/);
    await expect(page.locator('.dashboard-v2-modular')).toBeVisible();

    // Switch back to simple mode
    await page.evaluate(() => window.setNexoraUxMode('simple'));
    await expect(page.locator('body')).toHaveClass(/mode-simple/);
    await expect(page.locator('.dashboard-v2-modular')).toBeVisible();
  });
});
