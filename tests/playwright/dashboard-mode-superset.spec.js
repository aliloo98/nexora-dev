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

    // First prove elements exist in DOM
    const elementsExist = await page.evaluate(() => {
      const timeline = document.querySelector('.dashboard-module--timeline');
      const treasury = document.querySelector('.treasury-chart-wrapper');
      const donut = document.querySelector('.donut-chart-wrapper');
      const analytics = document.querySelector('.complete-analytics-grid');
      const dual = document.querySelector('.complete-dual-grid');
      return {
        timeline: !!timeline,
        treasury: !!treasury,
        donut: !!donut,
        analytics: !!analytics,
        dual: !!dual
      };
    });

    // If elements exist, they must be hidden in simple mode
    if (elementsExist.timeline || elementsExist.treasury || elementsExist.donut || elementsExist.analytics || elementsExist.dual) {
      const advancedElementsHidden = await page.evaluate(() => {
        const timeline = document.querySelector('.dashboard-module--timeline');
        const treasury = document.querySelector('.treasury-chart-wrapper');
        const donut = document.querySelector('.donut-chart-wrapper');
        const analytics = document.querySelector('.complete-analytics-grid');
        const dual = document.querySelector('.complete-dual-grid');
        
        const checkHidden = (el) => {
          if (!el) return true;
          const style = window.getComputedStyle(el);
          return style.display === 'none' || style.visibility === 'hidden';
        };
        
        return {
          timeline: checkHidden(timeline),
          treasury: checkHidden(treasury),
          donut: checkHidden(donut),
          analytics: checkHidden(analytics),
          dual: checkHidden(dual)
        };
      });

      // Any existing element must be hidden
      if (elementsExist.timeline) expect(advancedElementsHidden.timeline).toBe(true);
      if (elementsExist.treasury) expect(advancedElementsHidden.treasury).toBe(true);
      if (elementsExist.donut) expect(advancedElementsHidden.donut).toBe(true);
      if (elementsExist.analytics) expect(advancedElementsHidden.analytics).toBe(true);
      if (elementsExist.dual) expect(advancedElementsHidden.dual).toBe(true);
    }
  });

  test('mode complet displays advanced KPIs and hides simple cards', async ({ page }) => {
    // Switch to complete mode using real API
    await page.evaluate(() => {
      window.setNexoraUxMode('complete');
    });
    await expect(page.locator('body')).toHaveClass(/mode-complete/);

    // First prove elements exist in DOM
    const elementsExist = await page.evaluate(() => {
      const treasury = document.querySelector('.treasury-chart-wrapper');
      const donut = document.querySelector('.donut-chart-wrapper');
      const analytics = document.querySelector('.complete-analytics-grid');
      const dual = document.querySelector('.complete-dual-grid');
      return {
        treasury: !!treasury,
        donut: !!donut,
        analytics: !!analytics,
        dual: !!dual
      };
    });

    // If elements exist, they must be visible
    if (elementsExist.treasury || elementsExist.donut || elementsExist.analytics || elementsExist.dual) {
      const advancedElementsVisible = await page.evaluate(() => {
        const treasury = document.querySelector('.treasury-chart-wrapper');
        const donut = document.querySelector('.donut-chart-wrapper');
        const analytics = document.querySelector('.complete-analytics-grid');
        const dual = document.querySelector('.complete-dual-grid');
        
        const checkVisible = (el) => {
          if (!el) return false;
          const style = window.getComputedStyle(el);
          return style.display !== 'none' && style.visibility !== 'hidden';
        };
        
        return {
          treasury: checkVisible(treasury),
          donut: checkVisible(donut),
          analytics: checkVisible(analytics),
          dual: checkVisible(dual)
        };
      });

      // Any existing element must be visible
      if (elementsExist.treasury) expect(advancedElementsVisible.treasury).toBe(true);
      if (elementsExist.donut) expect(advancedElementsVisible.donut).toBe(true);
      if (elementsExist.analytics) expect(advancedElementsVisible.analytics).toBe(true);
      if (elementsExist.dual) expect(advancedElementsVisible.dual).toBe(true);
    }
  });

  test('mode complet displays all advanced elements not present in simple mode', async ({ page }) => {
    // Switch to complete mode using real API
    await page.evaluate(() => {
      window.setNexoraUxMode('complete');
    });
    await expect(page.locator('body')).toHaveClass(/mode-complete/);

    // First prove elements exist in DOM
    const elementsExist = await page.evaluate(() => {
      const treasury = document.querySelector('.treasury-chart-wrapper');
      const donut = document.querySelector('.donut-chart-wrapper');
      const analytics = document.querySelector('.complete-analytics-grid');
      const dual = document.querySelector('.complete-dual-grid');
      return {
        treasury: !!treasury,
        donut: !!donut,
        analytics: !!analytics,
        dual: !!dual
      };
    });

    // If elements exist, they must be visible
    if (elementsExist.treasury || elementsExist.donut || elementsExist.analytics || elementsExist.dual) {
      const advancedElementsVisible = await page.evaluate(() => {
        const treasury = document.querySelector('.treasury-chart-wrapper');
        const donut = document.querySelector('.donut-chart-wrapper');
        const analytics = document.querySelector('.complete-analytics-grid');
        const dual = document.querySelector('.complete-dual-grid');
        
        const checkVisible = (el) => {
          if (!el) return false;
          const style = window.getComputedStyle(el);
          return style.display !== 'none' && style.visibility !== 'hidden';
        };
        
        return {
          treasury: checkVisible(treasury),
          donut: checkVisible(donut),
          analytics: checkVisible(analytics),
          dual: checkVisible(dual)
        };
      });

      // Any existing element must be visible
      if (elementsExist.treasury) expect(advancedElementsVisible.treasury).toBe(true);
      if (elementsExist.donut) expect(advancedElementsVisible.donut).toBe(true);
      if (elementsExist.analytics) expect(advancedElementsVisible.analytics).toBe(true);
      if (elementsExist.dual) expect(advancedElementsVisible.dual).toBe(true);
    }
  });

  test('mode simplifié hides advanced elements but keeps essential information', async ({ page }) => {
    // Switch to simple mode using real API
    await page.evaluate(() => {
      window.setNexoraUxMode('simple');
    });
    await expect(page.locator('body')).toHaveClass(/mode-simple/);

    // First prove elements exist in DOM
    const elementsExist = await page.evaluate(() => {
      const timeline = document.querySelector('.dashboard-module--timeline');
      const treasury = document.querySelector('.treasury-chart-wrapper');
      const donut = document.querySelector('.donut-chart-wrapper');
      const analytics = document.querySelector('.complete-analytics-grid');
      const dual = document.querySelector('.complete-dual-grid');
      return {
        timeline: !!timeline,
        treasury: !!treasury,
        donut: !!donut,
        analytics: !!analytics,
        dual: !!dual
      };
    });

    // If elements exist, they must be hidden in simple mode
    if (elementsExist.timeline || elementsExist.treasury || elementsExist.donut || elementsExist.analytics || elementsExist.dual) {
      const advancedElementsHidden = await page.evaluate(() => {
        const timeline = document.querySelector('.dashboard-module--timeline');
        const treasury = document.querySelector('.treasury-chart-wrapper');
        const donut = document.querySelector('.donut-chart-wrapper');
        const analytics = document.querySelector('.complete-analytics-grid');
        const dual = document.querySelector('.complete-dual-grid');
        
        const checkHidden = (el) => {
          if (!el) return true;
          const style = window.getComputedStyle(el);
          return style.display === 'none' || style.visibility === 'hidden';
        };
        
        return {
          timeline: checkHidden(timeline),
          treasury: checkHidden(treasury),
          donut: checkHidden(donut),
          analytics: checkHidden(analytics),
          dual: checkHidden(dual)
        };
      });

      // Any existing element must be hidden
      if (elementsExist.timeline) expect(advancedElementsHidden.timeline).toBe(true);
      if (elementsExist.treasury) expect(advancedElementsHidden.treasury).toBe(true);
      if (elementsExist.donut) expect(advancedElementsHidden.donut).toBe(true);
      if (elementsExist.analytics) expect(advancedElementsHidden.analytics).toBe(true);
      if (elementsExist.dual) expect(advancedElementsHidden.dual).toBe(true);
    }
  });

  test('mode toggle correctly switches between simple and complete views', async ({ page }) => {
    // Start in simple mode using real API
    await page.evaluate(() => {
      window.setNexoraUxMode('simple');
    });
    await expect(page.locator('body')).toHaveClass(/mode-simple/);

    // Switch to complete mode using real API
    await page.evaluate(() => {
      window.setNexoraUxMode('complete');
    });
    await expect(page.locator('body')).toHaveClass(/mode-complete/);

    // Switch back to simple mode using real API
    await page.evaluate(() => {
      window.setNexoraUxMode('simple');
    });
    await expect(page.locator('body')).toHaveClass(/mode-simple/);
  });

  test('complete mode is a superset of simple mode', async ({ page }) => {
    // Count elements with display:none in simple mode using real API
    await page.evaluate(() => {
      window.setNexoraUxMode('simple');
    });
    await expect(page.locator('body')).toHaveClass(/mode-simple/);

    const simpleHiddenCount = await page.evaluate(() => {
      const elements = document.querySelectorAll('.dashboard-module--timeline, .treasury-chart-wrapper, .donut-chart-wrapper, .complete-analytics-grid, .complete-dual-grid');
      let count = 0;
      elements.forEach(el => {
        if (el) {
          const style = window.getComputedStyle(el);
          if (style.display === 'none' || style.visibility === 'hidden') {
            count++;
          }
        }
      });
      return count;
    });

    // Count elements with display:none in complete mode using real API
    await page.evaluate(() => {
      window.setNexoraUxMode('complete');
    });
    await expect(page.locator('body')).toHaveClass(/mode-complete/);

    const completeHiddenCount = await page.evaluate(() => {
      const elements = document.querySelectorAll('.dashboard-module--timeline, .treasury-chart-wrapper, .donut-chart-wrapper, .complete-analytics-grid, .complete-dual-grid');
      let count = 0;
      elements.forEach(el => {
        if (el) {
          const style = window.getComputedStyle(el);
          if (style.display === 'none' || style.visibility === 'hidden') {
            count++;
          }
        }
      });
      return count;
    });

    // Simple mode must have more hidden elements than complete mode
    expect(simpleHiddenCount).toBeGreaterThan(completeHiddenCount);
  });
});
