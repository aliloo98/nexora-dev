import { test, expect } from '@playwright/test'

test.describe('Password Recovery Runtime V1', () => {
  test.use({ serviceWorkers: 'allow' })

  test('reset-password route renders form structure', async ({ page, context }) => {
    // Fresh context
    await context.clearCookies()
    await context.clearPermissions()
    
    await page.goto('/')
    await page.evaluate(() => {
      localStorage.clear()
      sessionStorage.clear()
    })
    
    await page.goto('/reset-password')
    
    // CRITICAL FIX: Verify form DOM exists (this was missing before - caused permanent loader)
    await page.waitForSelector('#resetPasswordForm', { state: 'attached', timeout: 5000 })
    const formExists = await page.locator('#resetPasswordForm').count()
    expect(formExists).toBe(1)
    
    // Verify inputs exist so listeners can attach
    const passwordInput = await page.locator('#resetPassword').count()
    expect(passwordInput).toBe(1)
    
    const confirmInput = await page.locator('#resetPasswordConfirm').count()
    expect(confirmInput).toBe(1)
    
    const submitBtn = await page.locator('#resetSubmitBtn').count()
    expect(submitBtn).toBe(1)
  })
})