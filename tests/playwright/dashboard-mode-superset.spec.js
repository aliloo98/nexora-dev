import { test, expect } from '@playwright/test';

test.describe('Dashboard Mode Superset', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://127.0.0.1:5180');
    await page.waitForSelector('#loginDemoBtn', { state: 'visible', timeout: 15000 });
    await page.click('#loginDemoBtn');
    await page.waitForURL('**/#section-dashboard', { timeout: 20000 });
    await page.waitForSelector('.cockpit-hero-v4', { state: 'visible', timeout: 30000 });
  });

  test('mode simplifié displays simple cards and hides advanced KPIs', async ({ page }) => {
    // Switch to simple mode
    await page.evaluate(() => window.setNexoraUxMode('simple'));
    await expect(page.locator('body')).toHaveClass(/mode-simple/);

    // Verify essential elements are visible in simple mode
    await expect(page.locator('.cockpit-hero-v4')).toBeVisible();
    await expect(page.locator('#dashboard-coach-card')).toBeVisible();

    // Verify complete mode zone is hidden
    await expect(page.locator('.cockpit-complete-zone')).not.toBeVisible();
  });

  test('mode complet displays advanced KPIs and hides simple cards', async ({ page }) => {
    // Switch to complete mode
    await page.evaluate(() => window.setNexoraUxMode('complete'));
    await expect(page.locator('body')).toHaveClass(/mode-complet/);

    // Verify advanced elements in complete zone are visible
    await expect(page.locator('.cockpit-complete-zone')).toBeVisible();
  });

  test('mode complet displays all advanced elements not present in simple mode', async ({ page }) => {
    // Switch to complete mode
    await page.evaluate(() => window.setNexoraUxMode('complete'));
    await expect(page.locator('body')).toHaveClass(/mode-complet/);

    // Verify both hero and complete zone are visible
    await expect(page.locator('.cockpit-hero-v4')).toBeVisible();
    await expect(page.locator('#dashboard-coach-card')).toBeVisible();
    await expect(page.locator('.cockpit-complete-zone')).toBeVisible();
  });

  test('mode simplifié hides advanced elements but keeps essential information', async ({ page }) => {
    // Switch to simple mode
    await page.evaluate(() => window.setNexoraUxMode('simple'));
    await expect(page.locator('body')).toHaveClass(/mode-simple/);

    // Verify essential elements are visible in simple mode
    await expect(page.locator('.cockpit-hero-v4')).toBeVisible();
    await expect(page.locator('#dashboard-coach-card')).toBeVisible();

    // Verify complete zone is hidden
    await expect(page.locator('.cockpit-complete-zone')).not.toBeVisible();
  });

  test('mode toggle correctly switches between simple and complete views', async ({ page }) => {
    // Start in simple mode
    await page.evaluate(() => window.setNexoraUxMode('simple'));
    await expect(page.locator('body')).toHaveClass(/mode-simple/);
    await expect(page.locator('.cockpit-complete-zone')).not.toBeVisible();

    // Switch to complete mode
    await page.evaluate(() => window.setNexoraUxMode('complete'));
    await expect(page.locator('body')).toHaveClass(/mode-complet/);
    await expect(page.locator('.cockpit-complete-zone')).toBeVisible();

    // Switch back to simple mode
    await page.evaluate(() => window.setNexoraUxMode('simple'));
    await expect(page.locator('body')).toHaveClass(/mode-simple/);
    await expect(page.locator('.cockpit-complete-zone')).not.toBeVisible();
  });
});
