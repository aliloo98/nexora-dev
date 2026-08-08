/**
 * Nexora - Authentication Service
 *
 * Handles user authentication with Supabase.
 * Uses placeholders until VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are configured.
 *
 * TODO: Activate real Supabase connection when credentials are added to .env
 */

import { supabase } from '../supabase.js'

const env = typeof import.meta !== 'undefined' ? import.meta.env || {} : {}
const isSupabaseConfigured = Boolean(
  env.VITE_SUPABASE_URL &&
  env.VITE_SUPABASE_ANON_KEY
)

// In demo mode, always use placeholder auth regardless of Supabase configuration
const isDemoModeBuild = typeof __ALLOW_DEMO_MODE__ !== 'undefined' ? __ALLOW_DEMO_MODE__ : false

/**
 * Check if running on strict localhost (not 127.0.0.1 or any other hostname)
 * This is the only environment where demo mode is allowed.
 */
const isStrictLocalhost = () => {
  return typeof window !== 'undefined' && window.location.hostname === 'localhost'
}

/**
 * Check if running on local development loopback (localhost OR 127.0.0.1)
 * This allows placeholder auth for real local development (Vite dev server)
 */
const isLocalDevLoopback = () => {
  if (typeof window === 'undefined') return false
  return window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
}

/**
 * Centralized security check for demo mode.
 * Demo mode is ONLY allowed when:
 * 1. Build was created with __ALLOW_DEMO_MODE__ = true
 * 2. Running on localhost (strictly "localhost", not 127.0.0.1 or any other hostname)
 * This prevents accidental activation on production domains or IP addresses.
 */
export const isDemoModeAllowed = () => {
  const allowDemoMode = typeof __ALLOW_DEMO_MODE__ !== 'undefined' ? __ALLOW_DEMO_MODE__ : false
  return allowDemoMode && isStrictLocalhost()
}

/**
 * Check if local development placeholder auth is allowed.
 * Only allowed when:
 * 1. Running in development mode (Vite dev server)
 * 2. Running on localhost OR 127.0.0.1 (local development loopback)
 * 3. Supabase is not configured
 * This allows development without real Supabase credentials but not on production builds.
 */
export const isLocalDevelopmentPlaceholderAllowed = () => {
  return isDevelopmentMode() && isLocalDevLoopback() && !isSupabaseConfigured
}

/**
 * Check if we're in development mode (Vite dev server).
 * This is used to show demo button during development but not in production builds.
 */
export const isDevelopmentMode = () => {
  return typeof __DEV__ !== 'undefined' ? __DEV__ : false
}

/**
 * Centralized policy for placeholder auth.
 * Placeholder auth is ONLY allowed when:
 * 1. Demo mode is explicitly allowed on localhost
 * OR
 * 2. Local development on localhost without Supabase configuration
 * A production build served outside localhost NEVER uses placeholder auth.
 */
export const shouldUsePlaceholderAuth = () => {
  return isDemoModeAllowed() || isLocalDevelopmentPlaceholderAllowed()
}

/**
 * Centralized policy for placeholder auth persistence.
 * Same policy as shouldUsePlaceholderAuth().
 */
export const shouldPersistPlaceholderAuth = () => {
  return shouldUsePlaceholderAuth()
}

/**
 * Clear placeholder auth storage if placeholder auth is not allowed.
 * This prevents unauthorized sessions from being restored.
 * @returns {boolean} true if storage was cleared, false if placeholder auth is allowed
 */
export const clearPlaceholderAuthStorageIfForbidden = () => {
  if (shouldUsePlaceholderAuth()) return false
  removeStoredValue(AUTH_USER_KEY)
  removeStoredValue(AUTH_SESSION_KEY)
  return true
}

const AUTH_USER_KEY = 'nexora_auth_user'
const AUTH_SESSION_KEY = 'nexora_auth_session'

const isOnline = () => typeof navigator === 'undefined' || navigator.onLine !== false

export const isStoredSessionValid = ({ session, user, nowSeconds = Math.floor(Date.now() / 1000) } = {}) => {
  const expiresAt = Number(session?.expires_at)
  const sessionUserId = session?.user?.id
  return Boolean(
    session?.access_token &&
    user?.id &&
    sessionUserId &&
    sessionUserId === user.id &&
    Number.isFinite(expiresAt) &&
    expiresAt > nowSeconds
  )
}

export const shouldUseStoredAuthFallback = ({
  configured = isSupabaseConfigured,
  online = isOnline(),
  session,
  user,
  nowSeconds
} = {}) => {
  if (!configured) return true
  if (online) return false
  return isStoredSessionValid({ session, user, nowSeconds })
}

const readStoredJson = (key) => {
  const rawValue =
    localStorage.getItem(key) ||
    sessionStorage.getItem(key)

  if (!rawValue) return null

  try {
    return JSON.parse(rawValue)
  } catch (error) {
    console.warn(`⚠️ Stored auth value ignored for ${key}:`, error)
    return null
  }
}

const writeStoredJson = (key, value) => {
  const serializedValue = JSON.stringify(value)
  localStorage.setItem(key, serializedValue)
  sessionStorage.setItem(key, serializedValue)
}

const removeStoredValue = (key) => {
  localStorage.removeItem(key)
  sessionStorage.removeItem(key)
}

export const subscribeToSupabaseAuthChanges = ({
  configured = isSupabaseConfigured,
  auth = supabase.auth,
  callback
} = {}) => {
  if (!configured || typeof auth?.onAuthStateChange !== 'function' || typeof callback !== 'function') {
    return () => {}
  }

  const { data } = auth.onAuthStateChange((event, session) => {
    callback({
      event,
      session: session || null,
      user: session?.user || null
    })
  })

  return () => data?.subscription?.unsubscribe?.()
}

/**
 * Authentication Service
 * All functions designed to work with real Supabase once credentials are configured
 */
export const AuthService = {
  subscribeToAuthChanges(callback) {
    return subscribeToSupabaseAuthChanges({ callback })
  },

  /**
   * Sign up new user with email, password, and username
   *
   * TODO: When Supabase is configured:
   * - Uncomment the real signUp logic below
   * - Remove the placeholder logic
   *
   * @param {string} email - User email
   * @param {string} password - User password
   * @param {string} username - User display name
   * @returns {Promise<{user, error}>}
   */
  async signUp(email, password, username) {
    try {
      if (isSupabaseConfigured && !isDemoModeAllowed()) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              username,
              first_name: username,
              firstName: username,
              display_name: username,
              displayName: username
            }
          }
        })

        if (error) throw error
        return { user: data.user, session: data.session, error: null }
      }

      // PLACEHOLDER: Only allow placeholder signup when policy permits
      if (!shouldUsePlaceholderAuth()) {
        return {
          user: null,
          session: null,
          error: new Error('Authentification locale non autorisée dans cet environnement')
        }
      }

      // TODO: Real Supabase implementation (uncomment when ready)
      // const { data, error } = await supabase.auth.signUp({
      //   email,
      //   password,
      //   options: {
      //     data: { username }
      //   }
      // })
      //
      // if (error) throw error
      //
      // // Create user profile in users table
      // if (data.user) {
      //   const { error: profileError } = await supabase
      //     .from('users')
      //     .insert([
      //       {
      //         id: data.user.id,
      //         email: data.user.email,
      //         username: username,
      //         created_at: new Date()
      //       }
      //     ])
      //
      //   if (profileError) throw profileError
      // }
      //
      // return { user: data.user, error: null }

      // PLACEHOLDER: Simulate successful signup

      // Validate inputs
      if (!email || !password || !username) {
        return {
          user: null,
          error: new Error('Email, password et username sont requis')
        }
      }

      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 800))

      // Create mock user object
      const mockUser = {
        id: 'user_' + Math.random().toString(36).substr(2, 9),
        email: email,
        user_metadata: { username: username },
        created_at: new Date().toISOString(),
        email_confirmed_at: null
      }
      return { user: mockUser, error: null }
    } catch (error) {
      console.error('❌ [PLACEHOLDER] SignUp error:', error.message)
      return { user: null, error }
    }
  },

  /**
   * Sign in with email and password
   *
   * TODO: When Supabase is configured:
   * - Uncomment the real signIn logic
   * - Remove the placeholder logic
   *
   * @param {string} email - User email
   * @param {string} password - User password
   * @returns {Promise<{user, session, error}>}
   */
  async signIn(email, password) {
    try {
      if (shouldUsePlaceholderAuth()) {
        // PLACEHOLDER: Simulate successful login only when Supabase is not configured.
        await new Promise(resolve => setTimeout(resolve, 800))
        const mockSession = {
          access_token: 'mock_token_' + Math.random().toString(36).substr(2, 20),
          refresh_token: 'mock_refresh_' + Math.random().toString(36).substr(2, 20),
          expires_in: 3600,
          expires_at: Math.floor(Date.now() / 1000) + 3600
        }
        const mockUser = {
          id: 'demo_user_' + Math.random().toString(36).substr(2, 9),
          email: email,
          user_metadata: { username: email.split('@')[0] },
          created_at: new Date().toISOString(),
          email_confirmed_at: new Date().toISOString()
        }
        return { user: mockUser, session: mockSession, error: null }
      }

      if (isSupabaseConfigured && !isDemoModeAllowed()) {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password
        })

        if (error) throw error
        return {
          user: data.user,
          session: data.session,
          error: null
        }
      }
    } catch (error) {
      console.error('❌ [PLACEHOLDER] SignIn error:', error.message)
      return { user: null, session: null, error }
    }
  },

  /**
   * Sign out current user
   *
   * TODO: When Supabase is configured:
   * - Uncomment the real signOut logic
   * - Remove the placeholder logic
   *
   * @returns {Promise<{error}>}
   */
  async signOut() {
    try {
      if (isSupabaseConfigured && !isDemoModeAllowed()) {
        const { error } = await supabase.auth.signOut()
        if (error) throw error
        this.clearSessionPlaceholder()
        return { error: null }
      }

      // TODO: Real Supabase implementation (uncomment when ready)
      // const { error } = await supabase.auth.signOut()
      // if (error) throw error
      // return { error: null }

      // PLACEHOLDER: Simulate successful logout

      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 300))
      return { error: null }
    } catch (error) {
      console.error('❌ [PLACEHOLDER] SignOut error:', error.message)
      return { error }
    }
  },

  /**
   * Get current authenticated user
   *
   * TODO: When Supabase is configured:
   * - Uncomment the real getCurrentUser logic
   * - Remove the placeholder logic
   *
   * @returns {Promise<{user, error}>}
   */
  async getCurrentUser() {
    try {
      // Clear placeholder storage if not allowed before any restoration
      clearPlaceholderAuthStorageIfForbidden()

      const storedUser = readStoredJson(AUTH_USER_KEY)

      // Only use stored values if placeholder auth is allowed by policy
      if (shouldUsePlaceholderAuth()) {
        if (storedUser) {
          return { user: storedUser, error: null }
        }
        return { user: null, error: null }
      }

      if (isSupabaseConfigured) {
        removeStoredValue(AUTH_USER_KEY)
        removeStoredValue(AUTH_SESSION_KEY)

        if (!isOnline()) {
          const { data: { session }, error } = await supabase.auth.getSession()
          if (error) throw error
          const user = session?.user || null
          if (!shouldUseStoredAuthFallback({ configured: true, online: false, session, user })) {
            return { user: null, error: null }
          }
          return { user, error: null }
        }

        const { data: { user }, error } = await supabase.auth.getUser()
        if (error) throw error
        return { user, error: null }
      }

      // TODO: Real Supabase implementation (uncomment when ready)
      // const { data: { user }, error } = await supabase.auth.getUser()
      // if (error) throw error
      // return { user, error: null }

      // Only use stored values if placeholder auth is allowed by policy
      if (shouldUsePlaceholderAuth() && storedUser) {
        return { user: storedUser, error: null }
      }
      return { user: null, error: null }
    } catch (error) {
      const storedUser = readStoredJson(AUTH_USER_KEY)
      const storedSession = readStoredJson(AUTH_SESSION_KEY)
      // Only use stored values if placeholder auth is allowed by policy
      if (shouldUsePlaceholderAuth() && storedUser) {
        console.warn('⚠️ Placeholder auth: using local session despite error:', error.message)
        return { user: storedUser, error: null }
      }

      console.warn('⚠️ [PLACEHOLDER] getCurrentUser error:', error.message)
      return { user: null, error }
    }
  },

  /**
   * Get current session
   *
   * TODO: When Supabase is configured:
   * - Uncomment the real getSession logic
   *
   * @returns {Promise<{session, error}>}
   */
  async getSession() {
    try {
      // Clear placeholder storage if not allowed before any restoration
      clearPlaceholderAuthStorageIfForbidden()

      const storedSession = readStoredJson(AUTH_SESSION_KEY)

      // Only use stored values if placeholder auth is allowed by policy
      if (shouldUsePlaceholderAuth()) {
        if (storedSession) {
          return { session: storedSession, error: null }
        }
        return { session: null, error: null }
      }

      if (isSupabaseConfigured) {
        removeStoredValue(AUTH_USER_KEY)
        removeStoredValue(AUTH_SESSION_KEY)

        const { data: { session }, error } = await supabase.auth.getSession()
        if (error) throw error
        if (!isOnline() && session && !shouldUseStoredAuthFallback({
          configured: true,
          online: false,
          session,
          user: session.user
        })) {
          return { session: null, error: null }
        }
        return { session, error: null }
      }

      // TODO: Real Supabase implementation (uncomment when ready)
      // const { data: { session }, error } = await supabase.auth.getSession()
      // if (error) throw error
      // return { session, error: null }

      // Only use stored values if placeholder auth is allowed by policy
      if (shouldUsePlaceholderAuth() && storedSession) {
        return { session: storedSession, error: null }
      }
      return { session: null, error: null }
    } catch (error) {
      const storedSession = readStoredJson(AUTH_SESSION_KEY)
      const storedUser = readStoredJson(AUTH_USER_KEY)
      // Only use stored values if placeholder auth is allowed by policy
      if (shouldUsePlaceholderAuth() && storedSession) {
        console.warn('⚠️ Placeholder auth: using local session despite error:', error.message)
        return { session: storedSession, error: null }
      }

      console.error('❌ [PLACEHOLDER] getSession error:', error.message)
      return { session: null, error }
    }
  },

  /**
   * Store user session locally (for placeholder mode)
   * Useful for testing without real Supabase
   *
   * TODO: Remove this when using real Supabase Auth
   *
   * @param {object} user - User object
   * @param {object} session - Session object
   */
  storeSessionPlaceholder(user, session) {
    // Only persist if placeholder auth is allowed by policy
    if (!shouldPersistPlaceholderAuth()) {
      this.clearSessionPlaceholder()
      return false
    }
    writeStoredJson(AUTH_USER_KEY, user)
    if (session) {
      writeStoredJson(AUTH_SESSION_KEY, session)
    }
    return true
  },

  /**
   * Clear stored session (for placeholder mode)
   *
   * TODO: Remove this when using real Supabase Auth
   */
  clearSessionPlaceholder() {
    removeStoredValue(AUTH_USER_KEY)
    removeStoredValue(AUTH_SESSION_KEY)
  },

  /**
   * Build redirect URL for password recovery
   * @returns {string}
   */
  _buildPasswordResetRedirectUrl() {
    return `${window.location.origin}/reset-password`
  },

  /**
   * Send password reset email
   *
   * @param {string} email - User email
   * @param {object} supabaseClient - Optional Supabase client for testing
   * @param {boolean} bypassPlaceholderCheck - For testing only, bypass placeholder mode check
   * @returns {Promise<{error}>}
   */
  async resetPassword(email, supabaseClient = supabase, bypassPlaceholderCheck = false) {
    try {
      if (!bypassPlaceholderCheck && shouldUsePlaceholderAuth()) {
        // Mode placeholder: fonctionnalité indisponible
        return {
          error: new Error('La récupération de mot de passe est temporairement indisponible en mode développement')
        }
      }

      const redirectTo = this._buildPasswordResetRedirectUrl()
      const { error } = await supabaseClient.auth.resetPasswordForEmail(email, {
        redirectTo
      })

      if (error) throw error
      return { error: null }
    } catch (error) {
      console.error('❌ ResetPassword error:', error.message)
      return { error }
    }
  },

  /**
   * Update user password
   *
   * @param {string} newPassword - New password
   * @param {object} supabaseClient - Optional Supabase client for testing
   * @param {boolean} bypassPlaceholderCheck - For testing only, bypass placeholder mode check
   * @returns {Promise<{error}>}
   */
  async updatePassword(newPassword, supabaseClient = supabase, bypassPlaceholderCheck = false) {
    try {
      if (!bypassPlaceholderCheck && shouldUsePlaceholderAuth()) {
        // Mode placeholder: fonctionnalité indisponible
        return {
          error: new Error('La récupération de mot de passe est temporairement indisponible en mode développement')
        }
      }

      const { error } = await supabaseClient.auth.updateUser({
        password: newPassword
      })

      if (error) throw error
      return { error: null }
    } catch (error) {
      console.error('❌ UpdatePassword error:', error.message)
      return { error }
    }
  }
}

/**
 * Supabase Listener Setup
 *
 * TODO: When Supabase is configured:
 * - Uncomment the listener setup to track auth state changes
 * - This will automatically update the app when user logs in/out
 *
 * Example:
 * supabase.auth.onAuthStateChange((event, session) => {
 *   if (event === 'SIGNED_IN') {
 *     console.log('User signed in:', session.user)
 *   }
 *   if (event === 'SIGNED_OUT') {
 *     console.log('User signed out')
 *   }
 * })
 */
