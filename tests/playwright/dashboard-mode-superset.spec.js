import { test, expect } from '@playwright/test';

test.describe('Dashboard Mode Superset', () => {
  test.beforeEach(async ({ page }) => {
    // Use official test server URL from playwright.config.js
    await page.goto('http://127.0.0.1:5180');
    
    // Wait for page to load
    await page.waitForLoadState('networkidle');
    
    // Perform real demo login
    const loginDemoBtn = page.locator('#loginDemoBtn')
    await expect(loginDemoBtn).toBeVisible()
    await loginDemoBtn.click()
    
    // Wait for navigation to dashboard
    await page.waitForURL('#section-dashboard', { timeout: 30000 })
    
    // Wait for dashboard V2 modular to be visible
    await page.waitForSelector('.dashboard-v2-modular', { timeout: 30000, state: 'visible' })
    
    // Verify setNexoraUxMode exists in runtime
    const hasSetNexoraUxMode = await page.evaluate(() => typeof window.setNexoraUxMode === 'function')
    expect(hasSetNexoraUxMode).toBe(true)
  });

  test('mode simplifié displays simple cards and hides advanced KPIs', async ({ page }) => {
    // Switch to simple mode using real API
    await page.evaluate(() => {
      window.setNexoraUxMode('simple');
    });
    await expect(page.locator('body')).toHaveClass(/mode-simple/);

    // Essential elements must exist and be visible
    const hero = page.locator('#dashboard-hero-root')
    await expect(hero).toHaveCount(1)
    await expect(hero).toBeVisible()

    const goal = page.locator('.dashboard-module--goal')
    await expect(goal).toHaveCount(1)
    await expect(goal).toBeVisible()

    const coach = page.locator('.dashboard-module--coach')
    await expect(coach).toHaveCount(1)
    await expect(coach).toBeVisible()

    // Advanced elements must exist but be hidden
    const timeline = page.locator('.dashboard-module--timeline')
    await expect(timeline).toHaveCount(1)
    await expect(timeline).toBeHidden()

    const treasury = page.locator('.treasury-chart-wrapper')
    await expect(treasury).toHaveCount(1)
    await expect(treasury).toBeHidden()

    const donut = page.locator('.donut-chart-wrapper')
    await expect(donut).toHaveCount(1)
    await expect(donut).toBeHidden()

    const analytics = page.locator('.complete-analytics-grid')
    await expect(analytics).toHaveCount(1)
    await expect(analytics).toBeHidden()

    const dual = page.locator('.complete-dual-grid')
    await expect(dual).toHaveCount(1)
    await expect(dual).toBeHidden()
  });

  test('mode complet displays advanced KPIs and all elements visible', async ({ page }) => {
    // Switch to complete mode using real API
    await page.evaluate(() => {
      window.setNexoraUxMode('complete');
    });
    await expect(page.locator('body')).toHaveClass(/mode-complete/);

    // Essential elements must exist and be visible
    const hero = page.locator('#dashboard-hero-root')
    await expect(hero).toHaveCount(1)
    await expect(hero).toBeVisible()

    const goal = page.locator('.dashboard-module--goal')
    await expect(goal).toHaveCount(1)
    await expect(goal).toBeVisible()

    const coach = page.locator('.dashboard-module--coach')
    await expect(coach).toHaveCount(1)
    await expect(coach).toBeVisible()

    // Advanced elements must exist and be visible
    const timeline = page.locator('.dashboard-module--timeline')
    await expect(timeline).toHaveCount(1)
    await expect(timeline).toBeVisible()

    const treasury = page.locator('.treasury-chart-wrapper')
    await expect(treasury).toHaveCount(1)
    await expect(treasury).toBeVisible()

    const donut = page.locator('.donut-chart-wrapper')
    await expect(donut).toHaveCount(1)
    await expect(donut).toBeVisible()

    const analytics = page.locator('.complete-analytics-grid')
    await expect(analytics).toHaveCount(1)
    await expect(analytics).toBeVisible()

    const dual = page.locator('.complete-dual-grid')
    await expect(dual).toHaveCount(1)
    await expect(dual).toBeVisible()
  });

  test('mode toggle correctly switches between simple and complete views', async ({ page }) => {
    // Start in simple mode using real API
    await page.evaluate(() => {
      window.setNexoraUxMode('simple');
    });
    await expect(page.locator('body')).toHaveClass(/mode-simple/);

    // Verify advanced elements hidden
    await expect(page.locator('.dashboard-module--timeline')).toBeHidden()

    // Switch to complete mode using real API
    await page.evaluate(() => {
      window.setNexoraUxMode('complete');
    });
    await expect(page.locator('body')).toHaveClass(/mode-complete/);

    // Verify advanced elements visible
    await expect(page.locator('.dashboard-module--timeline')).toBeVisible()

    // Switch back to simple mode using real API
    await page.evaluate(() => {
      window.setNexoraUxMode('simple');
    });
    await expect(page.locator('body')).toHaveClass(/mode-simple/);

    // Verify advanced elements hidden again
    await expect(page.locator('.dashboard-module--timeline')).toBeHidden()
  });

  test('complete mode is a strict superset of simple mode', async ({ page }) => {
    // Get visible elements in simple mode
    await page.evaluate(() => {
      window.setNexoraUxMode('simple');
    });
    await expect(page.locator('body')).toHaveClass(/mode-simple/);

    const visibleSimple = await page.evaluate(() => {
      const elements = document.querySelectorAll('.dashboard-module--cockpit, .dashboard-module--timeline, .dashboard-module--goal, .dashboard-module--coach, .treasury-chart-wrapper, .donut-chart-wrapper, .complete-analytics-grid, .complete-dual-grid');
      const visible = [];
      elements.forEach(el => {
        const style = window.getComputedStyle(el);
        if (style.display !== 'none' && style.visibility !== 'hidden' && !el.hidden) {
          visible.push(el.className);
        }
      });
      return visible;
    });

    // Get visible elements in complete mode
    await page.evaluate(() => {
      window.setNexoraUxMode('complete');
    });
    await expect(page.locator('body')).toHaveClass(/mode-complete/);

    const visibleComplete = await page.evaluate(() => {
      const elements = document.querySelectorAll('.dashboard-module--cockpit, .dashboard-module--timeline, .dashboard-module--goal, .dashboard-module--coach, .treasury-chart-wrapper, .donut-chart-wrapper, .complete-analytics-grid, .complete-dual-grid');
      const visible = [];
      elements.forEach(el => {
        const style = window.getComputedStyle(el);
        if (style.display !== 'none' && style.visibility !== 'hidden' && !el.hidden) {
          visible.push(el.className);
        }
      });
      return visible;
    });

    // Prove simple ⊂ complete
    expect(visibleSimple.length).toBeGreaterThan(0);
    expect(visibleComplete.length).toBeGreaterThan(visibleSimple.length);

    // Every element visible in simple must be visible in complete
    visibleSimple.forEach(className => {
      expect(visibleComplete).toContain(className);
    });
  });

  test('mode persists across reload', async ({ page }) => {
    // Set simple mode
    await page.evaluate(() => {
      window.setNexoraUxMode('simple');
    });
    await expect(page.locator('body')).toHaveClass(/mode-simple/);

    // Reload
    await page.reload()
    await page.waitForLoadState('networkidle')
    await page.waitForSelector('.dashboard-v2-modular', { timeout: 30000, state: 'visible' })

    // Verify mode persisted
    const modeAfterReload = await page.evaluate(() => window.getNexoraUxMode())
    expect(modeAfterReload).toBe('simple')
    await expect(page.locator('body')).toHaveClass(/mode-simple/)
    await expect(page.locator('.dashboard-module--timeline')).toBeHidden()

    // Set complete mode
    await page.evaluate(() => {
      window.setNexoraUxMode('complete');
    });
    await expect(page.locator('body')).toHaveClass(/mode-complete/);

    // Reload
    await page.reload()
    await page.waitForLoadState('networkidle')
    await page.waitForSelector('.dashboard-v2-modular', { timeout: 30000, state: 'visible' })

    // Verify mode persisted
    const modeAfterSecondReload = await page.evaluate(() => window.getNexoraUxMode())
    expect(modeAfterSecondReload).toBe('complete')
    await expect(page.locator('body')).toHaveClass(/mode-complete/)
    await expect(page.locator('.dashboard-module--timeline')).toBeVisible()
  });
});
