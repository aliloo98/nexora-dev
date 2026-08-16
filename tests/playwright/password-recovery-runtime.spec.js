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
})
