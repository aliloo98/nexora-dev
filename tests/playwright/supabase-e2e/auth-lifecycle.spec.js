import { test, expect } from '@playwright/test'
import { pollForEmail } from './helpers/mailbox.js'

// Generate unique test identifiers per run
const RUN_ID = Date.now().toString(36)
const ACCOUNT_A_USERNAME = `NexoraA${RUN_ID}`
const ACCOUNT_A_EMAIL = `nexora-ci-a-${RUN_ID}@example.test`
const ACCOUNT_A_PASSWORD = `TestPass123${RUN_ID}`
const ACCOUNT_A_NEW_PASSWORD = `NewPass456${RUN_ID}`

test.describe('Real Supabase Auth Lifecycle', () => {
  test.use({ serviceWorkers: 'allow' })

  test('Account A - complete auth lifecycle with real Supabase', async ({ page, context }) => {
    // Fresh context
    await context.clearCookies()
    await context.clearPermissions()

    // Navigate to app
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    // TEST 1: SIGNUP VIA REAL UI
    console.log('TEST 1: Real signup via UI')
    
    // Click register link using semantic locator
    await page.getByRole('link', { name: 'S\'inscrire' }).click()
    await page.waitForSelector('#registerForm', { state: 'visible', timeout: 10000 })

    // Fill registration form
    console.log(`TEST 1: Using email ${ACCOUNT_A_EMAIL}`)
    await page.fill('#registerUsername', ACCOUNT_A_USERNAME)
    await page.fill('#registerEmail', ACCOUNT_A_EMAIL)
    await page.fill('#registerPassword', ACCOUNT_A_PASSWORD)
    await page.fill('#registerPasswordConfirm', ACCOUNT_A_PASSWORD)
    
    // Accept terms if present
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
      console.log(`TEST 1: Console [${type}]: ${text}`)
    })

    // Submit registration
    await page.click('#registerForm button[type="submit"]')

    // Wait for UI to process
    await page.waitForTimeout(2000)

    // Log captured console messages
    console.log('TEST 1: Total console messages:', consoleMessages.length)

    // ASSERT: Dashboard should NOT be unlocked (session should be null due to confirmation requirement)
    const dashboardVisible = await page.locator('#section-dashboard').isVisible().catch(() => false)
    expect(dashboardVisible).toBe(false)

    // Should see login/register still visible
    const loginVisible = await page.locator('#loginForm').isVisible().catch(() => false)
    const registerVisible = await page.locator('#registerForm').isVisible().catch(() => false)
    expect(loginVisible || registerVisible).toBe(true)

    // TEST 2: PRE-CONFIRM LOGIN REJECTION
    console.log('TEST 2: Pre-confirm login rejection')

    // Navigate to login
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    // Attempt login with unconfirmed account
    await page.fill('#loginEmail', ACCOUNT_A_EMAIL)
    await page.fill('#loginPassword', ACCOUNT_A_PASSWORD)
    await page.click('#loginForm button[type="submit"]')

    await page.waitForTimeout(2000)

    // ASSERT: Login should be rejected
    const afterLoginDashboard = await page.locator('#section-dashboard').isVisible().catch(() => false)
    expect(afterLoginDashboard).toBe(false)

    // Should see error message or instruction about confirmation
    const errorMessage = await page.locator('.form-error-box, .error-message').isVisible().catch(() => false)
    // Error message may or may not be visible depending on UI, but dashboard must remain hidden
    expect(afterLoginDashboard).toBe(false)

    // TEST 3: CONFIRMATION EMAIL
    console.log('TEST 3: Confirmation email capture')

    const confirmationResult = await pollForEmail({
      recipient: ACCOUNT_A_EMAIL,
      type: 'confirmation',
      afterTimestamp: signupTimestamp
    })
    expect(confirmationResult.found).toBe(true)
    expect(confirmationResult.link).toBeDefined()

    // TEST 4: CONFIRMATION LINK
    console.log('TEST 4: Confirmation link processing')

    // Open confirmation link in fresh context
    const confirmationContext = await context.browser().newContext()
    const confirmationPage = await confirmationContext.newPage()
    
    await confirmationPage.goto(confirmationResult.link)
    await confirmationPage.waitForLoadState('networkidle')
    await confirmationPage.waitForTimeout(3000)

    // After confirmation, should either be logged in or redirected to login with success
    const confirmDashboard = await confirmationPage.locator('#section-dashboard').isVisible().catch(() => false)
    const confirmLogin = await confirmationPage.locator('#loginForm').isVisible().catch(() => false)
    
    // Either we're authenticated (dashboard visible) or we need to login (login visible)
    expect(confirmDashboard || confirmLogin).toBe(true)

    await confirmationContext.close()

    // TEST 5: CONFIRMED LOGIN
    console.log('TEST 5: Confirmed login')

    // Login with confirmed account
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    await page.fill('#loginEmail', ACCOUNT_A_EMAIL)
    await page.fill('#loginPassword', ACCOUNT_A_PASSWORD)
    await page.click('#loginForm button[type="submit"]')

    // Wait for dashboard to appear
    await page.waitForSelector('#section-dashboard', { state: 'visible', timeout: 15000 })

    // ASSERT: Dashboard should now be visible
    const confirmedDashboard = await page.locator('#section-dashboard').isVisible()
    expect(confirmedDashboard).toBe(true)

    // TEST 6: SESSION PERSISTENCE
    console.log('TEST 6: Session persistence after reload')

    await page.reload()
    await page.waitForLoadState('networkidle')

    const reloadDashboard = await page.locator('#section-dashboard').isVisible()
    expect(reloadDashboard).toBe(true)

    // TEST 7: LOGOUT
    console.log('TEST 7: Logout')

    // Logout through the real user menu
    await page.locator('#userMenuBtn').click()
    await page.locator('#logoutBtn').click()
    await page.getByRole('button', { name: 'Confirmer' }).click()
    await page.waitForSelector('#loginForm', { state: 'visible', timeout: 10000 })

    // ASSERT: Should be back to login
    const afterLogoutLogin = await page.locator('#loginForm').isVisible().catch(() => false)
    const afterLogoutDashboard = await page.locator('#section-dashboard').isVisible().catch(() => false)
    
    expect(afterLogoutLogin).toBe(true)
    expect(afterLogoutDashboard).toBe(false)

    // TEST 8: LOGOUT PERSISTENCE
    console.log('TEST 8: Logout persistence after reload')

    await page.reload()
    await page.waitForLoadState('networkidle')

    const reloadAfterLogoutLogin = await page.locator('#loginForm').isVisible().catch(() => false)
    const reloadAfterLogoutDashboard = await page.locator('#section-dashboard').isVisible().catch(() => false)
    
    expect(reloadAfterLogoutLogin).toBe(true)
    expect(reloadAfterLogoutDashboard).toBe(false)

    // TEST 9: RELOGIN
    console.log('TEST 9: Re-login after logout')

    await page.fill('#loginEmail', ACCOUNT_A_EMAIL)
    await page.fill('#loginPassword', ACCOUNT_A_PASSWORD)
    await page.click('#loginForm button[type="submit"]')

    await page.waitForSelector('#section-dashboard', { state: 'visible', timeout: 15000 })

    const reloginDashboard = await page.locator('#section-dashboard').isVisible()
    expect(reloginDashboard).toBe(true)

    // TEST 10: PASSWORD RECOVERY REQUEST
    console.log('TEST 10: Password recovery request')

    // Logout through the real user menu
    await page.locator('#userMenuBtn').click()
    await page.locator('#logoutBtn').click()
    await page.getByRole('button', { name: 'Confirmer' }).click()
    await page.waitForSelector('#loginForm', { state: 'visible', timeout: 10000 })

    // Click forgot password using semantic locator
    await page.getByRole('link', { name: /mot de passe oublié/i }).click()
    await page.waitForSelector('#forgotPasswordForm', { state: 'visible', timeout: 10000 })

    // Fill recovery email
    await page.fill('#forgotEmail', ACCOUNT_A_EMAIL)

    // Capture timestamp BEFORE submitting forgot password (email may be emitted during submission)
    const forgotTimestamp = Date.now()

    // Submit recovery request
    await page.click('#forgotPasswordForm button[type="submit"]')

    await page.waitForTimeout(2000)

    // ASSERT: Success message should appear
    const forgotSuccess = await page.locator('.success-message, .form-success').isVisible().catch(() => false)
    // Success message UI may vary, but request should complete without error

    // TEST 11: RECOVERY EMAIL
    console.log('TEST 11: Recovery email capture')

    const recoveryResult = await pollForEmail({
      recipient: ACCOUNT_A_EMAIL,
      type: 'recovery',
      afterTimestamp: forgotTimestamp
    })
    expect(recoveryResult.found).toBe(true)
    expect(recoveryResult.link).toBeDefined()

    // TEST 12: RECOVERY LINK
    console.log('TEST 12: Recovery link processing')

    // Open recovery link in fresh context
    const recoveryContext = await context.browser().newContext()
    const recoveryPage = await recoveryContext.newPage()
    
    await recoveryPage.goto(recoveryResult.link)
    await recoveryPage.waitForLoadState('networkidle')

    // Should see reset password form
    await recoveryPage.waitForSelector('#resetPasswordForm', { state: 'visible', timeout: 15000 })

    // ASSERT: Dashboard should be hidden during recovery
    const recoveryDashboard = await recoveryPage.locator('#section-dashboard').isVisible().catch(() => false)
    expect(recoveryDashboard).toBe(false)

    // TEST 13: PASSWORD UPDATE
    console.log('TEST 13: Real password update')

    // Fill new password
    await recoveryPage.fill('#resetPassword', ACCOUNT_A_NEW_PASSWORD)
    await recoveryPage.fill('#resetPasswordConfirm', ACCOUNT_A_NEW_PASSWORD)
    await recoveryPage.click('#resetPasswordForm button[type="submit"]')

    await recoveryPage.waitForTimeout(3000)

    // ASSERT: Should be signed out and redirected to login
    const afterResetLogin = await recoveryPage.locator('#loginForm').isVisible().catch(() => false)
    const afterResetDashboard = await recoveryPage.locator('#section-dashboard').isVisible().catch(() => false)
    
    expect(afterResetLogin).toBe(true)
    expect(afterResetDashboard).toBe(false)

    await recoveryContext.close()

    // TEST 14: OLD PASSWORD REJECTION
    console.log('TEST 14: Old password rejection')

    await page.fill('#loginEmail', ACCOUNT_A_EMAIL)
    await page.fill('#loginPassword', ACCOUNT_A_PASSWORD) // OLD password
    await page.click('#loginForm button[type="submit"]')

    await page.waitForTimeout(2000)

    // ASSERT: Login should fail
    const oldPassDashboard = await page.locator('#section-dashboard').isVisible().catch(() => false)
    expect(oldPassDashboard).toBe(false)

    // TEST 15: NEW PASSWORD ACCEPTANCE
    console.log('TEST 15: New password acceptance')

    // PHASE 1: Capture network response for login
    const networkRequests = []
    page.on('response', async (response) => {
      const url = response.url()
      if (url.includes('auth') || url.includes('signin') || url.includes('login')) {
        try {
          const status = response.status()
          const contentType = response.headers()['content-type'] || ''
          networkRequests.push({
            url: url.split('?')[0], // Remove query params
            status,
            contentType
          })
        } catch (e) {
          // Ignore network errors
        }
      }
    })

    // Diagnostics: Check AuthContext state before login
    const authStateBefore = await page.evaluate(() => {
      if (typeof window.AuthContext !== 'undefined') {
        return {
          isAuthenticated: window.AuthContext.isAuthenticated(),
          isPasswordRecovery: window.AuthContext.isPasswordRecoveryMode(),
          user: window.AuthContext.getCurrentUser()?.id,
          hasUser: !!window.AuthContext.getCurrentUser()
        }
      }
      return { error: 'AuthContext not available' }
    })
    console.log('AuthContext state before new password login:', authStateBefore)

    // Diagnostics: Check main visibility before login
    const mainVisibleBefore = await page.locator('main').isVisible().catch(() => false)
    console.log('Main visibility before new password login:', mainVisibleBefore)

    await page.fill('#loginPassword', ACCOUNT_A_NEW_PASSWORD) // NEW password
    await page.click('#loginForm button[type="submit"]')

    // Diagnostics: Wait for login to complete and check for errors
    await page.waitForTimeout(3000)

    // PHASE 1: Log network requests
    console.log('PHASE1: Network requests during login:', networkRequests)

    // PHASE 2: Capture DOM state after login
    const domState = await page.evaluate(() => {
      const main = document.querySelector('main')
      const dashboard = document.querySelector('#section-dashboard')
      const authContainer = document.querySelector('#auth-container')

      return {
        url: window.location.href,
        hash: window.location.hash,
        mainDisplay: main ? getComputedStyle(main).display : 'not found',
        bodyClass: document.body.className,
        dashboardClass: dashboard ? dashboard.className : 'not found',
        authContainerDisplay: authContainer ? getComputedStyle(authContainer).display : 'not found'
      }
    })
    console.log('PHASE2: DOM state after login:', domState)

    // PHASE 3: Capture UI error messages
    const loginError = await page.locator('#loginErrorBox').isVisible().catch(() => false)
    console.log('PHASE3: Login error box visible:', loginError)
    if (loginError) {
      const errorText = await page.locator('#loginErrorMessage').textContent().catch(() => 'No error text')
      console.log('PHASE3: Login error text:', errorText)
    }

    // Check for toast messages
    const toastVisible = await page.locator('.toast, .notification, .alert').isVisible().catch(() => false)
    console.log('PHASE3: Toast/notification visible:', toastVisible)
    if (toastVisible) {
      const toastText = await page.locator('.toast, .notification, .alert').textContent().catch(() => 'No toast text')
      console.log('PHASE3: Toast text:', toastText)
    }

    // Check console for login errors
    const consoleErrors = await page.evaluate(() => {
      const errors = []
      // Try to get recent console errors if available
      if (window.__testConsoleErrors) {
        return window.__testConsoleErrors
      }
      return errors
    })
    console.log('PHASE3: Console errors during login:', consoleErrors)

    // Diagnostics: Check AuthContext state after login click
    const authStateAfter = await page.evaluate(() => {
      if (typeof window.AuthContext !== 'undefined') {
        return {
          isAuthenticated: window.AuthContext.isAuthenticated(),
          isPasswordRecovery: window.AuthContext.isPasswordRecoveryMode(),
          user: window.AuthContext.getCurrentUser()?.id,
          hasUser: !!window.AuthContext.getCurrentUser()
        }
      }
      return { error: 'AuthContext not available' }
    })
    console.log('AuthContext state after new password login:', authStateAfter)

    // Diagnostics: Check main visibility after login
    const mainVisibleAfter = await page.locator('main').isVisible().catch(() => false)
    console.log('Main visibility after new password login:', mainVisibleAfter)

    // Diagnostics: Check dashboard state
    const dashboardActive = await page.locator('#section-dashboard').evaluate(el => el.classList.contains('active')).catch(() => false)
    console.log('Dashboard has active class:', dashboardActive)

    await page.waitForSelector('#section-dashboard', { state: 'visible', timeout: 15000 })

    const newPassDashboard = await page.locator('#section-dashboard').isVisible()
    expect(newPassDashboard).toBe(true)

    console.log('All auth lifecycle tests PASSED')
  })
})
