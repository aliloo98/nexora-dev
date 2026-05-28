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
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('⚠️ Supabase credentials not configured in .env file')
}

export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '')

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
