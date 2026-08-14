import { test, expect } from '@playwright/test';

async function readCockpitState(page) {
  return page.evaluate(() => {
    const normalizeText = value => String(value || '').replace(/\s+/g, ' ').trim();
    const parseEuro = value => {
      const normalized = normalizeText(value)
        .replace(/\s/g, '')
        .replace('€', '')
        .replace(',', '.');
      const parsed = Number(normalized);
      return Number.isFinite(parsed) ? parsed : null;
    };

    const root = document.getElementById('cockpit-financier-root');
    const isSimple = document.body.classList.contains('mode-simple');
    const isComplete = document.body.classList.contains('mode-complete');
    const month = typeof window.getMonth === 'function' ? window.getMonth() : null;
    const metrics = typeof window.getMonthMetrics === 'function' && month
      ? window.getMonthMetrics(month, { fromDom: true })
      : null;
    const formatCurrency = typeof window.fmt === 'function'
      ? window.fmt
      : value => `${Math.round(Number(value) || 0).toLocaleString('fr-FR')} €`;

    return {
      bodyClass: document.body.className,
      mode: isSimple ? 'simple' : isComplete ? 'complete' : 'unknown',
      heroCount: root?.querySelectorAll('.nx-hero-card').length || 0,
      jarvisCount: root?.querySelectorAll('.jarvis-cockpit').length || 0,
      rootText: normalizeText(root?.textContent),
      jarvisMetricValues: Array.from(root?.querySelectorAll('.jarvis-metric-value') || [])
        .map(element => normalizeText(element.textContent)),
      jarvisNumericValues: Array.from(root?.querySelectorAll('.jarvis-metric-value') || [])
        .map(element => parseEuro(element.textContent))
        .filter(value => value !== null),
      metrics,
      formattedProjected: metrics ? normalizeText(formatCurrency(metrics.projectedEndOfCycle)) : null
    };
  });
}

async function waitForCockpitContract(page) {
  await page.waitForFunction(() => {
    const root = document.getElementById('cockpit-financier-root');
    if (!root) return false;

    const heroCount = root.querySelectorAll('.nx-hero-card').length;
    const jarvisCount = root.querySelectorAll('.jarvis-cockpit').length;
    if (document.body.classList.contains('mode-simple')) {
      return heroCount === 1 && jarvisCount === 0;
    }
    if (document.body.classList.contains('mode-complete')) {
      return jarvisCount === 1 && heroCount === 0;
    }
    return false;
  });
}

function expectCockpitContract(state) {
  expect(['simple', 'complete']).toContain(state.mode);
  expect(state.metrics).toBeTruthy();
  expect(Math.abs(state.metrics.projectedEndOfCycle)).toBeGreaterThan(0);

  if (state.mode === 'simple') {
    expect(state.heroCount).toBe(1);
    expect(state.jarvisCount).toBe(0);
    expect(state.rootText.length).toBeGreaterThan(0);
    return;
  }

  expect(state.jarvisCount).toBe(1);
  expect(state.heroCount).toBe(0);
  expect(state.rootText).toContain('Solde projeté fin de mois');
  expect(state.rootText).toContain(state.formattedProjected);
  expect(state.jarvisNumericValues.some(value => Math.abs(value) > 0)).toBe(true);
}

test.describe('Production-like Demo Validation - Demo Build', () => {
  test('demo mode works on localhost with demo build', async ({ page }) => {
    const consoleErrors = [];
    const pageErrors = [];
    const supabaseRequests = [];

    page.on('console', message => {
      if (message.type() === 'error') {
        consoleErrors.push(message.text());
      }
    });
    page.on('pageerror', error => {
      pageErrors.push(error.message);
    });
    page.on('request', request => {
      const hostname = new URL(request.url()).hostname;
      if (hostname === 'supabase.co' || hostname.endsWith('.supabase.co')) {
        supabaseRequests.push(request.url());
      }
    });

    await page.goto('http://localhost:4173', { waitUntil: 'networkidle' });
    await page.waitForFunction(() => typeof window.updateAll === 'function', { timeout: 10000 });

    // 1. Check that demo button is visible (security check passed)
    const demoButton = page.locator('#loginDemoBtn');
    await expect(demoButton).toBeVisible({ timeout: 5000 });

    // 2. Click demo button to activate demo mode
    await demoButton.click();

    // 3. Wait for auth-locked to be removed
    await expect(page.locator('body')).not.toHaveClass(/auth-locked/, { timeout: 10000 });

    // 4. Verify navigation to dashboard
    await expect(page).toHaveURL(/#section-dashboard/, { timeout: 5000 });
    await waitForCockpitContract(page);

    // 5. Read the cockpit contract before modification
    const cockpitBefore = await readCockpitState(page);
    expectCockpitContract(cockpitBefore);

    // 6. Navigate to Saisie via UI (use navigation link)
    await page.click('a[href="#section-saisie"]');
    await page.waitForTimeout(500);
    const saisieVisible = await page.locator('#section-saisie').isVisible();
    expect(saisieVisible).toBe(true);

    // 7. Modify a value in Saisie with user interaction
    await page.fill('input[data-key="courses"]', '777');

    // 8. Verify save bar appears
    await expect(page.locator('.save-bar')).toBeVisible({ timeout: 3000 });

    // 9. Click save button
    await page.click('.save-bar-submit');
    await expect(page.locator('.save-bar')).not.toBeVisible({ timeout: 3000 });

    // 10. Reload page completely
    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.waitForFunction(() => typeof window.updateAll === 'function', { timeout: 10000 });
    await waitForCockpitContract(page);

    // 11. Verify application is still authenticated without new click
    await expect(page.locator('body')).not.toHaveClass(/auth-locked/);

    // 12. Verify value persisted in Saisie
    await page.click('a[href="#section-saisie"]');
    await page.waitForTimeout(500);
    const savedValue = await page.locator('input[data-key="courses"]').inputValue();
    expect(savedValue).toBe('777 €');

    // 13. Return to Dashboard to verify KPI is updated
    await page.click('a[href="#section-dashboard"]');
    await page.waitForTimeout(500);
    const dashboardVisible = await page.locator('#section-dashboard').isVisible();
    expect(dashboardVisible).toBe(true);
    await waitForCockpitContract(page);

    // 14. Verify the current cockpit owner follows the UX mode contract
    const cockpitAfter = await readCockpitState(page);
    expectCockpitContract(cockpitAfter);

    // 15. Verify the saved courses modification affects financial calculation
    expect(cockpitAfter.metrics.projectedEndOfCycle).not.toBe(cockpitBefore.metrics.projectedEndOfCycle);

    // 16. Final error checks - no Supabase requests
    expect(consoleErrors).toEqual([]);
    expect(pageErrors).toEqual([]);
    expect(supabaseRequests).toEqual([]);
  });

  test('demo mode security: URL parameter has no effect', async ({ page }) => {
    const consoleErrors = [];
    const pageErrors = [];
    const supabaseRequests = [];

    page.on('console', message => {
      if (message.type() === 'error') {
        consoleErrors.push(message.text());
      }
    });
    page.on('pageerror', error => {
      pageErrors.push(error.message);
    });
    page.on('request', request => {
      const hostname = new URL(request.url()).hostname;
      if (hostname === 'supabase.co' || hostname.endsWith('.supabase.co')) {
        supabaseRequests.push(request.url());
      }
    });

    await page.goto('http://localhost:4173/?demo=1', { waitUntil: 'networkidle' });
    await page.waitForFunction(() => typeof window.updateAll === 'function', { timeout: 10000 });

    await expect(page.locator('#loginDemoBtn')).toBeVisible({ timeout: 5000 });

    const demoModeKey = await page.evaluate(() => {
      try {
        return localStorage.getItem('nexora_demo_mode_v1');
      } catch {
        return null;
      }
    });
    expect(demoModeKey).toBeNull();

    const bodyClass = await page.locator('body').getAttribute('class');
    expect(bodyClass).toContain('auth-locked');

    expect(consoleErrors).toEqual([]);
    expect(pageErrors).toEqual([]);
    expect(supabaseRequests).toEqual([]);
  });

  test('demo mode hostname security: 127.0.0.1 rejected', async ({ page }) => {
    const consoleErrors = [];
    const pageErrors = [];
    const supabaseRequests = [];
    const notFoundUrls = [];

    page.on('console', message => {
      if (message.type() === 'error') {
        consoleErrors.push(message.text());
      }
    });
    page.on('pageerror', error => {
      pageErrors.push(error.message);
    });
    page.on('request', request => {
      const hostname = new URL(request.url()).hostname;
      if (hostname === 'supabase.co' || hostname.endsWith('.supabase.co')) {
        supabaseRequests.push(request.url());
      }
    });
    page.on('response', response => {
      if (response.status() === 404) {
        notFoundUrls.push(response.url());
      }
    });

    // Preload a fake session before navigation
    await page.addInitScript(() => {
      localStorage.setItem('nexora_auth_user', JSON.stringify({
        id: 'fake_user',
        email: 'fake@example.com',
        user_metadata: { username: 'fake' }
      }));
      localStorage.setItem('nexora_auth_session', JSON.stringify({
        access_token: 'fake_token',
        refresh_token: 'fake_refresh',
        expires_in: 3600
      }));
    });

    // Access via 127.0.0.1 instead of localhost
    await page.goto('http://127.0.0.1:4173', { waitUntil: 'networkidle' });
    await page.waitForFunction(() => typeof window.updateAll === 'function', { timeout: 10000 });

    // Verify demo button is NOT visible
    const demoButtonVisible = await page.locator('#loginDemoBtn').isVisible().catch(() => false);
    expect(demoButtonVisible).toBe(false);

    // Verify application remains protected (auth-locked)
    const bodyClass = await page.locator('body').getAttribute('class');
    expect(bodyClass).toContain('auth-locked');

    // Verify no fake session was used
    const user = await page.evaluate(() => {
      try {
        return localStorage.getItem('nexora_auth_user');
      } catch {
        return null;
      }
    });
    expect(user).toBeNull();

    const session = await page.evaluate(() => {
      try {
        return localStorage.getItem('nexora_auth_session');
      } catch {
        return null;
      }
    });
    expect(session).toBeNull();

    const demoModeKey = await page.evaluate(() => {
      try {
        return localStorage.getItem('nexora_demo_mode_v1');
      } catch {
        return null;
      }
    });
    expect(demoModeKey).toBeNull();

    // Log 404 URLs for diagnosis
    if (notFoundUrls.length > 0) {
      console.log('404 URLs detected:', notFoundUrls);
    }

    expect(consoleErrors).toEqual([]);
    expect(pageErrors).toEqual([]);
    expect(supabaseRequests).toEqual([]);
  });
});
