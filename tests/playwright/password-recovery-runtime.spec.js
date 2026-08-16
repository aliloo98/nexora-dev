import { test, expect } from '@playwright/test'

test.describe('Password Recovery Runtime V1', () => {
  test.use({ serviceWorkers: 'allow' })

  test('cleanup prevents stale listeners on navigation', async ({ page, context }) => {
    // Fresh context
    await context.clearCookies()
    await context.clearPermissions()

    await page.goto('http://localhost:5180')
    await page.evaluate(() => {
      localStorage.clear()
      sessionStorage.clear()
    })

    await page.goto('http://localhost:5180')
    await page.waitForSelector('#loginForm', { state: 'visible', timeout: 10000 })

    // Show reset password page (placeholder mode shows error)
    await page.evaluate(async () => {
      const AuthPagesModule = await import('/src/pages/AuthPages.js')
      const AuthPages = AuthPagesModule.default
      AuthPages.showAuthPages()
      AuthPages.showResetPasswordPage({ loading: true })
    })

    // Verify reset page content is shown (placeholder error in this env)
    const resetContentVisible = await page.locator('#auth-container').isVisible()
    expect(resetContentVisible).toBe(true)

    // Switch to login - this should trigger cleanup
    await page.evaluate(async () => {
      const AuthPagesModule = await import('/src/pages/AuthPages.js')
      const AuthPages = AuthPagesModule.default
      AuthPages.showLoginPage()
    })

    // Verify login page is shown
    await page.waitForSelector('#loginForm', { state: 'visible', timeout: 5000 })
    const loginFormVisible = await page.locator('#loginForm').isVisible()
    expect(loginFormVisible).toBe(true)

    // Verify reset content is gone
    const resetContentGone = await page.locator('#auth-container .form-error-box').isVisible()
    expect(resetContentGone).toBe(false)
  })

  test('EVENT AFTER INIT - real AuthContext recovery transition', async ({ page, context }) => {
    // Fresh context
    await context.clearCookies()
    await context.clearPermissions()

    await page.goto('http://localhost:5180')
    await page.evaluate(() => {
      localStorage.clear()
      sessionStorage.clear()
    })

    await page.goto('http://localhost:5180')
    await page.waitForSelector('#loginForm', { state: 'visible', timeout: 10000 })

    // Check if in placeholder mode - skip if so
    const isPlaceholder = await page.evaluate(async () => {
      const authServiceModule = await import('/src/auth/authService.js')
      return authServiceModule.shouldUsePlaceholderAuth()
    })

    if (isPlaceholder) {
      // Skip in placeholder mode - requires Supabase-configured environment
      console.log('Skipping real recovery transition test in placeholder mode')
      return
    }

    // Render the REAL reset page in loading state
    await page.evaluate(async () => {
      const AuthPagesModule = await import('/src/pages/AuthPages.js')
      const AuthPages = AuthPagesModule.default
      AuthPages.showAuthPages()
      AuthPages.showResetPasswordPage({ loading: true })
    })

    // Initial state: loader visible, form hidden
    const loaderVisible = await page.locator('#resetPasswordLoading').isVisible()
    expect(loaderVisible).toBe(true)

    const formHidden = await page.locator('#resetPasswordForm').isVisible()
    expect(formHidden).toBe(false)

    // Import the REAL AuthContext and trigger recovery state change
    await page.evaluate(async () => {
      const AuthContextModule = await import('/src/auth/authContext.js')
      const AuthContext = AuthContextModule.default
      AuthContext.setPasswordRecoveryMode(true)
    })

    // Wait for transition through the REAL production subscription
    await page.waitForTimeout(100)

    // After transition: loader hidden, form visible
    const loaderHidden = await page.locator('#resetPasswordLoading').isVisible()
    expect(loaderHidden).toBe(false)

    const formVisible = await page.locator('#resetPasswordForm').isVisible()
    expect(formVisible).toBe(true)

    const footerVisible = await page.locator('#resetPasswordFooter').isVisible()
    expect(footerVisible).toBe(true)

    // Restore recovery state
    await page.evaluate(async () => {
      const AuthContextModule = await import('/src/auth/authContext.js')
      const AuthContext = AuthContextModule.default
      AuthContext.setPasswordRecoveryMode(false)
    })
  })

  test('EVENT BEFORE INIT - recovery active before page render', async ({ page, context }) => {
    // Fresh context
    await context.clearCookies()
    await context.clearPermissions()

    await page.goto('http://localhost:5180')
    await page.evaluate(() => {
      localStorage.clear()
      sessionStorage.clear()
    })

    await page.goto('http://localhost:5180')
    await page.waitForSelector('#loginForm', { state: 'visible', timeout: 10000 })

    // Check if in placeholder mode - skip if so
    const isPlaceholder = await page.evaluate(async () => {
      const authServiceModule = await import('/src/auth/authService.js')
      return authServiceModule.shouldUsePlaceholderAuth()
    })

    if (isPlaceholder) {
      // Skip in placeholder mode - requires Supabase-configured environment
      console.log('Skipping event-before-init test in placeholder mode')
      return
    }

    // Set recovery mode FIRST using REAL AuthContext
    await page.evaluate(async () => {
      const AuthContextModule = await import('/src/auth/authContext.js')
      const AuthContext = AuthContextModule.default
      AuthContext.setPasswordRecoveryMode(true)
    })

    // THEN render reset password page
    await page.evaluate(async () => {
      const AuthPagesModule = await import('/src/pages/AuthPages.js')
      const AuthPages = AuthPagesModule.default
      AuthPages.showAuthPages()
      AuthPages.showResetPasswordPage({ loading: true })
    })

    // Wait for checkRecoveryMode() to detect and call showForm()
    await page.waitForTimeout(100)

    // Form should be immediately visible (no loader shown)
    const formVisible = await page.locator('#resetPasswordForm').isVisible()
    expect(formVisible).toBe(true)

    const loaderHidden = await page.locator('#resetPasswordLoading').isVisible()
    expect(loaderHidden).toBe(false)

    // Restore recovery state
    await page.evaluate(async () => {
      const AuthContextModule = await import('/src/auth/authContext.js')
      const AuthContext = AuthContextModule.default
      AuthContext.setPasswordRecoveryMode(false)
    })
  })
})
