import { test, expect } from '@playwright/test';

test.describe('Dashboard V2 Renderers Bridge Fix', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5180/');
    await page.waitForSelector('#loginDemoBtn', { state: 'visible', timeout: 15000 });
    await page.click('#loginDemoBtn');
    await page.waitForURL('**/#section-dashboard', { timeout: 20000 });
    await page.waitForSelector('.dashboard-v2-modular', { state: 'visible', timeout: 10000 });
  });

  test('all 4 dashboard V2 renderers are exposed on window', async ({ page }) => {
    const renderers = await page.evaluate(() => ({
      hero: typeof window.renderDashboardHero === 'function',
      goalCard: typeof window.renderDashboardGoalCard === 'function',
      coachCard: typeof window.renderDashboardCoach === 'function',
      kpiStrip: typeof window.renderDashboardKpiStrip === 'function'
    }));
    expect(renderers.hero).toBe(true);
    expect(renderers.goalCard).toBe(true);
    expect(renderers.coachCard).toBe(true);
    expect(renderers.kpiStrip).toBe(true);
  });

  test('Goal card is not an empty container', async ({ page }) => {
    const goalModule = page.locator('.dashboard-module--goal');
    await expect(goalModule).toBeVisible();
    
    const goalText = await goalModule.locator('#goal-progress-root').innerText();
    expect(goalText.trim().length).toBeGreaterThan(0);
  });
});
