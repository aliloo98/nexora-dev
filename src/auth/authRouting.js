/**
 * Nexora - Authentication Guard & Router
 *
 * Protects routes and ensures only authenticated users can access the dashboard.
 * Manages navigation between auth pages and app pages.
 *
 * TODO: Expand to support multiple routes and permissions
 * TODO: Integrate with URL history for better navigation
 */

import AuthContext from '../auth/authContext.js'
import AuthPages from '../pages/AuthPages.js'
import { renderUserMenu, updateUserHeader } from '../components/UserProfile.js'

/**
 * Route Protection System
 */
export const RouteGuard = {
  /**
   * Check if route requires authentication
   * @param {string} routeName - Route identifier
   * @returns {boolean} True if route requires auth
   */
  requiresAuth(routeName) {
    const protectedRoutes = ['dashboard', 'saisie', 'historique', 'plan', 'nexora', 'parametres', 'couple']
    return protectedRoutes.includes(routeName)
  },

  /**
   * Check if user can access route
   * @param {string} routeName - Route identifier
   * @returns {boolean} True if user can access
   */
  canAccess(routeName) {
    if (!this.requiresAuth(routeName)) {
      return true // Public route
    }

    return AuthContext.isAuthenticated()
  },

  /**
   * Navigate to section
   * Checks authentication before allowing navigation
   * @param {string} sectionName - Section/route to navigate to
   */
  navigateTo(sectionName) {

    // Check if route exists
    const section = document.getElementById(`section-${sectionName}`)
    if (!section) {
      console.warn(`⚠️  Section not found: ${sectionName}`)
      return false
    }

    // Check authentication
    if (this.requiresAuth(sectionName) && !AuthContext.isAuthenticated()) {
      console.warn(`🔒 Access denied to ${sectionName} - user not authenticated`)
      window.showToast('❌ Connectez-vous pour accéder à cette page')
      AuthPages.showAuthPages()
      AuthPages.showLoginPage()
      return false
    }

    if (sectionName === 'couple' && AuthContext.isAuthenticated() && window.__isCoupleTabVisible === false) {
      if (typeof window.setCoupleFallbackMessage === 'function') {
        window.setCoupleFallbackMessage('Mode couple bientôt disponible / activez-le depuis les réglages')
      }
      return false
    }

    return true
  },

  /**
   * Get current section from hash
   * @returns {string} Current section name
   */
  getCurrentSection() {
    const hash = window.location.hash
    const match = hash.match(/#section-(\w+)/)
    return match ? match[1] : 'dashboard'
  },

  /**
   * Handle navigation from old HTML onclick handlers
   * @param {string} sectionName - Section to show
   */
  handleSectionShow(sectionName) {
    if (!this.navigateTo(sectionName)) {
      return false
    }

    // If auth passed, proceed with original showSection
    return true
  }
}

/**
 * Navigation Middleware
 */
export const NavigationMiddleware = {
  /**
   * Initialize middleware
   */
  init() {

    // Listen to hash changes
    window.addEventListener('hashchange', () => {
      const section = RouteGuard.getCurrentSection()

      if (!RouteGuard.navigateTo(section)) {
        if (section === 'couple' && AuthContext.isAuthenticated() && window.__isCoupleTabVisible === false) {
          window.location.hash = '#section-parametres'
          return
        }
        // Reset hash to dashboard if navigation failed
        window.location.hash = '#section-dashboard'
      }
    })

    // Intercept existing showSection function
    if (window.showSection) {
      const originalShowSection = window.showSection
      window.showSection = function(sectionName) {

        if (!RouteGuard.navigateTo(sectionName)) {
          return false
        }

        // Call original showSection
        return originalShowSection.call(this, sectionName)
      }
    }

    // Intercept nav buttons
    document.addEventListener('click', (e) => {
      const navBtn = e.target.closest('a[data-section]')
      if (!navBtn) return

      const section = navBtn.dataset.section

      if (!RouteGuard.navigateTo(section)) {
        e.preventDefault()
        return false
      }
    })
  },

  /**
   * Validate all protected sections on init
   */
  validateProtectedSections() {
    const protectedSections = ['dashboard', 'saisie', 'historique', 'plan', 'nexora', 'parametres', 'couple']

    protectedSections.forEach(section => {
      const element = document.getElementById(`section-${section}`)
      if (!element) {
        console.warn(`⚠️  Protected section not found: ${section}`)
      }
    })
  }
}

/**
 * Auth State Synchronization
 * Keeps UI in sync with auth state
 */
export const AuthStateSync = {
  /**
   * Initialize auth state sync
   */
  init() {

    // Subscribe to auth context changes
    AuthContext.subscribe((newState) => {
      this._onAuthStateChange(newState)
    })
  },

  /**
   * Handle auth state changes
   * @private
   */
  _onAuthStateChange(state) {

    if (state.isAuthenticated && state.user) {
      // User just logged in

      // Update header with username
      updateUserHeader()
      renderUserMenu()

      // Hide auth pages
      AuthPages.hideAuthPages()

      // Show dashboard
      window.showSection('dashboard')
    } else {
      // User logged out or app initialized without user

      // Update header to default
      updateUserHeader()
      renderUserMenu()

      // Show auth pages
      AuthPages.showAuthPages()
    }
  }
}

/**
 * Initialize all routing systems
 * Called from main.js during app init
 */
export const initAuthRouting = async () => {

  try {
    // Initialize auth context
    await AuthContext.init()

    // Initialize auth pages
    AuthPages.init()

    // Initialize navigation middleware
    NavigationMiddleware.init()

    // Validate protected sections exist
    NavigationMiddleware.validateProtectedSections()

    // Setup auth state sync
    AuthStateSync.init()
    AuthStateSync._onAuthStateChange(AuthContext.getState())
  } catch (error) {
    console.error('❌ Error initializing auth routing:', error)
  }
}

export default {
  RouteGuard,
  NavigationMiddleware,
  AuthStateSync,
  initAuthRouting
}
