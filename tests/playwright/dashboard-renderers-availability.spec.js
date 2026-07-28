import { test, expect } from '@playwright/test';

test.describe('Dashboard V2 Renderers Bridge Fix', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test.beforeEach(async ({ page }) => {
    await page.goto('http://127.0.0.1:5180/');
    await page.waitForSelector('#loginDemoBtn', { state: 'visible', timeout: 15000 });
    await page.click('#loginDemoBtn');
    await page.waitForURL('**/#section-dashboard', { timeout: 20000 });
    await page.waitForSelector('#dashboard-synthesis-hero', { state: 'visible', timeout: 10000 });
  });

  test('all 4 dashboard V2 renderers are exposed on window', async ({ page }) => {
    const renderers = await page.evaluate(() => ({
      goalCard: typeof window.renderDashboardGoalCard === 'function',
      kpiStrip: typeof window.renderDashboardKpiStrip === 'function',
      quickView: typeof window.renderDashboardQuickView === 'function',
      alerts: typeof window.renderDashboardAlerts === 'function'
    }));
    expect(renderers.goalCard).toBe(true);
    expect(renderers.kpiStrip).toBe(true);
    expect(renderers.quickView).toBe(true);
    expect(renderers.alerts).toBe(true);
  });

  test('Goal card and Alerts card are not empty containers', async ({ page }) => {
    const goalCard = page.locator('#dashboard-primary-goal');
    const alertsCard = page.locator('#dashboard-alerts-card');
    
    await expect(goalCard).toBeVisible();
    await expect(alertsCard).toBeVisible();
    
    const goalText = await goalCard.innerText();
    const alertsText = await alertsCard.innerText();
    
    expect(goalText.trim().length).toBeGreaterThan(0);
    expect(alertsText.trim().length).toBeGreaterThan(0);
  });
});
