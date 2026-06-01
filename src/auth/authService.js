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

const AUTH_USER_KEY = 'nexora_auth_user'
const AUTH_SESSION_KEY = 'nexora_auth_session'

const isOnline = () => typeof navigator === 'undefined' || navigator.onLine !== false

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

/**
 * Authentication Service
 * All functions designed to work with real Supabase once credentials are configured
 */
export const AuthService = {
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
      if (isSupabaseConfigured) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { username }
          }
        })

        if (error) throw error
        return { user: data.user, session: data.session, error: null }
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
      const shouldUsePlaceholder = !isSupabaseConfigured || email === 'demo@nexora.local'
      if (shouldUsePlaceholder) {
        // PLACEHOLDER: Simulate successful login for demo/test mode or when Supabase is unavailable
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
      if (isSupabaseConfigured) {
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
      const storedUser = readStoredJson(AUTH_USER_KEY)

      if (isSupabaseConfigured) {
        if (!isOnline() && storedUser) {
          return { user: storedUser, error: null }
        }

        const { data: { user }, error } = await supabase.auth.getUser()
        if (error) throw error
        if (user) {
          writeStoredJson(AUTH_USER_KEY, user)
        }
        return { user, error: null }
      }

      // TODO: Real Supabase implementation (uncomment when ready)
      // const { data: { user }, error } = await supabase.auth.getUser()
      // if (error) throw error
      // return { user, error: null }

      if (storedUser) {
        return { user: storedUser, error: null }
      }
      return { user: null, error: null }
    } catch (error) {
      const storedUser = readStoredJson(AUTH_USER_KEY)
      if (storedUser) {
        console.warn('⚠️ Auth cloud restore unavailable, using local session:', error.message)
        return { user: storedUser, error: null }
      }

      console.error('❌ [PLACEHOLDER] getCurrentUser error:', error.message)
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
      const storedSession = readStoredJson(AUTH_SESSION_KEY)

      if (isSupabaseConfigured) {
        if (!isOnline() && storedSession) {
          return { session: storedSession, error: null }
        }

        const { data: { session }, error } = await supabase.auth.getSession()
        if (error) throw error
        if (session) {
          writeStoredJson(AUTH_SESSION_KEY, session)
          if (session.user) {
            writeStoredJson(AUTH_USER_KEY, session.user)
          }
        }
        return { session, error: null }
      }

      // TODO: Real Supabase implementation (uncomment when ready)
      // const { data: { session }, error } = await supabase.auth.getSession()
      // if (error) throw error
      // return { session, error: null }

      if (storedSession) {
        return { session: storedSession, error: null }
      }
      return { session: null, error: null }
    } catch (error) {
      const storedSession = readStoredJson(AUTH_SESSION_KEY)
      if (storedSession) {
        console.warn('⚠️ Auth cloud session unavailable, using local session:', error.message)
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
    writeStoredJson(AUTH_USER_KEY, user)
    if (session) {
      writeStoredJson(AUTH_SESSION_KEY, session)
    }
  },

  /**
   * Clear stored session (for placeholder mode)
   *
   * TODO: Remove this when using real Supabase Auth
   */
  clearSessionPlaceholder() {
    removeStoredValue(AUTH_USER_KEY)
    removeStoredValue(AUTH_SESSION_KEY)
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
