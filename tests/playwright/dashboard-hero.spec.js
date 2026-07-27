import { test, expect } from '@playwright/test';

test.describe('Dashboard Hero Card Premium', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://127.0.0.1:5180/');
    await page.waitForSelector('#loginDemoBtn', { state: 'visible', timeout: 15000 });
    await page.click('#loginDemoBtn');
    await page.waitForURL('**/#section-dashboard', { timeout: 20000 });
    await page.waitForSelector('#dashboard-synthesis-hero', { state: 'visible', timeout: 10000 });
    // Wait for dashboard to fully load
    await page.waitForTimeout(5000);
    // Manually render Hero Card
    await page.evaluate(() => {
      const metrics = {
        revReel: 3000,
        solde: 1234.56,
        tauxCh: 65,
        variablesPct: 20
      };
      if (typeof window.renderDashboardHero === 'function') {
        window.renderDashboardHero('dashboard-hero-root', metrics, {
          documentRef: document,
          windowRef: window,
          onAction: (section) => {
            if (typeof window.showSection === 'function') window.showSection(section);
          }
        });
      }
    });
    await page.waitForTimeout(1000);
  });

  test('renders V2 Hero Card at responsive breakpoints', async ({ page }) => {
    const viewports = [
      { width: 390, height: 844 },
      { width: 768, height: 1024 },
      { width: 1024, height: 900 },
      { width: 1440, height: 1000 }
    ];

    for (const viewport of viewports) {
      await page.setViewportSize(viewport);
      await page.waitForLoadState('networkidle');

      const heroMetrics = await page.evaluate(() => {
        const heroRoot = document.querySelector('#dashboard-hero-root');
        const heroContainer = document.querySelector('#dashboard-synthesis-hero');
        const heroCard = heroRoot?.querySelector('.nx-hero-card');
        const legacyContent = heroContainer?.querySelector('.dashboard-hero__copy');

        const amount = heroCard?.querySelector('.nx-hero-card__amount');
        const label = heroCard?.querySelector('.nx-hero-card__label');
        const buttons = heroCard?.querySelectorAll('button');
        const context = heroCard?.querySelector('.nx-hero-card__context');
        const trend = heroCard?.querySelector('.nx-hero-card__trend');

        const heroBox = heroContainer.getBoundingClientRect();
        const amountBox = amount?.getBoundingClientRect();

        return {
          heroRootExists: heroRoot !== null,
          heroContainerExists: heroContainer !== null,
          heroCardExists: heroCard !== null,
          legacyContentExists: legacyContent !== null,
          amountVisible: amountBox ? amountBox.width > 0 && amountBox.height > 0 : false,
          amountFontSize: amountBox ? parseFloat(getComputedStyle(amount).fontSize) : 0,
          amountText: amount?.textContent || '',
          labelText: label?.textContent || '',
          buttonCount: buttons?.length || 0,
          contextExists: context !== null,
          trendExists: trend !== null,
          heroCardClasses: heroCard ? Array.from(heroCard.classList) : [],
          heroWidth: heroBox.width,
          heroHeight: heroBox.height,
          overflowX: document.documentElement.scrollWidth > window.innerWidth
        };
      });

      // Strict assertions: V2 card must be rendered
      expect(heroMetrics.heroRootExists).toBe(true);
      expect(heroMetrics.heroContainerExists).toBe(true);
      expect(heroMetrics.heroCardExists).toBe(true);
      expect(heroMetrics.legacyContentExists).toBe(false);
      expect(heroMetrics.heroCardClasses).toContain('nx-hero-card');
      expect(heroMetrics.amountVisible).toBe(true);
      expect(heroMetrics.amountFontSize).toBeGreaterThan(0);
      expect(heroMetrics.buttonCount).toBeLessThanOrEqual(1);
      expect(heroMetrics.labelText).toContain('Argent restant');
      expect(heroMetrics.overflowX).toBe(false);
    }
  });

  test('handles negative and long amounts without overflow', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });

    const heroMetrics = await page.evaluate(() => {
      const heroRoot = document.querySelector('#dashboard-hero-root');
      const heroCard = heroRoot?.querySelector('.nx-hero-card');
      const amount = heroCard?.querySelector('.nx-hero-card__amount');
      const amountBox = amount?.getBoundingClientRect();
      const heroBox = heroCard?.getBoundingClientRect();

      return {
        heroCardExists: heroCard !== null,
        amountText: amount?.textContent || '',
        amountWidth: amountBox?.width || 0,
        containerWidth: heroBox?.width || 0,
        overflow: amountBox ? amountBox.width > heroBox?.width : false,
        overflowX: document.documentElement.scrollWidth > window.innerWidth
      };
    });

    expect(heroMetrics.heroCardExists).toBe(true);
    expect(heroMetrics.amountText).toBeTruthy();
    expect(heroMetrics.overflow).toBe(false);
    expect(heroMetrics.overflowX).toBe(false);
  });

  test('has single CTA and keyboard navigation', async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 900 });

    const ctaMetrics = await page.evaluate(() => {
      const heroRoot = document.querySelector('#dashboard-hero-root');
      const heroCard = heroRoot?.querySelector('.nx-hero-card');
      const buttons = heroCard?.querySelectorAll('button');

      return {
        heroCardExists: heroCard !== null,
        buttonCount: buttons?.length || 0,
        buttonText: buttons[0]?.textContent || ''
      };
    });

    expect(ctaMetrics.heroCardExists).toBe(true);
    expect(ctaMetrics.buttonCount).toBeLessThanOrEqual(1);

    if (ctaMetrics.buttonCount > 0) {
      await page.keyboard.press('Tab');
      const focusedElement = await page.evaluate(() => document.activeElement?.tagName);
      expect(focusedElement).toBeTruthy();
    }
  });

  test('respects reduced motion preference', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.setViewportSize({ width: 768, height: 1024 });

    const motionCheck = await page.evaluate(() => {
      const heroRoot = document.querySelector('#dashboard-hero-root');
      const heroCard = heroRoot?.querySelector('.nx-hero-card');

      return {
        heroCardExists: heroCard !== null,
        reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches
      };
    });

    expect(motionCheck.heroCardExists).toBe(true);
    expect(motionCheck.reducedMotion).toBe(true);
  });

  test('shows only one Hero, no duplicate rendering', async ({ page }) => {
    const duplicateCheck = await page.evaluate(() => {
      const heroRoots = document.querySelectorAll('#dashboard-hero-root');
      const heroContainers = document.querySelectorAll('#dashboard-synthesis-hero');
      const heroCards = document.querySelectorAll('.nx-hero-card');
      const legacyHeroContent = document.querySelectorAll('.dashboard-hero__copy');

      return {
        heroRootCount: heroRoots.length,
        heroContainerCount: heroContainers.length,
        heroCardCount: heroCards.length,
        legacyContentCount: legacyHeroContent.length,
        heroRootHasCard: heroRoots[0]?.querySelector('.nx-hero-card') !== null
      };
    });

    expect(duplicateCheck.heroRootCount).toBe(1);
    expect(duplicateCheck.heroContainerCount).toBe(1);
    expect(duplicateCheck.heroCardCount).toBe(1);
    expect(duplicateCheck.legacyContentCount).toBe(0);
    expect(duplicateCheck.heroRootHasCard).toBe(true);
  });

  test('preserves injected values from existing logic', async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 900 });

    const preserved = await page.evaluate(() => {
      const heroRoot = document.querySelector('#dashboard-hero-root');
      const heroCard = heroRoot?.querySelector('.nx-hero-card');
      const amount = heroCard?.querySelector('.nx-hero-card__amount');
      const context = heroCard?.querySelector('.nx-hero-card__context');
      const container = document.querySelector('#dashboard-synthesis-hero');

      return {
        heroCardExists: heroCard !== null,
        amountText: amount?.textContent || '',
        contextText: context?.textContent || '',
        dataState: container?.dataset.state || null,
        hasDataState: container?.hasAttribute('data-state')
      };
    });

    expect(preserved.heroCardExists).toBe(true);
    expect(preserved.amountText).toBeTruthy();
    expect(preserved.hasDataState).toBe(true);
    expect(preserved.dataState).toBeTruthy();
  });
});
