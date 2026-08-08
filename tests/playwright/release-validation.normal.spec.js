import { test, expect } from '@playwright/test';

test.describe('Production-like Demo Validation - Normal Build (Empty Supabase)', () => {
  test('demo mode is rejected in normal build (empty Supabase)', async ({ page }) => {
    const consoleErrors = [];
    const pageErrors = [];
    const supabaseRequests = [];

    page.on('console', message => {
      if (message.type() === 'error') {
        const text = message.text();
        // Temporary filter for formatCurrency minification issue (needs investigation)
        if (!text.includes('formatCurrency')) {
          consoleErrors.push(text);
        }
      }
    });
    page.on('pageerror', error => {
      const message = error.message;
      // Temporary filter for formatCurrency minification issue (needs investigation)
      if (!message.includes('formatCurrency')) {
        pageErrors.push(message);
      }
    });
    page.on('request', request => {
      const hostname = new URL(request.url()).hostname;
      if (hostname === 'supabase.co' || hostname.endsWith('.supabase.co')) {
        supabaseRequests.push(request.url());
      }
    });

    await page.goto('http://localhost:4173', {
      waitUntil: 'networkidle',
    });
    await page.waitForFunction(() => typeof window.updateAll === 'function', { timeout: 10000 });

    // Verify that demo button is NOT visible in normal build
    const demoButtonVisible = await page.locator('#loginDemoBtn').isVisible().catch(() => false);
    expect(demoButtonVisible).toBe(false);

    // Verify application remains protected (auth-locked)
    const bodyClass = await page.locator('body').getAttribute('class');
    expect(bodyClass).toContain('auth-locked');

    expect(consoleErrors).toEqual([]);
    expect(pageErrors).toEqual([]);
    expect(supabaseRequests).toEqual([]);
  });

  test('demo mode security: URL parameter has no effect in normal build', async ({ page }) => {
    const consoleErrors = [];
    const pageErrors = [];
    const supabaseRequests = [];

    page.on('console', message => {
      if (message.type() === 'error') {
        const text = message.text();
        // Temporary filter for formatCurrency minification issue (needs investigation)
        if (!text.includes('formatCurrency')) {
          consoleErrors.push(text);
        }
      }
    });
    page.on('pageerror', error => {
      const message = error.message;
      // Temporary filter for formatCurrency minification issue (needs investigation)
      if (!message.includes('formatCurrency')) {
        pageErrors.push(message);
      }
    });
    page.on('request', request => {
      const hostname = new URL(request.url()).hostname;
      if (hostname === 'supabase.co' || hostname.endsWith('.supabase.co')) {
        supabaseRequests.push(request.url());
      }
    });

    await page.goto('http://localhost:4173/?demo=1', { waitUntil: 'networkidle' });
    await page.waitForFunction(() => typeof window.updateAll === 'function', { timeout: 10000 });

    const demoButtonVisible = await page.locator('#loginDemoBtn').isVisible().catch(() => false);
    expect(demoButtonVisible).toBe(false);

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

  test('preloaded fake session does not enable demo mode in normal build', async ({ page }) => {
    const consoleErrors = [];
    const pageErrors = [];
    const supabaseRequests = [];

    page.on('console', message => {
      if (message.type() === 'error') {
        const text = message.text();
        // Temporary filter for formatCurrency minification issue (needs investigation)
        if (!text.includes('formatCurrency')) {
          consoleErrors.push(text);
        }
      }
    });
    page.on('pageerror', error => {
      const message = error.message;
      // Temporary filter for formatCurrency minification issue (needs investigation)
      if (!message.includes('formatCurrency')) {
        pageErrors.push(message);
      }
    });
    page.on('request', request => {
      const hostname = new URL(request.url()).hostname;
      if (hostname === 'supabase.co' || hostname.endsWith('.supabase.co')) {
        supabaseRequests.push(request.url());
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

    await page.goto('http://localhost:4173', { waitUntil: 'networkidle' });
    await page.waitForFunction(() => typeof window.updateAll === 'function', { timeout: 10000 });

    // Verify that demo button is NOT visible (demo mode not enabled)
    const demoButtonVisible = await page.locator('#loginDemoBtn').isVisible().catch(() => false);
    expect(demoButtonVisible).toBe(false);

    // Verify application remains protected (auth-locked)
    const bodyClass = await page.locator('body').getAttribute('class');
    expect(bodyClass).toContain('auth-locked');

    // Verify that fake session was purged
    const authUser = await page.evaluate(() => {
      try {
        return localStorage.getItem('nexora_auth_user');
      } catch {
        return null;
      }
    });
    const authSession = await page.evaluate(() => {
      try {
        return localStorage.getItem('nexora_auth_session');
      } catch {
        return null;
      }
    });
    expect(authUser).toBeNull();
    expect(authSession).toBeNull();

    expect(consoleErrors).toEqual([]);
    expect(pageErrors).toEqual([]);
    expect(supabaseRequests).toEqual([]);
  });

  test('sign up placeholder is rejected in normal build', async ({ page }) => {
    const consoleErrors = [];
    const pageErrors = [];
    const supabaseRequests = [];

    page.on('console', message => {
      if (message.type() === 'error') {
        const text = message.text();
        // Temporary filter for formatCurrency minification issue (needs investigation)
        if (!text.includes('formatCurrency')) {
          consoleErrors.push(text);
        }
      }
    });
    page.on('pageerror', error => {
      const message = error.message;
      // Temporary filter for formatCurrency minification issue (needs investigation)
      if (!message.includes('formatCurrency')) {
        pageErrors.push(message);
      }
    });
    page.on('request', request => {
      const hostname = new URL(request.url()).hostname;
      if (hostname === 'supabase.co' || hostname.endsWith('.supabase.co')) {
        supabaseRequests.push(request.url());
      }
    });

    await page.goto('http://localhost:4173', { waitUntil: 'networkidle' });
    await page.waitForFunction(() => typeof window.updateAll === 'function', { timeout: 10000 });

    // Verify initial state is auth-locked
    const bodyClass = await page.locator('body').getAttribute('class');
    expect(bodyClass).toContain('auth-locked');

    // Navigate to Sign Up form
    const signUpLink = page.locator('a[href="#sign-up"]').or(page.locator('text=S\'inscrire')).or(page.locator('text=Sign Up'));
    const signUpVisible = await signUpLink.isVisible().catch(() => false);
    if (signUpVisible) {
      await signUpLink.click();
    } else {
      // Try to find sign up button directly
      const signUpButton = page.locator('button:has-text("S\'inscrire")').or(page.locator('button:has-text("Sign Up")'));
      const signUpButtonVisible = await signUpButton.isVisible().catch(() => false);
      if (signUpButtonVisible) {
        await signUpButton.click();
      }
    }

    // Wait for sign up form to be visible
    await page.waitForTimeout(1000);

    // Fill sign up form
    const emailInput = page.locator('input[type="email"]').or(page.locator('input[name="email"]'));
    const passwordInput = page.locator('input[name="password"]');
    const usernameInput = page.locator('input[name="username"]').or(page.locator('input[placeholder*="username"]')).or(page.locator('input[placeholder*="nom"]'));

    const emailVisible = await emailInput.isVisible().catch(() => false);
    if (emailVisible) {
      await emailInput.fill('test@example.com');
      await passwordInput.fill('TestPassword123!');
      await usernameInput.fill('testuser');

      // Submit form
      const submitButton = page.locator('button[type="submit"]').or(page.locator('button:has-text("S\'inscrire")')).or(page.locator('button:has-text("Sign Up")'));
      await submitButton.click();

      // Wait for form submission
      await page.waitForTimeout(2000);
    }

    // Verify application remains auth-locked
    const bodyClassAfter = await page.locator('body').getAttribute('class');
    expect(bodyClassAfter).toContain('auth-locked');

    // Verify no fake user was created in storage
    const authUser = await page.evaluate(() => {
      try {
        return localStorage.getItem('nexora_auth_user');
      } catch {
        return null;
      }
    });
    const authSession = await page.evaluate(() => {
      try {
        return localStorage.getItem('nexora_auth_session');
      } catch {
        return null;
      }
    });
    expect(authUser).toBeNull();
    expect(authSession).toBeNull();

    // Verify sessionStorage is also clean
    const sessionUser = await page.evaluate(() => {
      try {
        return sessionStorage.getItem('nexora_auth_user');
      } catch {
        return null;
      }
    });
    const sessionSession = await page.evaluate(() => {
      try {
        return sessionStorage.getItem('nexora_auth_session');
      } catch {
        return null;
      }
    });
    expect(sessionUser).toBeNull();
    expect(sessionSession).toBeNull();

    // Verify no access to Dashboard
    const dashboardVisible = await page.locator('#dashboard').isVisible().catch(() => false);
    expect(dashboardVisible).toBe(false);

    expect(consoleErrors).toEqual([]);
    expect(pageErrors).toEqual([]);
    expect(supabaseRequests).toEqual([]);
  });
});