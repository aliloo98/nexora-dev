/**
 * Nexora - Login Form Component
 *
 * Renders a modern, responsive login form.
 * Handles validation and submission.
 *
 * TODO: Update styles when theme system is integrated
 */

import AuthContext from '../auth/authContext.js'
import { shouldUsePlaceholderAuth } from '../auth/authService.js'

/**
 * Create Login Form HTML
 * Returns HTML string for login form
 */
export const createLoginForm = ({ demoModeEnabled = shouldUsePlaceholderAuth() } = {}) => {
  const demoButton = demoModeEnabled
    ? `
          <button
            type="button"
            id="loginDemoBtn"
            class="btn btn-secondary btn-outline"
            style="width: 100%; margin-top: 0.5rem;"
            title="Démonstration avec données fictives"
          >
            🧪 Mode test
          </button>`
    : ''
  const authStatusCopy = demoModeEnabled
    ? 'Mode local de développement actif.'
    : 'Authentification Supabase active.'

  return `
    <div class="auth-form-container">
      <div class="auth-form-card">
        <div class="auth-form-header">
          <img src="/icon-192.png" alt="NEXORA logo" class="auth-form-logo-img" />
          <h1 class="auth-form-title">NEXORA</h1>
          <p class="auth-form-subtitle">Connectez-vous à votre compte</p>
        </div>

        <form id="loginForm" class="auth-form">
          <!-- Email Input -->
          <div class="form-group">
            <label for="loginEmail" class="form-label">Email</label>
            <input
              type="email"
              id="loginEmail"
              name="email"
              class="form-input"
              placeholder="votre@email.com"
              required
              autocomplete="email"
            />
            <span class="form-error" id="loginEmailError"></span>
          </div>

          <!-- Password Input -->
          <div class="form-group">
            <label for="loginPassword" class="form-label">Mot de passe</label>
            <input
              type="password"
              id="loginPassword"
              name="password"
              class="form-input"
              placeholder="••••••••"
              required
              autocomplete="current-password"
            />
            <span class="form-error" id="loginPasswordError"></span>
          </div>

          <!-- Error Message -->
          <div class="form-error-box" id="loginErrorBox" style="display: none;">
            <span id="loginErrorMessage"></span>
          </div>

          <!-- Loading State -->
          <div class="form-loading" id="loginLoading" style="display: none;">
            <span class="spinner"></span>
            <span>Connexion en cours...</span>
          </div>

          <!-- Submit Button -->
          <button
            type="submit"
            id="loginSubmitBtn"
            class="btn btn-primary btn-large"
            style="width: 100%; margin-top: 1rem;"
          >
            Se connecter
          </button>

          ${demoButton}
        </form>

        <!-- Link to Register -->
        <div class="auth-form-footer">
          <p>Pas encore de compte? <a href="#" onclick="switchToRegister(event); return false;" class="auth-link">S'inscrire</a></p>
          <p style="font-size: 12px; color: var(--text2); margin-top: 1rem;">
            🔐 ${authStatusCopy}
          </p>
        </div>
      </div>
    </div>
  `
}

/**
 * Attach Login Form Event Listeners
 * Sets up form submission and validation
 */
export const attachLoginFormListeners = () => {
  const form = document.getElementById('loginForm')
  const emailInput = document.getElementById('loginEmail')
  const passwordInput = document.getElementById('loginPassword')
  const submitBtn = document.getElementById('loginSubmitBtn')
  const demoBtn = document.getElementById('loginDemoBtn')
  const errorBox = document.getElementById('loginErrorBox')
  const errorMessage = document.getElementById('loginErrorMessage')
  const loadingBox = document.getElementById('loginLoading')

  if (!form) return

  // Form submission
  form.addEventListener('submit', async (e) => {
    e.preventDefault()

    // Clear errors
    errorBox.style.display = 'none'
    loadingBox.style.display = 'none'

    const email = emailInput.value.trim()
    const password = passwordInput.value

    // Validation
    if (!email || !password) {
      errorMessage.textContent = 'Veuillez remplir tous les champs'
      errorBox.style.display = 'flex'
      return
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errorMessage.textContent = 'Veuillez entrer un email valide'
      errorBox.style.display = 'flex'
      return
    }

    // Show loading state
    submitBtn.disabled = true
    loadingBox.style.display = 'flex'

    try {

      // Call auth context
      const { user, error } = await AuthContext.signIn(email, password)

      if (error) {
        errorMessage.textContent = error.message || 'Erreur de connexion. Réessayez.'
        errorBox.style.display = 'flex'
        console.error('Login error:', error)
        return
      }

      // Success - navigate to dashboard
      window.showToast('✅ Connecté avec succès!')

      // Simulate page transition: defer navigation but avoid stomping a
      // user-initiated navigation that happened in the meantime.
      const _expectedHash = window.location.hash
      setTimeout(() => {
        const currentHash = window.location.hash
        const userAlreadyNavigated = currentHash && currentHash !== _expectedHash && currentHash !== '#section-dashboard'
        if (userAlreadyNavigated) return

        window.location.hash = '#section-dashboard'
        window.showSection?.('dashboard')
      }, 500)
    } catch (error) {
      console.error('Login exception:', error)
      errorMessage.textContent = 'Une erreur est survenue. Réessayez.'
      errorBox.style.display = 'flex'
    } finally {
      submitBtn.disabled = false
      loadingBox.style.display = 'none'
    }
  })

  // Demo mode
  demoBtn?.addEventListener('click', async (e) => {
    e.preventDefault()

    // Populate with demo credentials
    emailInput.value = 'demo@nexora.local'
    passwordInput.value = 'demo123456'

    // Clear errors
    errorBox.style.display = 'none'

    // Show loading state
    demoBtn.disabled = true
    loadingBox.style.display = 'flex'

    try {
      // Call auth context with demo credentials
      const { user, error } = await AuthContext.signIn('demo@nexora.local', 'demo123456')

      if (error) {
        errorMessage.textContent = 'Erreur en mode test'
        errorBox.style.display = 'flex'
        return
      }
      window.showToast('✅ Mode test activé!')

      const _expectedHashDemo = window.location.hash
      setTimeout(() => {
        const currentHash = window.location.hash
        const userAlreadyNavigated = currentHash && currentHash !== _expectedHashDemo && currentHash !== '#section-dashboard'
        if (userAlreadyNavigated) return

        window.location.hash = '#section-dashboard'
        window.showSection?.('dashboard')
      }, 500)
    } catch (error) {
      console.error('Demo login error:', error)
      errorMessage.textContent = 'Erreur en mode test'
      errorBox.style.display = 'flex'
    } finally {
      demoBtn.disabled = false
      loadingBox.style.display = 'none'
    }
  })

  // Real-time validation
  emailInput.addEventListener('blur', () => {
    if (emailInput.value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailInput.value)) {
      document.getElementById('loginEmailError').textContent = 'Email invalide'
    } else {
      document.getElementById('loginEmailError').textContent = ''
    }
  })

  passwordInput.addEventListener('input', () => {
    if (passwordInput.value.length > 0 && passwordInput.value.length < 6) {
      document.getElementById('loginPasswordError').textContent = 'Au moins 6 caractères'
    } else {
      document.getElementById('loginPasswordError').textContent = ''
    }
  })
}

export default { createLoginForm, attachLoginFormListeners }
