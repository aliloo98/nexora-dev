import { test, expect } from '@playwright/test';

test.describe('Dashboard Empty Elements Regression', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test.beforeEach(async ({ page }) => {
    await page.goto('http://127.0.0.1:5180/');
    await page.waitForSelector('#loginDemoBtn', { state: 'visible', timeout: 15000 });
    await page.click('#loginDemoBtn');
    await page.waitForURL('**/#section-dashboard', { timeout: 20000 });
    await page.waitForSelector('.dashboard-v2-modular', { state: 'visible', timeout: 10000 });
  });

  test('no visible empty dashboard panels should exist', async ({ page }) => {
    const panels = await page.evaluate(() => {
      const panels = document.querySelectorAll('.dashboard-module');
      return Array.from(panels).map(panel => ({
        id: panel.id,
        className: panel.className,
        tagName: panel.tagName,
        rect: panel.getBoundingClientRect(),
        computed: {
          display: window.getComputedStyle(panel).display,
          visibility: window.getComputedStyle(panel).visibility,
          height: window.getComputedStyle(panel).height,
          minHeight: window.getComputedStyle(panel).minHeight,
          background: window.getComputedStyle(panel).background,
          border: window.getComputedStyle(panel).border,
          borderRadius: window.getComputedStyle(panel).borderRadius
        },
        textContent: panel.textContent?.trim().substring(0, 100),
        hasChildren: panel.children.length > 0,
        childCount: panel.children.length
      }));
    });
    
    // Find panels that are visible but empty
    const emptyPanels = panels.filter(p => 
      p.rect.width > 0 && 
      p.rect.height > 50 && 
      p.computed.visibility !== 'hidden' &&
      p.computed.display !== 'none' &&
      (!p.textContent || p.textContent.trim().length < 10)
    );
    
    expect(emptyPanels.length).toBe(0);
  });

  test('coach module should be visible on dashboard', async ({ page }) => {
    const coachModule = page.locator('.dashboard-module--coach');
    await expect(coachModule).toBeVisible();
  });
});
