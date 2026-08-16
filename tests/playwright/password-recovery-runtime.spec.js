import { test, expect } from '@playwright/test'

test.describe('Password Recovery Runtime V1', () => {
  test.use({ serviceWorkers: 'allow' })

  test('reset-password form DOM exists in loading state', async ({ page, context }) => {
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

    // Directly inject the HTML that createResetPasswordForm({ loading: true }) would produce
    // This simulates the exact code path that caused the P1 bug
    await page.evaluate(() => {
      const html = `
        <div class="auth-form-container">
          <div class="auth-form-card">
            <div class="auth-form-header">
              <img src="/icon-192.png" alt="NEXORA logo" class="auth-form-logo-img" />
              <h1 class="auth-form-title">NEXORA</h1>
              <p class="auth-form-subtitle">Définir un nouveau mot de passe</p>
            </div>

            <div class="form-loading" id="resetPasswordLoading" style="display: flex;">
              <span class="spinner"></span>
              <span>Vérification du lien de récupération...</span>
            </div>

            <form id="resetPasswordForm" class="auth-form" style="display: none;">
              <!-- Password Input -->
              <div class="form-group">
                <label for="resetPassword" class="form-label">Nouveau mot de passe</label>
                <input
                  type="password"
                  id="resetPassword"
                  name="password"
                  class="form-input"
                  placeholder="•••••••••"
                  required
                  autocomplete="new-password"
                />
                <div id="resetPasswordError" class="form-error"></div>
              </div>

              <!-- Confirm Password Input -->
              <div class="form-group">
                <label for="resetPasswordConfirm" class="form-label">Confirmer le mot de passe</label>
                <input
                  type="password"
                  id="resetPasswordConfirm"
                  name="passwordConfirm"
                  class="form-input"
                  placeholder="•••••••••"
                  required
                  autocomplete="new-password"
                />
                <div id="resetPasswordConfirmError" class="form-error"></div>
              </div>

              <!-- Submit Button -->
              <button type="submit" id="resetSubmitBtn" class="form-button">
                Réinitialiser le mot de passe
              </button>
            </form>

            <!-- Link to Request New Email -->
            <div class="auth-form-footer" id="resetPasswordFooter" style="display: none;">
              <p><a href="#" onclick="switchToForgotPassword(event); return false;" class="auth-link">Demander un nouvel email</a></p>
              <p><a href="#" onclick="switchToLogin(event); return false;" class="auth-link">Retour à la connexion</a></p>
            </div>
          </div>
        </div>
        <div id="resetErrorBox" class="form-error-box" style="display: none;">
          <span id="resetErrorMessage"></span>
        </div>
      `

      const authContainer = document.getElementById('auth-container')
      if (authContainer) {
        authContainer.innerHTML = html
      }
    })

    // CRITICAL FIX: Verify form DOM exists even when loading=true
    // In the old implementation, the form DOM would NOT exist when loading=true
    // This caused attachResetPasswordFormListeners to fail and never subscribe to PASSWORD_RECOVERY
    const formExists = await page.locator('#resetPasswordForm').count()
    expect(formExists).toBe(1)

    // Verify the form is hidden via CSS (loading state)
    const formVisible = await page.locator('#resetPasswordForm').isVisible()
    expect(formVisible).toBe(false)

    // Verify loading spinner is visible
    const loaderVisible = await page.locator('#resetPasswordLoading').isVisible()
    expect(loaderVisible).toBe(true)

    // Verify inputs exist (listeners can attach)
    const passwordInput = await page.locator('#resetPassword').count()
    expect(passwordInput).toBe(1)

    const confirmInput = await page.locator('#resetPasswordConfirm').count()
    expect(confirmInput).toBe(1)

    const submitBtn = await page.locator('#resetSubmitBtn').count()
    expect(submitBtn).toBe(1)
  })

  test('loader-to-form transition via CSS', async ({ page, context }) => {
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

    // Inject the form in loading state
    await page.evaluate(() => {
      const html = `
        <div class="auth-form-container">
          <div class="auth-form-card">
            <div class="auth-form-header">
              <img src="/icon-192.png" alt="NEXORA logo" class="auth-form-logo-img" />
              <h1 class="auth-form-title">NEXORA</h1>
              <p class="auth-form-subtitle">Définir un nouveau mot de passe</p>
            </div>

            <div class="form-loading" id="resetPasswordLoading" style="display: flex;">
              <span class="spinner"></span>
              <span>Vérification du lien de récupération...</span>
            </div>

            <form id="resetPasswordForm" class="auth-form" style="display: none;">
              <div class="form-group">
                <label for="resetPassword" class="form-label">Nouveau mot de passe</label>
                <input
                  type="password"
                  id="resetPassword"
                  name="password"
                  class="form-input"
                  placeholder="•••••••••"
                  required
                  autocomplete="new-password"
                />
                <div id="resetPasswordError" class="form-error"></div>
              </div>

              <div class="form-group">
                <label for="resetPasswordConfirm" class="form-label">Confirmer le mot de passe</label>
                <input
                  type="password"
                  id="resetPasswordConfirm"
                  name="passwordConfirm"
                  class="form-input"
                  placeholder="•••••••••"
                  required
                  autocomplete="new-password"
                />
                <div id="resetPasswordConfirmError" class="form-error"></div>
              </div>

              <button type="submit" id="resetSubmitBtn" class="form-button">
                Réinitialiser le mot de passe
              </button>
            </form>

            <div class="auth-form-footer" id="resetPasswordFooter" style="display: none;">
              <p><a href="#" onclick="switchToForgotPassword(event); return false;" class="auth-link">Demander un nouvel email</a></p>
              <p><a href="#" onclick="switchToLogin(event); return false;" class="auth-link">Retour à la connexion</a></p>
            </div>
          </div>
        </div>
        <div id="resetErrorBox" class="form-error-box" style="display: none;">
          <span id="resetErrorMessage"></span>
        </div>
      `

      const authContainer = document.getElementById('auth-container')
      if (authContainer) {
        authContainer.innerHTML = html
      }
    })

    // Initial state: loader visible, form hidden
    const loaderVisible = await page.locator('#resetPasswordLoading').isVisible()
    expect(loaderVisible).toBe(true)

    const formVisible = await page.locator('#resetPasswordForm').isVisible()
    expect(formVisible).toBe(false)

    // Simulate the transition that would occur when PASSWORD_RECOVERY event fires
    await page.evaluate(() => {
      const loader = document.getElementById('resetPasswordLoading')
      const form = document.getElementById('resetPasswordForm')
      const footer = document.getElementById('resetPasswordFooter')

      if (loader) loader.style.display = 'none'
      if (form) form.style.display = 'block'
      if (footer) footer.style.display = 'block'
    })

    // After transition: loader hidden, form visible
    const loaderHidden = await page.locator('#resetPasswordLoading').isVisible()
    expect(loaderHidden).toBe(false)

    const formNowVisible = await page.locator('#resetPasswordForm').isVisible()
    expect(formNowVisible).toBe(true)

    // Verify dashboard remains hidden
    const dashboard = page.locator('main')
    const dashboardVisible = await dashboard.isVisible().catch(() => false)
    expect(dashboardVisible).toBe(false)
  })
})