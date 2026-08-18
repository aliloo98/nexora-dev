import { test, expect } from '@playwright/test'
import { pollForEmail } from './helpers/mailbox.js'

const RUN_ID = Date.now().toString(36)
const ACCOUNT_A_USERNAME = `NexoraMobile${RUN_ID}`
const ACCOUNT_A_EMAIL = `nexora-ci-mobile-${RUN_ID}@example.test`
const ACCOUNT_A_PASSWORD = `TestPass789${RUN_ID}`

test.describe('Mobile Smoke - Real Supabase Auth', () => {
  test.use({ serviceWorkers: 'allow' })

  test('Mobile viewport - auth and recovery smoke', async ({ page, context, browser }) => {
    // Verify actual viewport (must be 390×844 for real mobile certification)
    const viewport = page.viewportSize()
    console.log('Mobile smoke: Actual viewport observed:', viewport)
    expect(viewport.width).toBe(390)
    expect(viewport.height).toBe(844)

    // TEST: Unauthenticated route protection
    console.log('Mobile smoke: Unauthenticated route protection')
    
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    const dashboardHidden = await page.locator('#dashboard').isVisible().catch(() => false)
    expect(dashboardHidden).toBe(false)

    const loginVisible = await page.locator('#loginForm').isVisible().catch(() => false)
    expect(loginVisible).toBe(true)

    // TEST: Signup flow
    console.log('Mobile smoke: Signup flow')

    await page.getByRole('link', { name: 'S\'inscrire' }).click()
    await page.waitForSelector('#registerForm', { state: 'visible', timeout: 10000 })

    console.log(`Mobile smoke: Using email ${ACCOUNT_A_EMAIL}`)
    await page.fill('#registerUsername', ACCOUNT_A_USERNAME)
    await page.fill('#registerEmail', ACCOUNT_A_EMAIL)
    await page.fill('#registerPassword', ACCOUNT_A_PASSWORD)
    await page.fill('#registerPasswordConfirm', ACCOUNT_A_PASSWORD)
    
    const termsCheckbox = page.locator('#registerTerms')
    if (await termsCheckbox.isVisible()) {
      await termsCheckbox.check()
    }

    // Capture timestamp BEFORE signup (email may be emitted during submission)
    const signupTimestamp = Date.now()

    // Capture all console logs for comprehensive diagnostics
    const consoleMessages = []
    page.on('console', msg => {
      const text = msg.text()
      const type = msg.type()
      consoleMessages.push({ type, text })
      console.log(`Mobile smoke: Console [${type}]: ${text}`)
    })

    await page.click('#registerForm button[type="submit"]')
    await page.waitForTimeout(2000)

    console.log('Mobile smoke: Total console messages:', consoleMessages.length)

    // TEST: Confirmation
    console.log('Mobile smoke: Email confirmation')

    const confirmation = await pollForEmail({
      recipient: ACCOUNT_A_EMAIL,
      type: 'confirmation',
      afterTimestamp: signupTimestamp
    })
    expect(confirmation.found).toBe(true)

    const confirmContext = await browser.newContext()
    const confirmPage = await confirmContext.newPage()
    await confirmPage.goto(confirmation.link)
    await confirmPage.waitForLoadState('networkidle')
    await confirmPage.waitForTimeout(3000)
    await confirmContext.close()

    // TEST: Login
    console.log('Mobile smoke: Confirmed login')

    await page.goto('/')
    await page.waitForLoadState('networkidle')

    await page.fill('#loginEmail', ACCOUNT_A_EMAIL)
    await page.fill('#loginPassword', ACCOUNT_A_PASSWORD)
    await page.click('#loginForm button[type="submit"]')

    await page.waitForSelector('#dashboard', { state: 'visible', timeout: 15000 })

    const authenticatedDashboard = await page.locator('#dashboard').isVisible()
    expect(authenticatedDashboard).toBe(true)

    // TEST: Session persistence
    console.log('Mobile smoke: Session persistence')

    await page.reload()
    await page.waitForLoadState('networkidle')

    const reloadDashboard = await page.locator('#dashboard').isVisible()
    expect(reloadDashboard).toBe(true)

    // TEST: Logout
    console.log('Mobile smoke: Logout')

    await page.getByRole('button', { name: /déconnexion|logout/i }).first().click()
    await page.waitForTimeout(2000)

    const afterLogoutLogin = await page.locator('#loginForm').isVisible().catch(() => false)
    const afterLogoutDashboard = await page.locator('#dashboard').isVisible().catch(() => false)
    
    expect(afterLogoutLogin).toBe(true)
    expect(afterLogoutDashboard).toBe(false)

    // TEST: Reset password route
    console.log('Mobile smoke: Reset password route')

    await page.getByRole('link', { name: /mot de passe oublié/i }).click()
    await page.waitForSelector('#forgotPasswordForm', { state: 'visible', timeout: 10000 })

    const forgotFormVisible = await page.locator('#forgotPasswordForm').isVisible()
    expect(forgotFormVisible).toBe(true)

    const dashboardDuringForgot = await page.locator('#dashboard').isVisible().catch(() => false)
    expect(dashboardDuringForgot).toBe(false)

    console.log('Mobile smoke tests PASSED')
  })
})
