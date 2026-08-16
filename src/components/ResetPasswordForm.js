/**
 * Nexora - Reset Password Form Component
 *
 * Renders a form for setting a new password after recovery.
 * Handles validation and submission.
 */

import { shouldUsePlaceholderAuth } from '../auth/authService.js'
import AuthContext from '../auth/authContext.js'
import { showToast } from '../../js/utils.js'

/**
 * Create Reset Password Form HTML
 * Returns HTML string for reset password form
 */
export const createResetPasswordForm = ({ loading = false } = {}) => {
  const isPlaceholder = shouldUsePlaceholderAuth()

  if (isPlaceholder) {
    return `
    <div class="auth-form-container">
      <div class="auth-form-card">
        <div class="auth-form-header">
          <img src="/icon-192.png" alt="NEXORA logo" class="auth-form-logo-img" />
          <h1 class="auth-form-title">NEXORA</h1>
          <p class="auth-form-subtitle">Définir un nouveau mot de passe</p>
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

  // Always render the form with loading state control
  // This ensures attachResetPasswordFormListeners can find the form DOM
  return `
    <div class="auth-form-container">
      <div class="auth-form-card">
        <div class="auth-form-header">
          <img src="/icon-192.png" alt="NEXORA logo" class="auth-form-logo-img" />
          <h1 class="auth-form-title">NEXORA</h1>
          <p class="auth-form-subtitle">Définir un nouveau mot de passe</p>
        </div>

        <div class="form-loading" id="resetPasswordLoading" style="display: ${loading ? 'flex' : 'none'};">
          <span class="spinner"></span>
          <span>Vérification du lien de récupération...</span>
        </div>

        <form id="resetPasswordForm" class="auth-form" style="display: ${loading ? 'none' : 'block'};">
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
            <span class="form-error" id="resetPasswordError"></span>
            <div class="form-hint">Au moins 6 caractères</div>
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
            <span class="form-error" id="resetPasswordConfirmError"></span>
          </div>

          <!-- Error Message -->
          <div class="form-error-box" id="resetErrorBox" style="display: none;">
            <span id="resetErrorMessage"></span>
          </div>

          <!-- Loading State -->
          <div class="form-loading" id="resetLoading" style="display: none;">
            <span class="spinner"></span>
            <span>Mise à jour en cours...</span>
          </div>

          <!-- Submit Button -->
          <button
            type="submit"
            id="resetSubmitBtn"
            class="btn btn-primary btn-large"
            style="width: 100%; margin-top: 1rem;"
          >
            Mettre à jour le mot de passe
          </button>
        </form>

        <!-- Link to Request New Email -->
        <div class="auth-form-footer" id="resetPasswordFooter" style="display: ${loading ? 'none' : 'block'};">
          <p><a href="#" onclick="switchToForgotPassword(event); return false;" class="auth-link">Demander un nouvel email</a></p>
          <p><a href="#" onclick="switchToLogin(event); return false;" class="auth-link">Retour à la connexion</a></p>
        </div>
      </div>
    </div>
    `
}

/**
 * Attach Reset Password Form Event Listeners
 * Sets up form submission and validation
 */
export const attachResetPasswordFormListeners = () => {
  const form = document.getElementById('resetPasswordForm')
  if (!form) return

  const isPlaceholder = shouldUsePlaceholderAuth()
  if (isPlaceholder) {
    setTimeout(() => {
      if (typeof window.switchToLogin === 'function') {
        window.switchToLogin()
      }
    }, 2000)
    return
  }

  const passwordInput = document.getElementById('resetPassword')
  const passwordConfirmInput = document.getElementById('resetPasswordConfirm')
  const submitBtn = document.getElementById('resetSubmitBtn')
  const errorBox = document.getElementById('resetErrorBox')
  const errorMessage = document.getElementById('resetErrorMessage')
  const loadingBox = document.getElementById('resetLoading')
  const initialLoadingBox = document.getElementById('resetPasswordLoading')
  const footer = document.getElementById('resetPasswordFooter')

  let formShown = false
  let unsubscribeRecovery = null

  // Listen for password recovery mode activation via AuthContext
  const checkRecoveryMode = () => {
    if (AuthContext.isPasswordRecoveryMode()) {
      // PASSWORD_RECOVERY event was received - show form
      showForm()
      return
    }

    // Subscribe to AuthContext changes to detect PASSWORD_RECOVERY event
    unsubscribeRecovery = AuthContext.subscribe(() => {
      if (AuthContext.isPasswordRecoveryMode() && !formShown) {
        showForm()
        // Unsubscribe after detection
        if (unsubscribeRecovery) {
          unsubscribeRecovery()
          unsubscribeRecovery = null
        }
      }
    })
  }

  const showError = (message) => {
    errorMessage.textContent = message
    errorBox.style.display = 'flex'
    form.style.display = 'none'
    if (initialLoadingBox) initialLoadingBox.style.display = 'none'
    if (footer) footer.style.display = 'block'
  }

  const showNewEmailButton = () => {
    if (footer) {
      footer.innerHTML = '<p><a href="#" onclick="switchToForgotPassword(event); return false;" class="auth-link">Demander un nouvel email de récupération</a></p>'
    }
  }

  const showForm = () => {
    formShown = true
    if (initialLoadingBox) initialLoadingBox.style.display = 'none'
    form.style.display = 'block'
    if (footer) footer.style.display = 'block'
  }

  const isFormShown = () => formShown

  // Check if already in recovery mode (event already fired)
  checkRecoveryMode()

  // Safety timeout - if no PASSWORD_RECOVERY event received
  const safetyTimeout = setTimeout(() => {
    if (!isFormShown()) {
      // Unsubscribe listener
      if (unsubscribeRecovery) {
        unsubscribeRecovery()
        unsubscribeRecovery = null
      }
      showError('Ce lien de récupération est invalide ou a expiré')
      showNewEmailButton()
    }
  }, 5000)

  // Return cleanup function for route changes
  const cleanup = () => {
    clearTimeout(safetyTimeout)
    if (unsubscribeRecovery) {
      unsubscribeRecovery()
      unsubscribeRecovery = null
    }
  }

  // Form submission
  form.addEventListener('submit', async (e) => {
    e.preventDefault()

    // Clear errors
    errorBox.style.display = 'none'
    loadingBox.style.display = 'none'

    const password = passwordInput.value
    const passwordConfirm = passwordConfirmInput.value

    // Validation
    let hasError = false

    if (!password || password.length < 6) {
      document.getElementById('resetPasswordError').textContent = 'Au moins 6 caractères'
      hasError = true
    }

    if (password !== passwordConfirm) {
      document.getElementById('resetPasswordConfirmError').textContent = 'Les mots de passe ne correspondent pas'
      hasError = true
    }

    if (hasError) return

    // Show loading state
    submitBtn.disabled = true
    loadingBox.style.display = 'flex'

    try {
      const { error } = await AuthContext.updatePassword(password)

      if (error) {
        errorMessage.textContent = error.message || 'Erreur lors de la mise à jour. Réessayez.'
        errorBox.style.display = 'flex'
        console.error('Reset password error:', error)
        return
      }

      // Success
      showToast('✅ Mot de passe mis à jour avec succès')

      // Exit password recovery mode
      AuthContext.exitPasswordRecoveryMode()

      // Sign out (Supabase refreshes session)
      await AuthContext.signOut()

      // Redirect to login
      setTimeout(() => {
        if (typeof window.switchToLogin === 'function') {
          window.switchToLogin()
        }
        showToast('Veuillez vous reconnecter avec votre nouveau mot de passe')
      }, 1500)
    } catch (error) {
      console.error('Reset password exception:', error)
      errorMessage.textContent = 'Une erreur est survenue. Réessayez.'
      errorBox.style.display = 'flex'
    } finally {
      submitBtn.disabled = false
      loadingBox.style.display = 'none'
    }
  })

  // Real-time validation
  passwordInput.addEventListener('input', () => {
    if (passwordInput.value.length > 0 && passwordInput.value.length < 6) {
      document.getElementById('resetPasswordError').textContent = 'Au moins 6 caractères'
    } else {
      document.getElementById('resetPasswordError').textContent = ''
    }

    if (passwordConfirmInput.value && passwordInput.value !== passwordConfirmInput.value) {
      document.getElementById('resetPasswordConfirmError').textContent = 'Les mots de passe ne correspondent pas'
    } else {
      document.getElementById('resetPasswordConfirmError').textContent = ''
    }
  })

  passwordConfirmInput.addEventListener('input', () => {
    if (passwordConfirmInput.value && passwordInput.value !== passwordConfirmInput.value) {
      document.getElementById('resetPasswordConfirmError').textContent = 'Les mots de passe ne correspondent pas'
    } else {
      document.getElementById('resetPasswordConfirmError').textContent = ''
    }
  })

  return cleanup
}

export default { createResetPasswordForm, attachResetPasswordFormListeners }
