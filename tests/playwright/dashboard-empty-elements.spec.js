import { test, expect } from '@playwright/test';

test.describe('Dashboard Empty Elements Regression', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test.beforeEach(async ({ page }) => {
    await page.goto('http://127.0.0.1:5180/');
    await page.waitForSelector('#loginDemoBtn', { state: 'visible', timeout: 15000 });
    await page.click('#loginDemoBtn');
    await page.waitForURL('**/#section-dashboard', { timeout: 20000 });
    await page.waitForSelector('#dashboard-synthesis-hero', { state: 'visible', timeout: 10000 });
  });

  test('no visible empty dashboard panels should exist', async ({ page }) => {
    const panels = await page.evaluate(() => {
      const panels = document.querySelectorAll('.dashboard-panel, .dashboard-card, .dashboard-secondary-kpis');
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

  test('coach card should be hidden when dashboard-master-root is empty', async ({ page }) => {
    const coachCard = await page.evaluate(() => {
      const panel = document.getElementById('dashboard-coach-card');
      if (!panel) return null;
      
      const masterRoot = document.getElementById('dashboard-master-root');
      
      return {
        id: panel.id,
        rect: panel.getBoundingClientRect(),
        computed: {
          display: window.getComputedStyle(panel).display,
          visibility: window.getComputedStyle(panel).visibility
        },
        masterRootIsEmpty: !masterRoot || !masterRoot.textContent?.trim() || masterRoot.textContent.trim().length < 5,
        masterRootContent: masterRoot?.textContent?.trim()
      };
    });
    
    expect(coachCard).not.toBeNull();
    
    if (coachCard.masterRootIsEmpty) {
      expect(coachCard.computed.display).toBe('none');
    }
  });

  test('coach card should be visible when dashboard-master-root has content', async ({ page }) => {
    // Inject content into dashboard-master-root
    await page.evaluate(() => {
      const masterRoot = document.getElementById('dashboard-master-root');
      if (masterRoot) {
        masterRoot.innerHTML = '<div class="test-content">Test content</div>';
      }
    });
    
    const coachCard = await page.evaluate(() => {
      const panel = document.getElementById('dashboard-coach-card');
      if (!panel) return null;
      
      const masterRoot = document.getElementById('dashboard-master-root');
      
      return {
        id: panel.id,
        rect: panel.getBoundingClientRect(),
        computed: {
          display: window.getComputedStyle(panel).display,
          visibility: window.getComputedStyle(panel).visibility
        },
        masterRootHasContent: masterRoot && masterRoot.textContent?.trim().length > 0
      };
    });
    
    expect(coachCard).not.toBeNull();
    
    if (coachCard.masterRootHasContent) {
      expect(coachCard.computed.display).not.toBe('none');
    }
    
    // Clean up
    await page.evaluate(() => {
      const masterRoot = document.getElementById('dashboard-master-root');
      if (masterRoot) {
        masterRoot.innerHTML = '';
      }
    });
  });
});
