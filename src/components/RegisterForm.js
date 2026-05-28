/**
 * Nexora - Register Form Component
 * 
 * Renders a modern, responsive registration form.
 * Handles validation and submission for new users.
 * 
 * TODO: Update styles when theme system is integrated
 */

import AuthContext from '../auth/authContext.js'

/**
 * Create Register Form HTML
 * Returns HTML string for registration form
 */
export const createRegisterForm = () => {
  return `
    <div class="auth-form-container">
      <div class="auth-form-card">
        <div class="auth-form-header">
          <div class="auth-form-logo">💰</div>
          <h1 class="auth-form-title">Nexora</h1>
          <p class="auth-form-subtitle">Créez votre compte</p>
        </div>

        <form id="registerForm" class="auth-form">
          <!-- Username Input -->
          <div class="form-group">
            <label for="registerUsername" class="form-label">Nom d'utilisateur</label>
            <input
              type="text"
              id="registerUsername"
              name="username"
              class="form-input"
              placeholder="ex: Ali, Megane..."
              required
              autocomplete="off"
            />
            <span class="form-error" id="registerUsernameError"></span>
          </div>

          <!-- Email Input -->
          <div class="form-group">
            <label for="registerEmail" class="form-label">Email</label>
            <input
              type="email"
              id="registerEmail"
              name="email"
              class="form-input"
              placeholder="votre@email.com"
              required
              autocomplete="email"
            />
            <span class="form-error" id="registerEmailError"></span>
          </div>

          <!-- Password Input -->
          <div class="form-group">
            <label for="registerPassword" class="form-label">Mot de passe</label>
            <input
              type="password"
              id="registerPassword"
              name="password"
              class="form-input"
              placeholder="••••••••"
              required
              autocomplete="new-password"
            />
            <span class="form-error" id="registerPasswordError"></span>
            <div class="form-hint">Au moins 6 caractères</div>
          </div>

          <!-- Confirm Password Input -->
          <div class="form-group">
            <label for="registerPasswordConfirm" class="form-label">Confirmer le mot de passe</label>
            <input
              type="password"
              id="registerPasswordConfirm"
              name="passwordConfirm"
              class="form-input"
              placeholder="••••••••"
              required
              autocomplete="new-password"
            />
            <span class="form-error" id="registerPasswordConfirmError"></span>
          </div>

          <!-- Terms Checkbox -->
          <div class="form-group form-checkbox">
            <input
              type="checkbox"
              id="registerTerms"
              name="terms"
              required
            />
            <label for="registerTerms" class="checkbox-label">
              J'accepte les conditions d'utilisation
            </label>
            <span class="form-error" id="registerTermsError"></span>
          </div>

          <!-- Error Message -->
          <div class="form-error-box" id="registerErrorBox" style="display: none;">
            <span id="registerErrorMessage"></span>
          </div>

          <!-- Loading State -->
          <div class="form-loading" id="registerLoading" style="display: none;">
            <span class="spinner"></span>
            <span>Création du compte...</span>
          </div>

          <!-- Submit Button -->
          <button
            type="submit"
            id="registerSubmitBtn"
            class="btn btn-primary btn-large"
            style="width: 100%; margin-top: 1rem;"
          >
            S'inscrire
          </button>
        </form>

        <!-- Link to Login -->
        <div class="auth-form-footer">
          <p>Vous avez déjà un compte? <a href="#" onclick="switchToLogin(event); return false;" class="auth-link">Se connecter</a></p>
          <p style="font-size: 12px; color: var(--text2); margin-top: 1rem;">
            🔐 Vos données seront chiffrées et stockées de façon sécurisée.
          </p>
        </div>
      </div>
    </div>
  `
}

/**
 * Attach Register Form Event Listeners
 * Sets up form submission and validation
 */
export const attachRegisterFormListeners = () => {
  const form = document.getElementById('registerForm')
  const usernameInput = document.getElementById('registerUsername')
  const emailInput = document.getElementById('registerEmail')
  const passwordInput = document.getElementById('registerPassword')
  const passwordConfirmInput = document.getElementById('registerPasswordConfirm')
  const termsCheckbox = document.getElementById('registerTerms')
  const submitBtn = document.getElementById('registerSubmitBtn')
  const errorBox = document.getElementById('registerErrorBox')
  const errorMessage = document.getElementById('registerErrorMessage')
  const loadingBox = document.getElementById('registerLoading')

  if (!form) return

  // Form submission
  form.addEventListener('submit', async (e) => {
    e.preventDefault()
    
    // Clear errors
    errorBox.style.display = 'none'
    loadingBox.style.display = 'none'
    clearAllErrors()
    
    const username = usernameInput.value.trim()
    const email = emailInput.value.trim()
    const password = passwordInput.value
    const passwordConfirm = passwordConfirmInput.value

    // Validation
    let hasError = false

    if (!username || username.length < 2) {
      document.getElementById('registerUsernameError').textContent = 'Au moins 2 caractères'
      hasError = true
    }

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      document.getElementById('registerEmailError').textContent = 'Email invalide'
      hasError = true
    }

    if (!password || password.length < 6) {
      document.getElementById('registerPasswordError').textContent = 'Au moins 6 caractères'
      hasError = true
    }

    if (password !== passwordConfirm) {
      document.getElementById('registerPasswordConfirmError').textContent = 'Les mots de passe ne correspondent pas'
      hasError = true
    }

    if (!termsCheckbox.checked) {
      document.getElementById('registerTermsError').textContent = 'Vous devez accepter les conditions'
      hasError = true
    }

    if (hasError) return

    // Show loading state
    submitBtn.disabled = true
    loadingBox.style.display = 'flex'

    try {
      console.log('📝 Registering user:', { username, email })
      
      // Call auth context
      const { user, error } = await AuthContext.signUp(email, password, username)

      if (error) {
        errorMessage.textContent = error.message || 'Erreur d\'inscription. Réessayez.'
        errorBox.style.display = 'flex'
        console.error('Register error:', error)
        return
      }

      console.log('✅ Registration successful:', user)
      
      // Success
      window.showToast('✅ Inscription réussie! Bienvenue ' + username + '!')
      
      // Simulate page transition to dashboard
      setTimeout(() => {
        window.location.hash = '#section-dashboard'
        window.showSection('dashboard')
      }, 500)
    } catch (error) {
      console.error('Register exception:', error)
      errorMessage.textContent = 'Une erreur est survenue. Réessayez.'
      errorBox.style.display = 'flex'
    } finally {
      submitBtn.disabled = false
      loadingBox.style.display = 'none'
    }
  })

  // Real-time validation
  usernameInput.addEventListener('blur', () => {
    const username = usernameInput.value.trim()
    if (username && username.length < 2) {
      document.getElementById('registerUsernameError').textContent = 'Au moins 2 caractères'
    } else {
      document.getElementById('registerUsernameError').textContent = ''
    }
  })

  emailInput.addEventListener('blur', () => {
    if (emailInput.value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailInput.value)) {
      document.getElementById('registerEmailError').textContent = 'Email invalide'
    } else {
      document.getElementById('registerEmailError').textContent = ''
    }
  })

  passwordInput.addEventListener('input', () => {
    if (passwordInput.value.length > 0 && passwordInput.value.length < 6) {
      document.getElementById('registerPasswordError').textContent = 'Au moins 6 caractères'
    } else {
      document.getElementById('registerPasswordError').textContent = ''
    }

    // Check confirm password match
    if (passwordConfirmInput.value && passwordInput.value !== passwordConfirmInput.value) {
      document.getElementById('registerPasswordConfirmError').textContent = 'Les mots de passe ne correspondent pas'
    } else {
      document.getElementById('registerPasswordConfirmError').textContent = ''
    }
  })

  passwordConfirmInput.addEventListener('input', () => {
    if (passwordConfirmInput.value && passwordInput.value !== passwordConfirmInput.value) {
      document.getElementById('registerPasswordConfirmError').textContent = 'Les mots de passe ne correspondent pas'
    } else {
      document.getElementById('registerPasswordConfirmError').textContent = ''
    }
  })

  termsCheckbox.addEventListener('change', () => {
    if (!termsCheckbox.checked) {
      document.getElementById('registerTermsError').textContent = 'Vous devez accepter les conditions'
    } else {
      document.getElementById('registerTermsError').textContent = ''
    }
  })
}

/**
 * Clear all error messages
 * @private
 */
const clearAllErrors = () => {
  document.getElementById('registerUsernameError').textContent = ''
  document.getElementById('registerEmailError').textContent = ''
  document.getElementById('registerPasswordError').textContent = ''
  document.getElementById('registerPasswordConfirmError').textContent = ''
  document.getElementById('registerTermsError').textContent = ''
}

export default { createRegisterForm, attachRegisterFormListeners }
