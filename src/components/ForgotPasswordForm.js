/**
 * Nexora - Forgot Password Form Component
 *
 * Renders a form for password recovery email request.
 * Handles validation and submission.
 */

import { shouldUsePlaceholderAuth } from '../auth/authService.js'
import { showToast } from '../../js/utils.js'

/**
 * Create Forgot Password Form HTML
 * Returns HTML string for forgot password form
 */
export const createForgotPasswordForm = () => {
  const isPlaceholder = shouldUsePlaceholderAuth()

  if (isPlaceholder) {
    return `
    <div class="auth-form-container">
      <div class="auth-form-card">
        <div class="auth-form-header">
          <img src="/icon-192.png" alt="NEXORA logo" class="auth-form-logo-img" />
          <h1 class="auth-form-title">NEXORA</h1>
          <p class="auth-form-subtitle">Récupération de mot de passe</p>
        </div>

        <div class="form-error-box" style="display: flex;">
          <span>La récupération de mot de passe est temporairement indisponible en mode développement.</span>
        </div>

        <div class="auth-form-footer">
          <p><a href="#" onclick="switchToLogin(event); return false;" class="auth-link">Retour à la connexion</a></p>
        </div>
      </div>
    </div>
    `
  }

  return `
    <div class="auth-form-container">
      <div class="auth-form-card">
        <div class="auth-form-header">
          <img src="/icon-192.png" alt="NEXORA logo" class="auth-form-logo-img" />
          <h1 class="auth-form-title">NEXORA</h1>
          <p class="auth-form-subtitle">Mot de passe oublié ?</p>
        </div>

        <form id="forgotPasswordForm" class="auth-form">
          <!-- Email Input -->
          <div class="form-group">
            <label for="forgotEmail" class="form-label">Email</label>
            <input
              type="email"
              id="forgotEmail"
              name="email"
              class="form-input"
              placeholder="votre@email.com"
              required
              autocomplete="email"
            />
            <span class="form-error" id="forgotEmailError"></span>
          </div>

          <!-- Error Message -->
          <div class="form-error-box" id="forgotErrorBox" style="display: none;">
            <span id="forgotErrorMessage"></span>
          </div>

          <!-- Loading State -->
          <div class="form-loading" id="forgotLoading" style="display: none;">
            <span class="spinner"></span>
            <span>Envoi en cours...</span>
          </div>

          <!-- Submit Button -->
          <button
            type="submit"
            id="forgotSubmitBtn"
            class="btn btn-primary btn-large"
            style="width: 100%; margin-top: 1rem;"
          >
            Envoyer l'email de récupération
          </button>
        </form>

        <!-- Link to Login -->
        <div class="auth-form-footer">
          <p><a href="#" onclick="switchToLogin(event); return false;" class="auth-link">Retour à la connexion</a></p>
        </div>
      </div>
    </div>
  `
}

/**
 * Attach Forgot Password Form Event Listeners
 * Sets up form submission and validation
 */
export const attachForgotPasswordFormListeners = () => {
  const form = document.getElementById('forgotPasswordForm')
  if (!form) return

  const isPlaceholder = shouldUsePlaceholderAuth()
  if (isPlaceholder) return

  const emailInput = document.getElementById('forgotEmail')
  const submitBtn = document.getElementById('forgotSubmitBtn')
  const errorBox = document.getElementById('forgotErrorBox')
  const errorMessage = document.getElementById('forgotErrorMessage')
  const loadingBox = document.getElementById('forgotLoading')

  // Form submission
  form.addEventListener('submit', async (e) => {
    e.preventDefault()

    // Clear errors
    errorBox.style.display = 'none'
    loadingBox.style.display = 'none'

    const email = emailInput.value.trim()

    // Validation
    if (!email) {
      errorMessage.textContent = 'Veuillez entrer votre adresse email'
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
      const { AuthService } = await import('../auth/authService.js')
      const { error } = await AuthService.resetPassword(email)

      if (error) {
        errorMessage.textContent = error.message || 'Erreur lors de l\'envoi. Réessayez.'
        errorBox.style.display = 'flex'
        console.error('Forgot password error:', error)
        return
      }

      // Success - neutral message
      showToast('✅ Si cette adresse est associée à un compte, vous recevrez un email de récupération.')

      // Return to login after delay
      setTimeout(() => {
        if (typeof window.switchToLogin === 'function') {
          window.switchToLogin()
        }
      }, 3000)
    } catch (error) {
      console.error('Forgot password exception:', error)
      errorMessage.textContent = 'Une erreur est survenue. Réessayez.'
      errorBox.style.display = 'flex'
    } finally {
      submitBtn.disabled = false
      loadingBox.style.display = 'none'
    }
  })

  // Real-time validation
  emailInput.addEventListener('blur', () => {
    if (emailInput.value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailInput.value)) {
      document.getElementById('forgotEmailError').textContent = 'Email invalide'
    } else {
      document.getElementById('forgotEmailError').textContent = ''
    }
  })
}

export default { createForgotPasswordForm, attachForgotPasswordFormListeners }
