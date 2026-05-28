/**
 * Nexora - Authentication Context
 * 
 * Global state management for user authentication.
 * Provides a centralized way to manage and access auth state across the app.
 * 
 * TODO: Integration with real Supabase when credentials are added
 */

import { AuthService } from './authService.js'

/**
 * AuthContext - Simple event-based state management
 * Similar to React Context but for vanilla JavaScript
 * 
 * Usage:
 * - AuthContext.subscribe(callback) - Listen to auth state changes
 * - AuthContext.getState() - Get current auth state
 * - AuthContext.signIn(email, password) - Sign in user
 * - AuthContext.signOut() - Sign out user
 */
export const AuthContext = {
  // Internal state
  _state: {
    user: null,
    session: null,
    isLoading: false,
    isAuthenticated: false,
    error: null
  },

  // Array of listeners to notify on state changes
  _listeners: [],

  /**
   * Subscribe to auth state changes
   * @param {Function} listener - Callback function
   * @returns {Function} Unsubscribe function
   */
  subscribe(listener) {
    this._listeners.push(listener)
    
    // Return unsubscribe function
    return () => {
      this._listeners = this._listeners.filter(l => l !== listener)
    }
  },

  /**
   * Notify all listeners of state change
   * @private
   */
  _notifyListeners() {
    this._listeners.forEach(listener => listener(this._state))
  },

  /**
   * Get current auth state
   */
  getState() {
    return { ...this._state }
  },

  /**
   * Set user session
   * @private
   */
  async _setUser(user, session = null) {
    this._state.user = user
    this._state.session = session
    this._state.isAuthenticated = !!user
    
    // Also store in placeholder session storage
    if (user && session) {
      AuthService.storeSessionPlaceholder(user, session)
    }
    
    this._notifyListeners()
  },

  /**
   * Set error
   * @private
   */
  _setError(error) {
    this._state.error = error
    this._notifyListeners()
  },

  /**
   * Set loading state
   * @private
   */
  _setLoading(isLoading) {
    this._state.isLoading = isLoading
    this._notifyListeners()
  },

  /**
   * Initialize auth context - Check if user is already logged in
   * Called when app starts
   */
  async init() {
    this._setLoading(true)
    
    try {
      // TODO: When Supabase is configured:
      // - Remove placeholder logic
      // - Set up real auth listener with supabase.auth.onAuthStateChange()
      
      console.log('🔐 AuthContext initializing...')
      
      // Try to restore session from placeholder storage
      const { user } = await AuthService.getCurrentUser()
      
      if (user) {
        console.log('📋 Restored user session:', user)
        this._state.user = user
        this._state.isAuthenticated = true
        this._state.error = null
      } else {
        console.log('ℹ️  No user session to restore')
        this._state.user = null
        this._state.isAuthenticated = false
      }
    } catch (error) {
      console.error('❌ AuthContext init error:', error)
      this._state.error = error
    } finally {
      this._setLoading(false)
    }
  },

  /**
   * Sign up new user
   * @param {string} email - User email
   * @param {string} password - User password
   * @param {string} username - User display name
   */
  async signUp(email, password, username) {
    this._setLoading(true)
    this._setError(null)

    try {
      console.log('🔐 AuthContext.signUp called')
      
      const { user, session, error } = await AuthService.signUp(email, password, username)
      
      if (error) {
        this._setError(error)
        console.error('❌ SignUp failed:', error)
        return { user: null, error }
      }

      console.log('✅ SignUp successful')
      this._setUser(user, session)
      return { user, session, error: null }
    } catch (error) {
      console.error('❌ SignUp exception:', error)
      this._setError(error)
      return { user: null, error }
    } finally {
      this._setLoading(false)
    }
  },

  /**
   * Sign in user
   * @param {string} email - User email
   * @param {string} password - User password
   */
  async signIn(email, password) {
    this._setLoading(true)
    this._setError(null)

    try {
      console.log('🔐 AuthContext.signIn called')
      
      const { user, session, error } = await AuthService.signIn(email, password)
      
      if (error) {
        this._setError(error)
        console.error('❌ SignIn failed:', error)
        return { user: null, session: null, error }
      }

      console.log('✅ SignIn successful')
      this._setUser(user, session)
      return { user, session, error: null }
    } catch (error) {
      console.error('❌ SignIn exception:', error)
      this._setError(error)
      return { user: null, session: null, error }
    } finally {
      this._setLoading(false)
    }
  },

  /**
   * Sign out user
   */
  async signOut() {
    this._setLoading(true)
    this._setError(null)

    try {
      console.log('🔐 AuthContext.signOut called')
      
      const { error } = await AuthService.signOut()
      
      if (error) {
        this._setError(error)
        console.error('❌ SignOut failed:', error)
        return { error }
      }

      console.log('✅ SignOut successful')
      
      // Clear user and session
      this._state.user = null
      this._state.session = null
      this._state.isAuthenticated = false
      
      // Clear placeholder storage
      AuthService.clearSessionPlaceholder()
      
      this._notifyListeners()
      return { error: null }
    } catch (error) {
      console.error('❌ SignOut exception:', error)
      this._setError(error)
      return { error }
    } finally {
      this._setLoading(false)
    }
  },

  /**
   * Get current user
   */
  getCurrentUser() {
    return this._state.user
  },

  /**
   * Get current session
   */
  getCurrentSession() {
    return this._state.session
  },

  /**
   * Check if user is authenticated
   */
  isAuthenticated() {
    return this._state.isAuthenticated
  },

  /**
   * Get user display name (username)
   */
  getUserDisplayName() {
    if (!this._state.user) return null
    
    // Try to get username from user_metadata
    if (this._state.user.user_metadata?.username) {
      return this._state.user.user_metadata.username
    }
    
    // Fall back to email username
    if (this._state.user.email) {
      return this._state.user.email.split('@')[0]
    }
    
    return 'Utilisateur'
  }
}

export default AuthContext
