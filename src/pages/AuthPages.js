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
import AuthContext from '../auth/authContext.js'

/**
 * Global page state
 */
let currentAuthPage = 'login' // 'login' or 'register'

/**
 * Authentication Pages Module
 */
export const AuthPages = {
  /**
   * Initialize auth pages
   * Called when app starts
   */
  init() {

    // Create auth container if not exists
    this._ensureAuthContainer()

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

    authContainer.innerHTML = createRegisterForm()
    attachRegisterFormListeners()
    currentAuthPage = 'register'
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

export default AuthPages
