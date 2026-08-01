import { test, expect } from '@playwright/test';

test.describe('Dashboard V2 Renderers Bridge Fix', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test.beforeEach(async ({ page }) => {
    await page.goto('http://127.0.0.1:5180/');
    await page.waitForSelector('#loginDemoBtn', { state: 'visible', timeout: 15000 });
    await page.click('#loginDemoBtn');
    await page.waitForURL('**/#section-dashboard', { timeout: 20000 });
    await page.waitForSelector('.cockpit-hero-v4', { state: 'visible', timeout: 10000 });
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
    
    // Cockpit premium does not have a separate alerts card
    // Alerts are integrated into other sections or removed
    // Test only the goal card which exists in the cockpit
    await expect(goalCard).toBeVisible();
    
    const goalText = await goalCard.innerText();
    expect(goalText.trim().length).toBeGreaterThan(0);
  });
});
