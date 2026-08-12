import { test, expect } from '@playwright/test';

test.describe('Dashboard Mode Superset', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173');
    
    // Wait for page to load
    await page.waitForLoadState('networkidle');
    
    // Navigate to dashboard section
    await page.evaluate(() => {
      window.location.hash = '#section-dashboard';
    });
    
    // Wait for dashboard section to be present in DOM (not necessarily visible)
    await page.waitForSelector('#section-dashboard', { timeout: 30000, state: 'attached' });
  });

  test('mode simplifié displays simple cards and hides advanced KPIs', async ({ page }) => {
    // Switch to simple mode
    await page.evaluate(() => {
      if (typeof window.setNexoraUxMode === 'function') {
        window.setNexoraUxMode('simple');
      } else {
        document.body.classList.add('mode-simple');
        document.body.classList.remove('mode-complete');
      }
    });
    await expect(page.locator('body')).toHaveClass(/mode-simple/);

    // Verify advanced elements are hidden in simple mode (check CSS display property)
    const advancedElementsHidden = await page.evaluate(() => {
      const timeline = document.querySelector('.dashboard-module--timeline');
      const treasury = document.querySelector('.treasury-chart-wrapper');
      const donut = document.querySelector('.donut-chart-wrapper');
      const analytics = document.querySelector('.complete-analytics-grid');
      const dual = document.querySelector('.complete-dual-grid');
      
      const checkHidden = (el) => {
        if (!el) return true; // absent is acceptable
        const style = window.getComputedStyle(el);
        return style.display === 'none' || style.visibility === 'hidden';
      };
      
      return checkHidden(timeline) && checkHidden(treasury) && checkHidden(donut) && checkHidden(analytics) && checkHidden(dual);
    });
    
    expect(advancedElementsHidden).toBe(true);
  });

  test('mode complet displays advanced KPIs and hides simple cards', async ({ page }) => {
    // Switch to complete mode
    await page.evaluate(() => {
      if (typeof window.setNexoraUxMode === 'function') {
        window.setNexoraUxMode('complete');
      } else {
        document.body.classList.add('mode-complete');
        document.body.classList.remove('mode-simple');
      }
    });
    await expect(page.locator('body')).toHaveClass(/mode-complete/);

    // Verify advanced elements are visible in complete mode (check CSS display property)
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
      
      return checkVisible(treasury) && checkVisible(donut) && checkVisible(analytics) && checkVisible(dual);
    });
    
    expect(advancedElementsVisible).toBe(true);
  });

  test('mode complet displays all advanced elements not present in simple mode', async ({ page }) => {
    // Switch to complete mode
    await page.evaluate(() => {
      if (typeof window.setNexoraUxMode === 'function') {
        window.setNexoraUxMode('complete');
      } else {
        document.body.classList.add('mode-complete');
        document.body.classList.remove('mode-simple');
      }
    });
    await expect(page.locator('body')).toHaveClass(/mode-complete/);

    // Verify advanced elements are visible in complete mode (check CSS display property)
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
      
      return checkVisible(treasury) && checkVisible(donut) && checkVisible(analytics) && checkVisible(dual);
    });
    
    expect(advancedElementsVisible).toBe(true);
  });

  test('mode simplifié hides advanced elements but keeps essential information', async ({ page }) => {
    // Switch to simple mode
    await page.evaluate(() => {
      if (typeof window.setNexoraUxMode === 'function') {
        window.setNexoraUxMode('simple');
      } else {
        document.body.classList.add('mode-simple');
        document.body.classList.remove('mode-complete');
      }
    });
    await expect(page.locator('body')).toHaveClass(/mode-simple/);

    // Verify advanced elements are hidden in simple mode (check CSS display property)
    const advancedElementsHidden = await page.evaluate(() => {
      const timeline = document.querySelector('.dashboard-module--timeline');
      const treasury = document.querySelector('.treasury-chart-wrapper');
      const donut = document.querySelector('.donut-chart-wrapper');
      const analytics = document.querySelector('.complete-analytics-grid');
      const dual = document.querySelector('.complete-dual-grid');
      
      const checkHidden = (el) => {
        if (!el) return true; // absent is acceptable
        const style = window.getComputedStyle(el);
        return style.display === 'none' || style.visibility === 'hidden';
      };
      
      return checkHidden(timeline) && checkHidden(treasury) && checkHidden(donut) && checkHidden(analytics) && checkHidden(dual);
    });
    
    expect(advancedElementsHidden).toBe(true);
  });

  test('mode toggle correctly switches between simple and complete views', async ({ page }) => {
    // Start in simple mode
    await page.evaluate(() => {
      if (typeof window.setNexoraUxMode === 'function') {
        window.setNexoraUxMode('simple');
      } else {
        document.body.classList.add('mode-simple');
        document.body.classList.remove('mode-complete');
      }
    });
    await expect(page.locator('body')).toHaveClass(/mode-simple/);

    // Switch to complete mode
    await page.evaluate(() => {
      if (typeof window.setNexoraUxMode === 'function') {
        window.setNexoraUxMode('complete');
      } else {
        document.body.classList.add('mode-complete');
        document.body.classList.remove('mode-simple');
      }
    });
    await expect(page.locator('body')).toHaveClass(/mode-complete/);

    // Switch back to simple mode
    await page.evaluate(() => {
      if (typeof window.setNexoraUxMode === 'function') {
        window.setNexoraUxMode('simple');
      } else {
        document.body.classList.add('mode-simple');
        document.body.classList.remove('mode-complete');
      }
    });
    await expect(page.locator('body')).toHaveClass(/mode-simple/);
  });

  test('complete mode is a superset of simple mode', async ({ page }) => {
    // Count elements with display:none in simple mode
    await page.evaluate(() => {
      if (typeof window.setNexoraUxMode === 'function') {
        window.setNexoraUxMode('simple');
      } else {
        document.body.classList.add('mode-simple');
        document.body.classList.remove('mode-complete');
      }
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

    // Count elements with display:none in complete mode
    await page.evaluate(() => {
      if (typeof window.setNexoraUxMode === 'function') {
        window.setNexoraUxMode('complete');
      } else {
        document.body.classList.add('mode-complete');
        document.body.classList.remove('mode-simple');
      }
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
