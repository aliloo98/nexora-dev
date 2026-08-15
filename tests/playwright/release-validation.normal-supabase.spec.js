import { test, expect } from '@playwright/test';

test.describe('Production-like Demo Validation - Normal Build (Synthetic Supabase)', () => {
  test('demo mode is rejected in normal build (synthetic Supabase)', async ({ page }) => {
    const consoleErrors = [];
    const pageErrors = [];
    const supabaseRequests = [];

    page.on('console', message => {
      if (message.type() === 'error') {
        const text = message.text();
        // Filter out Google Fonts 404 errors - known external service flake
        if (!text.includes('Failed to load resource') || !text.includes('404') || !text.includes('fonts.gstatic.com')) {
          consoleErrors.push(text);
        }
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
    // Note: Synthetic Supabase credentials may trigger requests to the fake URL
    // This is expected and proves the build treats them as real credentials
    // Verify requests only go to synthetic.supabase.co
    if (supabaseRequests.length > 0) {
      for (const url of supabaseRequests) {
        expect(url).toContain('synthetic.supabase.co');
      }
    }
  });

  test('sign up placeholder is rejected in normal build with synthetic Supabase', async ({ page }) => {
    const consoleErrors = [];
    const pageErrors = [];
    const supabaseRequests = [];

    page.on('console', message => {
      if (message.type() === 'error') {
        const text = message.text();
        // Filter out Google Fonts 404 errors - known external service flake
        if (!text.includes('Failed to load resource') || !text.includes('404') || !text.includes('fonts.gstatic.com')) {
          consoleErrors.push(text);
        }
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
    // Verify requests only go to synthetic.supabase.co
    if (supabaseRequests.length > 0) {
      for (const url of supabaseRequests) {
        expect(url).toContain('synthetic.supabase.co');
      }
    }
  });
});
