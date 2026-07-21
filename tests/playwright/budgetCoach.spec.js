import { mkdirSync } from 'node:fs';
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
    const activeSections = Array.from(document.querySelectorAll('.section.active'));
    const sectionStyle = sectionNode ? getComputedStyle(sectionNode) : null;
    return Boolean(
      sectionNode &&
      !sectionNode.hidden &&
      sectionStyle.display !== 'none' &&
      sectionStyle.visibility === 'visible' &&
      sectionStyle.opacity === '1' &&
      sectionNode.classList.contains('active') &&
      activeSections.length === 1 &&
      activeSections[0] === sectionNode
    );
  }, sectionId, { timeout: 30000 });
  await expect(section).toHaveClass(/active/);
  await expect.poll(async () => {
    return section.evaluate((element) => getComputedStyle(element).opacity);
  }).toBe('1');
};

const openBudgetSection = async (page) => {
  await page.locator('.sidebar .nav-btn[data-section="saisie"]').click();
  await waitForSectionReady(page, 'saisie');
};

const clearBudgetInputs = async (page) => {
  for (const key of budgetInputKeys) {
    const field = page.locator(`#section-saisie input[data-key="${key}"]`);
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

      await waitForSectionReady(page, scenario.expectedSection.replace('section-', ''));

      if (scenario.expectedFocus) {
        const targetField = page.locator(`#section-saisie input[data-key="${scenario.expectedFocus}"]`);
        await expect(targetField).toBeVisible({ timeout: 20000 });
        await expect(targetField).toBeEditable({ timeout: 20000 });
        await expect(targetField).toBeFocused({ timeout: 20000 });
      }
    }
  });
});
