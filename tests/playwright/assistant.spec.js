/**
 * Playwright E2E tests (requires Playwright to be installed locally)
 * Run with: npx playwright test tests/playwright
 */
import { test, expect } from '@playwright/test';

test.describe('Assistant E2E', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://127.0.0.1:5180/#section-dashboard');
    await page.waitForSelector('#loginDemoBtn', { state: 'visible', timeout: 15000 });
    await page.click('#loginDemoBtn');
    await page.waitForURL('**/#section-dashboard', { timeout: 20000 });
    await page.waitForSelector('#assistant-card', { state: 'visible', timeout: 30000 });
    await page.getByRole('button', { name: 'Voir l’analyse' }).click();
    await expect(page.locator('#assistant-details')).toBeVisible();
  });

  test('assistant visible and KPIs', async ({ page }) => {
    await page.waitForSelector('#assistant-card', { state: 'visible', timeout: 30000 });
    await expect(page.locator('#assistant-kpis-grid')).toBeVisible();
    await expect(page.locator('#assistant-forecast-grid .forecast-card')).toHaveCount(4);
  });

  test('charts visible and no horizontal overflow', async ({ page }) => {
    await page.waitForSelector('.chart-card', { state: 'visible', timeout: 30000 });
    await expect(page.locator('.chart-card').first()).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    expect(overflow).toBeFalsy();
  });
});

test.describe('Dashboard visual hierarchy', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://127.0.0.1:5180/#section-dashboard');
    await page.waitForSelector('#loginDemoBtn', { state: 'visible', timeout: 15000 });
    await page.click('#loginDemoBtn');
    await page.waitForURL('**/#section-dashboard', { timeout: 20000 });
    await page.waitForSelector('#dashboard-coach-card .dashboard-coach-content', {
      state: 'visible',
      timeout: 30000
    });
  });

  test('keeps Nexora Core compact inside Quick View', async ({ page }) => {
    const assertCoreIsSecondary = async (width) => {
      await page.setViewportSize({ width, height: 844 });
      await page.goto('http://127.0.0.1:5180/#section-dashboard');
      await page.waitForSelector('#dashboard-quick-core-host #nexora-core-panel', {
        state: 'visible',
        timeout: 20000
      });
      await page.waitForSelector('.dashboard-primary-kpis', { state: 'visible', timeout: 20000 });

      const layout = await page.evaluate(() => {
        const rect = (selector) => {
          const node = document.querySelector(selector);
          const box = node?.getBoundingClientRect();
          return box ? { top: box.top, bottom: box.bottom, width: box.width, height: box.height } : null;
        };
        const core = document.querySelector('#nexora-core-panel');
        const quickView = document.querySelector('#dashboard-quick-view');
        return {
          core: rect('#nexora-core-panel'),
          coreDisplay: core ? getComputedStyle(core).display : null,
          coreInsideQuickView: Boolean(core && quickView?.contains(core)),
          hero: rect('#dashboard-synthesis-hero'),
          primaryKpis: rect('.dashboard-primary-kpis')
        };
      });

      expect(layout.coreDisplay).toBe('block');
      expect(layout.coreInsideQuickView).toBe(true);
      expect(layout.core.width).toBeGreaterThan(0);
      expect(layout.core.height).toBeGreaterThan(0);
      expect(layout.core.height).toBeLessThanOrEqual(70);
      expect(layout.hero.bottom).toBeLessThan(layout.primaryKpis.top);
    };

    await assertCoreIsSecondary(375);
    await assertCoreIsSecondary(390);
  });

  test('keeps judgment, action and indicators compact and ordered', async ({ page }) => {
    await page.waitForFunction(() => {
      const rect = (selector) => {
        const node = document.querySelector(selector);
        if (!node) return null;
        const box = node.getBoundingClientRect();
        return { top: box.top, bottom: box.bottom, height: box.height };
      };

      const hero = rect('#dashboard-synthesis-hero');
      const primaryKpis = rect('.dashboard-primary-kpis');
      const coach = rect('#dashboard-coach-card');
      const indicators = rect('.dashboard-secondary-kpis');

      return Boolean(
        hero
        && primaryKpis
        && coach
        && indicators
        && hero.bottom < primaryKpis.top
        && primaryKpis.bottom < coach.top
        && coach.bottom < indicators.top
      );
    }, { timeout: 20000 });

    await page.waitForSelector('#dashboard-quick-core-host #nexora-core-panel', {
      state: 'visible',
      timeout: 20000
    });
    await page.waitForSelector('#dashboard-coach-card', { state: 'visible', timeout: 20000 });
    await page.waitForSelector('#dashboard-alerts-card', { state: 'visible', timeout: 20000 });
    await page.waitForSelector('.dashboard-secondary-kpis', { state: 'visible', timeout: 20000 });

    const metrics = await page.evaluate(() => {
      const rect = (selector) => {
        const node = document.querySelector(selector);
        if (!node) return null;
        const box = node.getBoundingClientRect();
        return { top: box.top, bottom: box.bottom, height: box.height };
      };
      const status = rect('#nexora-status-bar');
      const priorityAction = rect('#dashboard-coach-action');
      const core = document.querySelector('#nexora-core-panel');
      const indicators = document.querySelector('.dashboard-secondary-kpis');
      const assistant = document.querySelector('#assistant-card');

      return {
        width: window.innerWidth,
        overflowX: document.documentElement.scrollWidth > window.innerWidth,
        header: rect('.dashboard-clean-header'),
        hero: rect('#dashboard-synthesis-hero'),
        primaryKpis: rect('.dashboard-primary-kpis'),
        core: rect('#nexora-core-panel'),
        coreDisplay: getComputedStyle(core).display,
        coreInsideIndicators: Boolean(core && indicators?.contains(core)),
        assistantInsideIndicators: Boolean(assistant && indicators?.contains(assistant)),
        coach: rect('#dashboard-coach-card'),
        alerts: rect('#dashboard-alerts-card'),
        indicators: rect('.dashboard-secondary-kpis'),
        statusOverlap: status && priorityAction ? Math.max(
          0,
          Math.min(status.bottom, priorityAction.bottom) - Math.max(status.top, priorityAction.top)
        ) : 0
      };
    });

    expect(metrics.overflowX).toBeFalsy();
    expect(metrics.header.height).toBeLessThanOrEqual(70);
    expect(metrics.coreDisplay).toBe('block');
    expect(metrics.coreInsideIndicators).toBe(true);
    expect(metrics.assistantInsideIndicators).toBe(true);
    expect(metrics.core.height).toBeGreaterThan(0);
    expect(metrics.core.height).toBeLessThanOrEqual(70);
    expect(metrics.hero.bottom).toBeLessThan(metrics.primaryKpis.top);
    expect(metrics.primaryKpis.bottom).toBeLessThan(metrics.coach.top);
    expect(metrics.coach.bottom).toBeLessThan(metrics.indicators.top);
    if (metrics.width > 980) expect(metrics.alerts.top).toBe(metrics.indicators.top);
    else expect(metrics.alerts.bottom).toBeLessThan(metrics.indicators.top);
    if (metrics.width <= 480) expect(metrics.statusOverlap).toBe(0);

    const coachActionVisible = await page.isVisible('#dashboard-coach-action');
    const emptyActionVisible = await page.isVisible('#dashboard-empty-action');
    expect(coachActionVisible || emptyActionVisible).toBe(true);
    expect(Number(coachActionVisible) + Number(emptyActionVisible)).toBe(1);

    const coreAction = page.locator('#dashboard-quick-core-host #nexora-core-primary-cta');
    await expect(coreAction).toHaveCount(1);
    await expect(coreAction).toBeVisible();

    const dashboardActionSelector = coachActionVisible ? '#dashboard-coach-action' : '#dashboard-empty-action';
    const dashboardAction = page.locator(dashboardActionSelector);
    await expect(dashboardAction).toBeVisible({ timeout: 15000 });
    await dashboardAction.focus();
    await expect.poll(async () => dashboardAction.evaluate((node) => document.activeElement === node)).toBe(true);
    const dashboardOutlineWidth = await dashboardAction.evaluate((node) => parseFloat(getComputedStyle(node).outlineWidth));
    expect(dashboardOutlineWidth).toBeGreaterThanOrEqual(2);
  });
});

test.describe('Premium application coherence', () => {
  test('keeps every product surface coherent at the five target widths', async ({ page }) => {
    test.setTimeout(90000);

    await page.goto('http://127.0.0.1:5180/');
    await page.waitForSelector('#loginDemoBtn', { state: 'visible', timeout: 15000 });
    await page.click('#loginDemoBtn');
    await page.waitForURL('**/#section-dashboard', { timeout: 20000 });

    const targetWidths = [375, 390, 768, 1024, 1440];
    const navSections = ['saisie', 'plan', 'nexora', 'parametres'];
    const linkedSections = ['objectifs', 'dettes', 'historique'];
    const visibleLinkedSections = ['objectifs', 'dettes', 'historique'];

    const waitForSectionReady = async (section) => {
      const activeSection = page.locator(`#section-${section}`);
      const navButton = page.locator(`.nav-btn[data-section="${section}"]`);

      if (await navButton.count()) {
        await expect(navButton.first()).toBeVisible({ timeout: 30000 });
        await navButton.first().click();
      } else {
        await page.goto(`http://127.0.0.1:5180/#section-${section}`);
      }

      await page.waitForFunction((sectionId) => {
        const sectionNode = document.getElementById(`section-${sectionId}`);
        const navButtonNode = document.querySelector(`.nav-btn[data-section="${sectionId}"]`);
        const hashMatches = window.location.hash === `#section-${sectionId}`;
        return Boolean(
          sectionNode &&
          !sectionNode.hidden &&
          getComputedStyle(sectionNode).display !== 'none' &&
          ((sectionNode.classList.contains('active') && (!navButtonNode || navButtonNode.classList.contains('active'))) || hashMatches)
        );
      }, section, { timeout: 30000 });
      await expect(activeSection).toHaveClass(/active/);
      return activeSection;
    };

    const assertSectionLayout = async (section) => {
      const activeSection = await waitForSectionReady(section);
      await page.evaluate(() => window.scrollTo(0, 0));

      const layout = await activeSection.evaluate((node) => ({
        documentOverflow: document.documentElement.scrollWidth > window.innerWidth,
        sectionOverflow: node.scrollWidth > node.clientWidth + 1,
        width: window.innerWidth
      }));

      expect(layout.documentOverflow, `${section} overflows at ${layout.width}px`).toBeFalsy();
      expect(layout.sectionOverflow, `${section} section overflows at ${layout.width}px`).toBeFalsy();
    };

    for (const width of targetWidths) {
      await page.setViewportSize({ width, height: width <= 390 ? 844 : 1000 });
      await page.goto('http://127.0.0.1:5180/#section-dashboard');

      for (const section of navSections) {
        await assertSectionLayout(section);
      }

      for (const section of visibleLinkedSections) {
        await page.goto(`http://127.0.0.1:5180/#section-${section}`);
        await assertSectionLayout(section);
      }
    }

    await expect(page.locator('#section-objectifs .premium-field')).toHaveCount(6);
    await page.goto('http://127.0.0.1:5180/#section-dettes');
    await expect(page.locator('#section-dettes .premium-field')).toHaveCount(5);
    await page.goto('http://127.0.0.1:5180/#section-plan');
    await expect(page.locator('#section-plan .plan-create-form .premium-field')).toHaveCount(5);

    await page.goto('http://127.0.0.1:5180/#section-historique');
    const emptyHistory = page.locator('#history-grid > p:only-child');
    await expect(emptyHistory).toBeVisible();
    expect(await emptyHistory.evaluate((node) => node.getBoundingClientRect().height)).toBeGreaterThanOrEqual(180);

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('http://127.0.0.1:5180/#section-parametres');
    const resetButton = page.getByRole('button', { name: 'Réinitialiser', exact: true });
    await resetButton.scrollIntoViewIfNeeded();
    await resetButton.click();
    const modal = page.locator('#custom-modal .modal-card');
    await expect(modal).toBeVisible();
    const modalBox = await modal.boundingBox();
    expect(modalBox?.width).toBeLessThanOrEqual(390 - 28);
    await page.locator('#custom-modal .modal-close').focus();
    await expect(page.locator('#custom-modal .modal-close')).toBeFocused();
    expect(await page.locator('#custom-modal .modal-close').evaluate((node) => parseFloat(getComputedStyle(node).outlineWidth))).toBeGreaterThanOrEqual(2);
    await page.locator('#modal-btn-cancel').click();
  });
});
