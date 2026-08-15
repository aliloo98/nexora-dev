import { test, expect } from '@playwright/test'

test.describe('Auth Production Regression V3', () => {
  test.use({ serviceWorkers: 'allow' })

  test('session-null signup requires email confirmation (P1-A regression)', async ({ page, context }) => {
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
    
    // Navigate to register
    const registerLink = page.locator('a:has-text("S\'inscrire")')
    await registerLink.click()
    
    await page.waitForSelector('#registerForm', { state: 'visible', timeout: 5000 })
    
    // Mock placeholder auth signup to simulate session-null response
    await page.evaluate(() => {
      // Store original AuthService.signUp
      const originalAuthContext = window.AuthContext
      if (originalAuthContext) {
        window.__originalSignUp = originalAuthContext.signUp
        
        // Override to simulate session-null response (email confirmation required)
        originalAuthContext.signUp = async () => {
          return {
            user: {
              id: 'pending-user-id',
              email: 'runtime-auth@example.test',
              user_metadata: { username: 'Runtime Test' }
            },
            session: null,
            error: null
          }
        }
      }
    })
    
    // Fill form
    await page.fill('#registerUsername', 'Runtime Test')
    await page.fill('#registerEmail', 'runtime-auth@example.test')
    await page.fill('#registerPassword', 'Runtime-Test-Password-2026')
    await page.fill('#registerPasswordConfirm', 'Runtime-Test-Password-2026')
    await page.check('#registerTerms')
    
    // Submit
    await page.click('#registerSubmitBtn')
    
    // Wait for response
    await page.waitForTimeout(3000)
    
    // Restore original
    await page.evaluate(() => {
      if (window.__originalSignUp && window.AuthContext) {
        window.AuthContext.signUp = window.__originalSignUp
      }
    })
    
    // Critical P1-A regression check: session-null should NOT authenticate
    const dashboard = page.locator('main')
    const dashboardVisible = await dashboard.isVisible().catch(() => false)
    expect(dashboardVisible).toBe(false)
    
    // Verify auth UI remains active (user is not authenticated)
    const authContainer = page.locator('#auth-container')
    const authVisible = await authContainer.isVisible().catch(() => false)
    expect(authVisible).toBe(true)
    
    // Verify no navigation to dashboard hash
    const currentHash = await page.evaluate(() => window.location.hash)
    expect(currentHash).not.toContain('#dashboard')
    
    // Verify no page error
    const errors = page.locator('.form-error-box')
    const errorsVisible = await errors.isVisible().catch(() => false)
    expect(errorsVisible).toBe(false)
  })
})
