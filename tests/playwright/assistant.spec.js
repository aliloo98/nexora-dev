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

  test('keeps the mobile Folded Ring free from opaque hidden overlays', async ({ page }) => {
    const assertRingIsClear = async (width) => {
      await page.setViewportSize({ width, height: 844 });
      await page.goto('http://127.0.0.1:5180/#section-dashboard');
      await page.waitForSelector('#nexora-core-panel', { state: 'visible', timeout: 20000 });
      await page.waitForTimeout(500);

      const tooltipDisplay = await page.locator('#nexora-core-tooltip[hidden]').evaluate((node) => getComputedStyle(node).display);
      expect(tooltipDisplay, `hidden tooltip must not render at ${width}px`).toBe('none');

      const blockers = await page.evaluate(() => {
        const ring = document.querySelector('.nexora-core-ring');
        if (!ring) return [{ point: 'ring', selector: 'missing', reason: 'Folded Ring not found' }];

        const rect = ring.getBoundingClientRect();
        const points = [
          { label: 'center', x: 0.5, y: 0.5 },
          { label: 'ten-thirty', x: 0.31, y: 0.18 },
          { label: 'eleven', x: 0.39, y: 0.12 },
          { label: 'inner-left', x: 0.28, y: 0.42 },
          { label: 'inner-right', x: 0.72, y: 0.42 }
        ];

        const allowedSelectors = [
          '.nexora-core-ring',
          '.nexora-core-ring *',
          '.nexora-core-center-data',
          '.nexora-core-center-data *',
          '.nexora-core-graph',
          '.nexora-core-graph *',
          '.nexora-core-globe',
          '.nexora-core-globe-wrap',
          '.nexora-core-stage',
          '.nexora-core-hero',
          '.nexora-core-layout',
          '#nexora-core-panel',
          '#section-dashboard',
          '.main',
          'body',
          'html'
        ];

        const alphaFromColor = (color) => {
          const match = String(color || '').match(/rgba?\(([^)]+)\)/);
          if (!match) return 0;
          const parts = match[1].split(',').map((part) => part.trim());
          return parts.length >= 4 ? Number(parts[3]) || 0 : 1;
        };

        const selectorFor = (node) => {
          if (node.id) return `#${node.id}`;
          const className = typeof node.className === 'string' ? node.className.trim().split(/\s+/).filter(Boolean).join('.') : '';
          return `${node.tagName.toLowerCase()}${className ? `.${className}` : ''}`;
        };

        return points.flatMap((point) => {
          const x = rect.left + rect.width * point.x;
          const y = rect.top + rect.height * point.y;
          return document.elementsFromPoint(x, y).flatMap((node) => {
            const style = getComputedStyle(node);
            if (style.display === 'none' || style.visibility === 'hidden' || Number(style.opacity) === 0) return [];
            if (allowedSelectors.some((selector) => node.matches(selector))) return [];

            const hiddenRendered = node.hasAttribute('hidden');
            const opaquePaint =
              alphaFromColor(style.backgroundColor) >= 0.35 ||
              style.backgroundImage !== 'none' ||
              style.backdropFilter !== 'none' ||
              style.boxShadow !== 'none';

            if (!hiddenRendered && !opaquePaint) return [];

            return [{
              point: point.label,
              selector: selectorFor(node),
              display: style.display,
              opacity: style.opacity,
              backgroundColor: style.backgroundColor,
              backgroundImage: style.backgroundImage,
              zIndex: style.zIndex,
              hidden: hiddenRendered
            }];
          });
        });
      });

      expect(blockers).toEqual([]);
    };

    await assertRingIsClear(375);
    await assertRingIsClear(390);
  });

  test('keeps judgment, action and indicators compact and ordered', async ({ page }) => {
    await page.waitForFunction(() => {
      const rect = (selector) => {
        const node = document.querySelector(selector);
        if (!node) return null;
        const box = node.getBoundingClientRect();
        return { top: box.top, bottom: box.bottom, height: box.height };
      };

      const core = rect('#nexora-core-panel');
      const coach = rect('#dashboard-coach-card');
      const indicators = rect('.dashboard-secondary-kpis');

      return Boolean(core && coach && indicators && core.bottom < coach.top && coach.bottom < indicators.top);
    }, { timeout: 20000 });

    await page.waitForSelector('#nexora-core-panel, #dashboard-coach-card, .dashboard-secondary-kpis, #nexora-status-bar, #dashboard-coach-action', { state: 'visible', timeout: 20000 });

    const metrics = await page.evaluate(() => {
      const rect = (selector) => {
        const node = document.querySelector(selector);
        if (!node) return null;
        const box = node.getBoundingClientRect();
        return { top: box.top, bottom: box.bottom, height: box.height };
      };
      const status = rect('#nexora-status-bar');
      const priorityAction = rect('#dashboard-coach-action');

      return {
        width: window.innerWidth,
        overflowX: document.documentElement.scrollWidth > window.innerWidth,
        header: rect('.dashboard-clean-header'),
        core: rect('#nexora-core-panel'),
        coach: rect('#dashboard-coach-card'),
        indicators: rect('.dashboard-secondary-kpis'),
        statusOverlap: status && priorityAction ? Math.max(
          0,
          Math.min(status.bottom, priorityAction.bottom) - Math.max(status.top, priorityAction.top)
        ) : 0
      };
    });

    expect(metrics.overflowX).toBeFalsy();
    expect(metrics.header.height).toBeLessThanOrEqual(70);
    expect(metrics.core.height).toBeLessThanOrEqual(metrics.width <= 719 ? 380 : 300);
    expect(metrics.core.bottom).toBeLessThan(metrics.coach.top);
    expect(metrics.coach.bottom).toBeLessThan(metrics.indicators.top);
    if (metrics.width <= 480) expect(metrics.statusOverlap).toBe(0);

    for (const selector of ['#nexora-core-primary-cta', '#dashboard-coach-action']) {
      const action = page.locator(selector);
      await expect(action).toBeVisible({ timeout: 15000 });
      await action.focus();
      await expect.poll(async () => action.evaluate((node) => document.activeElement === node)).toBe(true);
      const outlineWidth = await action.evaluate((node) => parseFloat(getComputedStyle(node).outlineWidth));
      expect(outlineWidth).toBeGreaterThanOrEqual(2);
    }
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
