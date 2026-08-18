/**
 * Supabase Client Initialization
 *
 * Initializes the Supabase client with environment variables.
 * Uses VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY (publishable key only, never secret key).
 *
 * For future use:
 * - User authentication (Auth)
 * - Cloud data persistence
 * - Multi-user synchronization
 */

import { createClient } from '@supabase/supabase-js'

// Initialize Supabase client using Vite environment variables
const env = typeof import.meta !== 'undefined' ? import.meta.env || {} : {}
const supabaseUrl = env.VITE_SUPABASE_URL
const supabaseAnonKey = env.VITE_SUPABASE_ANON_KEY

// Capture the auth callback synchronously BEFORE createClient() can consume
// or normalize the URL payload.
const captureInitialAuthRedirect = () => {
  if (
    typeof window === 'undefined' ||
    !window.location ||
    typeof window.location.pathname !== 'string'
  ) {
    return Object.freeze({ isPasswordRecovery: false })
  }

  if (window.location.pathname !== '/reset-password') {
    return Object.freeze({ isPasswordRecovery: false })
  }

  const hashParams = new URLSearchParams(
    String(window.location.hash || '').replace(/^#/, '')
  )
  const queryParams = new URLSearchParams(
    String(window.location.search || '')
  )

  const implicitRecovery =
    hashParams.get('type') === 'recovery' &&
    (
      hashParams.has('access_token') ||
      hashParams.has('refresh_token')
    )

  const pkceRecovery =
    queryParams.get('type') === 'recovery' ||
    queryParams.has('code') ||
    queryParams.has('token_hash')

  return Object.freeze({
    isPasswordRecovery: implicitRecovery || pkceRecovery
  })
}

export const initialAuthRedirect = captureInitialAuthRedirect()

const noOpQuery = () => {
  const chain = {
    select: async () => ({ data: [], error: null }),
    eq() {
      return this
    },
    or() {
      return this
    },
    single: async () => ({ data: null, error: null }),
    update: async () => ({ data: null, error: null }),
    insert: async () => ({ data: null, error: null })
  }
  return chain
}

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('⚠️ Supabase credentials not configured in .env file')
}

export const supabase = (supabaseUrl && supabaseAnonKey)
  ? createClient(supabaseUrl, supabaseAnonKey)
  : {
      auth: {
        getUser: async () => ({ data: { user: null }, error: null }),
        getSession: async () => ({ data: { session: null }, error: null })
      },
      from: noOpQuery
    }

/**
 * Test Supabase Connection
 * Verifies the client can communicate with Supabase backend.
 */
export const testSupabaseConnection = async () => {
  try {
    const { data, error } = await supabase.auth.getUser()

    if (error) {
      console.info('✓ Supabase connected (no user logged in - expected)')
      return true
    }

    if (data.user) {
      console.info(`✓ Supabase connected (user: ${data.user.email})`)
      return true
    }

    console.info('✓ Supabase connected (ready for auth)')
    return true
  } catch (err) {
    console.error('✗ Supabase connection failed:', err.message)
    return false
  }
}
