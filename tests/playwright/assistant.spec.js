/**
 * Playwright E2E tests (requires Playwright to be installed locally)
 * Run with: npx playwright test tests/playwright
 */
import { test, expect } from '@playwright/test';

test.describe('Assistant E2E', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://127.0.0.1:5180/#section-dashboard', { waitUntil: 'domcontentloaded' });
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
    await page.goto('http://127.0.0.1:5180/#section-dashboard', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('#loginDemoBtn', { state: 'visible', timeout: 15000 });
    await page.click('#loginDemoBtn');
    await page.waitForURL('**/#section-dashboard', { timeout: 20000 });
  });

  test('keeps judgment, action and indicators compact and ordered', async ({ page }) => {
    await page.waitForSelector('#assistant-card', { state: 'visible', timeout: 20000 });
    
    const metrics = await page.evaluate(() => {
      const rect = (selector) => {
        const node = document.querySelector(selector);
        if (!node) return null;
        const box = node.getBoundingClientRect();
        return { top: box.top, bottom: box.bottom, height: box.height };
      };

      return {
        width: window.innerWidth,
        overflowX: document.documentElement.scrollWidth > window.innerWidth,
        assistantCard: rect('#assistant-card')
      };
    });

    expect(metrics.width).toBeGreaterThan(0);
    expect(metrics.overflowX).toBeFalsy();
    expect(metrics.assistantCard).toBeTruthy();
  });
});

test.describe('Premium application coherence', () => {
  test('keeps every product surface coherent at the five target widths', async ({ page }) => {
    test.setTimeout(90000);

    await page.goto('http://127.0.0.1:5180/', { waitUntil: 'domcontentloaded' });
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
        await page.goto(`http://127.0.0.1:5180/#section-${section}`, { waitUntil: 'domcontentloaded' });
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
      await page.goto('http://127.0.0.1:5180/#section-dashboard', { waitUntil: 'domcontentloaded' });

      for (const section of navSections) {
        await assertSectionLayout(section);
      }

      for (const section of visibleLinkedSections) {
        await page.goto(`http://127.0.0.1:5180/#section-${section}`, { waitUntil: 'domcontentloaded' });
        await assertSectionLayout(section);
      }
    }

    await expect(page.locator('#section-objectifs .premium-field')).toHaveCount(6);
    await page.goto('http://127.0.0.1:5180/#section-dettes', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('#section-dettes .premium-field')).toHaveCount(5);
    await page.goto('http://127.0.0.1:5180/#section-plan', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('#section-plan .plan-create-form .premium-field')).toHaveCount(5);

    await page.goto('http://127.0.0.1:5180/#section-historique', { waitUntil: 'domcontentloaded' });
    const emptyHistory = page.locator('#history-grid > p:only-child');
    await expect(emptyHistory).toBeVisible();
    expect(await emptyHistory.evaluate((node) => node.getBoundingClientRect().height)).toBeGreaterThanOrEqual(180);

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('http://127.0.0.1:5180/#section-parametres', { waitUntil: 'domcontentloaded' });
    const resetButton = page.getByRole('button', { name: 'Réinitialiser', exact: true });
    await resetButton.scrollIntoViewIfNeeded();
    await resetButton.click();
    const modal = page.getByRole('dialog', { name: 'Réinitialiser le mois' });
    await expect(modal).toBeVisible();
    const modalBox = await modal.boundingBox();
    expect(modalBox?.width).toBeLessThanOrEqual(390 - 28);
    const closeButton = modal.getByRole('button', { name: 'Fermer la boîte de dialogue' });
    await closeButton.focus();
    await expect(closeButton).toBeFocused();
    expect(await closeButton.evaluate((node) => parseFloat(getComputedStyle(node).outlineWidth))).toBeGreaterThanOrEqual(2);
    await modal.getByRole('button', { name: 'Annuler' }).click();
  });
});
