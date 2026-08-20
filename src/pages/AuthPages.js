/**
 * Nexora - Authentication Pages & Router
 *
 * Manages auth pages (login, register) and routing between auth and dashboard.
 * Simple hash-based routing system compatible with vanilla JavaScript.
 *
 * TODO: Replace with proper router when using framework
 */

import { createLoginForm, attachLoginFormListeners } from '../components/LoginForm.js'
import { createRegisterForm, attachRegisterFormListeners } from '../components/RegisterForm.js'
import { createForgotPasswordForm, attachForgotPasswordFormListeners } from '../components/ForgotPasswordForm.js'
import { createResetPasswordForm, attachResetPasswordFormListeners } from '../components/ResetPasswordForm.js'
import AuthContext from '../auth/authContext.js'

/**
 * Global page state
 */
let currentAuthPage = 'login' // 'login' or 'register'
let resetPasswordCleanup = null // Cleanup function for reset password listeners

/**
 * Cleanup reset password state
 * @private
 */
const _cleanupResetPassword = () => {
  if (resetPasswordCleanup) {
    resetPasswordCleanup()
    resetPasswordCleanup = null
  }
}

/**
 * Authentication Pages Module
 */
export const AuthPages = {
  /**
   * Initialize auth pages
   * Called when app starts
   */
  init() {
    // Detect reset-password route
    const isResetPasswordRoute = window.location.pathname === '/reset-password'

    // Create auth container if not exists
    this._ensureAuthContainer()

    if (isResetPasswordRoute) {
      // Show reset password page (component handles loading state)
      this.showAuthPages()
      this.showResetPasswordPage({ loading: true })
      return
    }

    // Check if user is already logged in
    const { user } = AuthContext.getState()
    if (user && user.id) {
      this.hideAuthPages()
    } else {
      this.showAuthPages()
      this.showLoginPage()
    }
  },

  /**
   * Create auth container if not exists
   * @private
   */
  _ensureAuthContainer() {
    let container = document.getElementById('auth-container')
    if (!container) {
      container = document.createElement('div')
      container.id = 'auth-container'
      container.className = 'auth-container'
      document.body.insertBefore(container, document.body.firstChild)
    }
  },

  /**
   * Show authentication pages (hide dashboard)
   */
  showAuthPages() {
    const authContainer = document.getElementById('auth-container')
    const main = document.querySelector('main')
    const sidebar = document.querySelector('.sidebar')

    // Authentication UI must never remain blocked by an authenticated-only
    // onboarding modal. Remove only its DOM instance; do not persist dismissal.
    document.getElementById('onboarding-root')?.remove()

    document.body.classList.add('auth-locked')
    if (authContainer) authContainer.style.display = 'flex'
    if (main) main.style.display = 'none'
    if (sidebar) sidebar.style.display = 'none'
  },

  /**
   * Hide authentication pages (show dashboard)
   */
  hideAuthPages() {
    const authContainer = document.getElementById('auth-container')
    const main = document.querySelector('main')
    const sidebar = document.querySelector('.sidebar')

    document.body.classList.remove('auth-locked')
    if (authContainer) authContainer.style.display = 'none'
    if (main) main.style.display = 'block'
    if (sidebar) sidebar.style.display = 'flex'
  },

  /**
   * Show login page
   */
  showLoginPage() {
    const authContainer = document.getElementById('auth-container')
    if (!authContainer) return
    if (currentAuthPage === 'login' && document.getElementById('loginForm')) return

    _cleanupResetPassword()
    authContainer.innerHTML = createLoginForm()
    attachLoginFormListeners()
    currentAuthPage = 'login'
  },

  /**
   * Show register page
   */
  showRegisterPage() {
    const authContainer = document.getElementById('auth-container')
    if (!authContainer) return
    if (currentAuthPage === 'register' && document.getElementById('registerForm')) return

    _cleanupResetPassword()
    authContainer.innerHTML = createRegisterForm()
    attachRegisterFormListeners()
    currentAuthPage = 'register'
  },

  /**
   * Show forgot password page
   */
  showForgotPasswordPage() {
    const authContainer = document.getElementById('auth-container')
    if (!authContainer) return
    if (currentAuthPage === 'forgot-password' && document.getElementById('forgotPasswordForm')) return

    _cleanupResetPassword()
    authContainer.innerHTML = createForgotPasswordForm()
    attachForgotPasswordFormListeners()
    currentAuthPage = 'forgot-password'
  },

  /**
   * Show reset password page
   */
  showResetPasswordPage({ loading = false } = {}) {
    const authContainer = document.getElementById('auth-container')
    if (!authContainer) return

    // Cleanup previous reset password listeners if any
    if (resetPasswordCleanup) {
      resetPasswordCleanup()
      resetPasswordCleanup = null
    }

    authContainer.innerHTML = createResetPasswordForm({ loading })
    resetPasswordCleanup = attachResetPasswordFormListeners()
    currentAuthPage = 'reset-password'
  },

  /**
   * Check if user is authenticated
   * Used to protect routes
   */
  isAuthenticated() {
    return AuthContext.isAuthenticated()
  }
}

/**
 * Global functions for HTML onclick handlers
 */
window.switchToLogin = (event) => {
  if (event) {
    event.preventDefault()
  }
  AuthPages.showLoginPage()
}

window.switchToRegister = (event) => {
  if (event) {
    event.preventDefault()
  }
  AuthPages.showRegisterPage()
}

window.switchToForgotPassword = (event) => {
  if (event) {
    event.preventDefault()
  }
  AuthPages.showForgotPasswordPage()
}

export default AuthPages
