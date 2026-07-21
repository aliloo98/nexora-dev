import { mkdirSync, writeFileSync } from 'node:fs';
import { test, expect } from '@playwright/test';

const scenarios = [
  {
    name: 'budget vide',
    values: {},
    expectedTitle: 'Commence par saisir un revenu',
    expectedAction: 'Ajouter un revenu',
    expectedActionTarget: 'revenues',
    expectedSection: 'section-saisie',
    expectedFocus: 'rev_ali',
    screenshot: 'budget-coach-empty.png'
  },
  {
    name: 'revenus uniquement',
    values: { rev_ali: 2500 },
    expectedTitle: 'Ajoute tes charges fixes',
    expectedAction: 'Saisir les charges',
    expectedActionTarget: 'fixed-expenses',
    expectedSection: 'section-saisie',
    expectedFocus: 'loyer',
    screenshot: 'budget-coach-income-only.png'
  },
  {
    name: 'revenus + charges fixes',
    values: { rev_ali: 2500, loyer: 800 },
    expectedTitle: 'Ajoute une dépense variable',
    expectedAction: 'Ajouter une dépense',
    expectedActionTarget: 'variable-expenses',
    expectedSection: 'section-saisie',
    expectedFocus: 'courses',
    screenshot: 'budget-coach-fixed-expenses.png'
  },
  {
    name: 'budget équilibré',
    values: { rev_ali: 2500, loyer: 800, courses: 250 },
    expectedTitle: 'Le budget tient bien',
    expectedAction: 'Voir la synthèse',
    expectedActionTarget: 'dashboard',
    expectedSection: 'section-dashboard',
    expectedFocus: null,
    screenshot: 'budget-coach-balanced.png'
  },
  {
    name: 'budget sous pression',
    values: { rev_ali: 1000, loyer: 900, courses: 300 },
    expectedTitle: 'Réduis la pression du mois',
    expectedAction: 'Réviser le budget',
    expectedActionTarget: 'budget',
    expectedSection: 'section-saisie',
    expectedFocus: null,
    screenshot: 'budget-coach-pressure.png'
  },
  {
    name: 'budget terminé',
    values: { rev_ali: 4000, loyer: 1200, courses: 500, credit: 300, elec: 150, eau: 80, tel_ali: 40, stream: 20, sport: 50, cadeaux: 60 },
    expectedTitle: 'Le budget tient bien',
    expectedAction: 'Voir la synthèse',
    expectedActionTarget: 'dashboard',
    expectedSection: 'section-dashboard',
    expectedFocus: null,
    screenshot: 'budget-coach-complete.png'
  }
];

const budgetInputKeys = [
  'rev_ali', 'rev_megane', 'rev_excep',
  'loyer', 'credit', 'assauto', 'gasoil', 'elec', 'eau', 'psy', 'diete', 'itou', 'sante', 'impots', 'box', 'tel_ali', 'tel_meg', 'stream', 'ps', 'cb', 'impfix',
  'courses', 'tabac', 'sport', 'ongles', 'cadeaux', 'impvar'
];

const waitForCoachState = async (page, expectedTitle) => {
  await page.waitForFunction((title) => {
    const card = document.querySelector('#budget-entry-guide-root .budget-coach-card');
    return !!card && card.textContent?.includes(title);
  }, expectedTitle, { timeout: 20000 });
};

const waitForSectionReady = async (page, sectionId) => {
  const section = page.locator(`#section-${sectionId}`);
  await page.waitForFunction((id) => {
    const sectionNode = document.getElementById(`section-${id}`);
    const hashMatches = window.location.hash === `#section-${id}`;
    return Boolean(
      sectionNode &&
      !sectionNode.hidden &&
      getComputedStyle(sectionNode).display !== 'none' &&
      (sectionNode.classList.contains('active') || hashMatches)
    );
  }, sectionId, { timeout: 30000 });
  await expect(section).toHaveClass(/active/);
};

const openBudgetSection = async (page) => {
  await page.locator('.sidebar .nav-btn[data-section="saisie"]').click();
  await waitForSectionReady(page, 'saisie');
};

const logBudgetCoachDebug = async (page, fieldKey) => {
  const debugInfo = await page.evaluate((targetKey) => {
    const section = document.querySelector('#section-saisie');
    const navButton = document.querySelector('.sidebar .nav-btn[data-section="saisie"]');
    const sectionStyle = section ? window.getComputedStyle(section) : null;
    const sectionRect = section ? section.getBoundingClientRect() : null;
    const allSections = Array.from(document.querySelectorAll('section, [data-section], .section'));
    const activeSections = allSections
      .filter((node) => node.classList.contains('active'))
      .map((node) => node.id || node.getAttribute('data-section') || node.className);
    const visibleSections = allSections
      .filter((node) => {
        const style = window.getComputedStyle(node);
        return style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0' && !node.hidden && node.getAttribute('aria-hidden') !== 'true';
      })
      .map((node) => node.id || node.getAttribute('data-section') || node.className);
    const fields = Array.from(section?.querySelectorAll('input[data-key]') ?? []).map((field) => {
      const style = window.getComputedStyle(field);
      const rect = field.getBoundingClientRect();
      return {
        'data-key': field.getAttribute('data-key'),
        display: style.display,
        visibility: style.visibility,
        opacity: style.opacity,
        disabled: field.disabled,
        readonly: field.readOnly,
        width: rect.width,
        height: rect.height
      };
    });

    const payload = {
      targetFieldKey: targetKey,
      url: window.location.href,
      hash: window.location.hash,
      navButtonMarkup: navButton ? navButton.outerHTML.slice(0, 1000) : null,
      navButtonClasses: navButton ? Array.from(navButton.classList) : [],
      sectionClasses: section ? Array.from(section.classList) : [],
      sectionOuterHTML: section ? section.outerHTML.slice(0, 1000) : null,
      sectionDisplay: sectionStyle?.display ?? null,
      sectionVisibility: sectionStyle?.visibility ?? null,
      sectionOpacity: sectionStyle?.opacity ?? null,
      sectionHidden: section ? section.hidden : null,
      sectionAriaHidden: section ? section.getAttribute('aria-hidden') : null,
      sectionClientWidth: section ? section.clientWidth : null,
      sectionClientHeight: section ? section.clientHeight : null,
      sectionRect: sectionRect ? {
        x: sectionRect.x,
        y: sectionRect.y,
        width: sectionRect.width,
        height: sectionRect.height,
        top: sectionRect.top,
        left: sectionRect.left,
        bottom: sectionRect.bottom,
        right: sectionRect.right
      } : null,
      activeSections,
      visibleSections,
      inputCount: fields.length,
      fields
    };

    console.log('=== BUDGET COACH DEBUG ===');
    console.log('window.location.href =', payload.url);
    console.log('window.location.hash =', payload.hash);
    console.log('navButton.outerHTML =', payload.navButtonMarkup);
    console.log('navButton classes =', payload.navButtonClasses);
    console.log('section-saisie classes =', payload.sectionClasses);
    console.log('section-saisie outerHTML =', payload.sectionOuterHTML);
    console.log('getComputedStyle(section).display =', payload.sectionDisplay);
    console.log('visibility =', payload.sectionVisibility);
    console.log('opacity =', payload.sectionOpacity);
    console.log('hidden =', payload.sectionHidden);
    console.log('aria-hidden =', payload.sectionAriaHidden);
    console.log('clientWidth =', payload.sectionClientWidth);
    console.log('clientHeight =', payload.sectionClientHeight);
    console.log('getBoundingClientRect() =', payload.sectionRect);
    console.log('active sections =', payload.activeSections);
    console.log('visible sections =', payload.visibleSections);
    console.log('input[data-key] count =', payload.inputCount);
    console.log('field details =', payload.fields);
    console.log('=== DEBUG END ===');
    return payload;
  }, fieldKey);

  console.log('=== BUDGET COACH DEBUG PAYLOAD ===');
  console.log(JSON.stringify(debugInfo, null, 2));
  writeFileSync('test-results/budgetCoach-debug.json', JSON.stringify(debugInfo, null, 2));
  await page.screenshot({ path: 'budgetCoach-debug.png', fullPage: true });
  throw new Error('DEBUG COMPLETE');
};

const clearBudgetInputs = async (page) => {
  for (const key of budgetInputKeys) {
    const field = page.locator(`#section-saisie input[data-key="${key}"]`);
    if (key === 'rev_ali') {
      await logBudgetCoachDebug(page, key);
    }
    await expect(field).toHaveCount(1);
    await expect(field).toBeVisible({ timeout: 30000 });
    await expect(field).toBeEditable({ timeout: 30000 });
    await field.fill('');
    await expect.poll(async () => field.inputValue()).toBe('');
  }
};

const applyScenarioValues = async (page, values) => {
  for (const [key, value] of Object.entries(values)) {
    const field = page.locator(`#section-saisie input[data-key="${key}"]`);
    await expect(field).toHaveCount(1);
    await expect(field).toBeVisible({ timeout: 30000 });
    await expect(field).toBeEditable({ timeout: 30000 });
    await field.fill(String(value));
    await expect.poll(async () => field.inputValue()).toBe(String(value));
  }
};

test.describe('Budget coach E2E', () => {
  test('validates the official placeholder demo path and the six Budget Coach states', async ({ page }) => {
    mkdirSync('test-results', { recursive: true });

    await page.goto('http://127.0.0.1:5180/', { waitUntil: 'networkidle' });

    const runtimeMode = await page.evaluate(async () => {
      const module = await import('/src/auth/authService.js');
      return module.shouldUsePlaceholderAuth();
    });
    expect(runtimeMode).toBe(true);

    await expect(page.locator('#auth-container')).toBeVisible({ timeout: 20000 });
    await expect(page.locator('#loginDemoBtn')).toBeVisible({ timeout: 20000 });

    await page.locator('#loginDemoBtn').click();

    await expect.poll(async () => page.evaluate(() => window.AuthContext?.isAuthenticated?.()), { timeout: 20000 }).toBe(true);
    await expect(page.locator('#auth-container')).toBeHidden({ timeout: 20000 });
    await expect(page.locator('#section-dashboard')).toBeVisible({ timeout: 20000 });

    for (const scenario of scenarios) {
      await openBudgetSection(page);
      await clearBudgetInputs(page);
      await applyScenarioValues(page, scenario.values);
      await waitForCoachState(page, scenario.expectedTitle);

      const coachCard = page.locator('#budget-entry-guide-root .budget-coach-card');
      await expect(coachCard).toBeVisible({ timeout: 20000 });
      await expect(coachCard).toContainText(scenario.expectedTitle);

      await expect.poll(async () => {
        const coachBox = await coachCard.boundingBox();
        return Boolean(coachBox && coachBox.height > 0 && coachBox.height <= 130);
      }).toBe(true);

      const actionButton = coachCard.locator('.budget-coach-action');
      await expect(actionButton).toContainText(scenario.expectedAction);
      await expect(actionButton).toHaveAttribute('data-target', scenario.expectedActionTarget);
      await actionButton.focus();
      await expect(actionButton).toBeFocused();

      await page.screenshot({ path: `test-results/${scenario.screenshot}`, fullPage: true });

      await actionButton.click();

      const expectedSection = page.locator(`#${scenario.expectedSection}`);
      await expect(expectedSection).toBeVisible({ timeout: 20000 });
      await expect(expectedSection).toHaveClass(/active/);

      if (scenario.expectedFocus) {
        const targetField = page.locator(`#section-saisie input[data-key="${scenario.expectedFocus}"]`);
        await expect(targetField).toBeFocused({ timeout: 20000 });
      }
    }
  });
});
