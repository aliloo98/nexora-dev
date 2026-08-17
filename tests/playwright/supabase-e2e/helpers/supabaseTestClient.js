/**
 * Test-only Supabase client for administrative and RLS verification
 * This runs in Node/test context, NOT in browser
 * Uses service-role key for admin operations only
 * NEVER expose service-role to browser
 */

import { createClient } from '@supabase/supabase-js'

/**
 * Create an admin client with service-role privileges
 * Used ONLY for post-condition verification in tests
 * @param {string} url - Supabase URL
 * @param {string} serviceRoleKey - Service role key (from CI env)
 * @returns {SupabaseClient}
 */
export function createAdminClient(url, serviceRoleKey) {
  if (!serviceRoleKey) {
    throw new Error('Service role key required for admin client')
  }
  return createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    },
    // Disable Realtime for Node 20 compatibility (test-only, no WebSocket needed)
    realtime: {
      params: {
        eventsPerSecond: 0
      }
    },
    db: {
      schema: 'public'
    }
  })
}

/**
 * Create a user client with a specific JWT token
 * Used for RLS testing with real user sessions
 * @param {string} url - Supabase URL
 * @param {string} anonKey - Anon key
 * @param {string} accessToken - User JWT token
 * @returns {SupabaseClient}
 */
export function createUserClient(url, anonKey, accessToken) {
  const client = createClient(url, anonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    },
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    },
    // Disable Realtime for Node 20 compatibility (test-only, no WebSocket needed)
    realtime: {
      params: {
        eventsPerSecond: 0
      }
    },
    db: {
      schema: 'public'
    }
  })
  return client
}

/**
 * Verify row ownership
 * @param {SupabaseClient} adminClient - Admin client
 * @param {string} table - Table name
 * @param {string} recordId - Record ID
 * @param {string} expectedUserId - Expected user_id
 * @returns {Promise<boolean>}
 */
export async function verifyRowOwnership(adminClient, table, recordId, expectedUserId) {
  const { data, error } = await adminClient
    .from(table)
    .select('user_id')
    .eq('id', recordId)
    .single()
  
  if (error) {
    throw new Error(`Failed to verify ownership: ${error.message}`)
  }
  
  return data.user_id === expectedUserId
}

/**
 * Get all records for a user from a table
 * @param {SupabaseClient} adminClient - Admin client
 * @param {string} table - Table name
 * @param {string} userId - User ID
 * @returns {Promise<Array>}
 */
export async function getUserRecords(adminClient, table, userId) {
  const { data, error } = await adminClient
    .from(table)
    .select('*')
    .eq('user_id', userId)
  
  if (error) {
    throw new Error(`Failed to get user records: ${error.message}`)
  }
  
  return data || []
}

/**
 * Attempt cross-user SELECT (RLS test)
 * @param {SupabaseClient} userClient - User client with JWT
 * @param {string} table - Table name
 * @param {string} recordId - Target record ID
 * @returns {Promise<{accessible: boolean, error?: string}>}
 */
export async function attemptCrossUserSelect(userClient, table, recordId) {
  const { data, error } = await userClient
    .from(table)
    .select('*')
    .eq('id', recordId)
    .single()
  
  if (error) {
    // RLS blocked it
    return { accessible: false, error: error.message }
  }
  
  // RLS failed to block it
  return { accessible: true, data }
}

/**
 * Attempt cross-user UPDATE (RLS test)
 * @param {SupabaseClient} userClient - User client with JWT
 * @param {string} table - Table name
 * @param {string} recordId - Target record ID
 * @param {object} updates - Update payload
 * @returns {Promise<{updated: boolean, error?: string}>}
 */
export async function attemptCrossUserUpdate(userClient, table, recordId, updates) {
  const { data, error } = await userClient
    .from(table)
    .update(updates)
    .eq('id', recordId)
    .select()
  
  if (error) {
    // RLS blocked it
    return { updated: false, error: error.message }
  }
  
  // RLS failed to block it
  return { updated: true, data }
}

/**
 * Attempt cross-user DELETE (RLS test)
 * @param {SupabaseClient} userClient - User client with JWT
 * @param {string} table - Table name
 * @param {string} recordId - Target record ID
 * @returns {Promise<{deleted: boolean, error?: string}>}
 */
export async function attemptCrossUserDelete(userClient, table, recordId) {
  const { data, error } = await userClient
    .from(table)
    .delete()
    .eq('id', recordId)
    .select()
  
  if (error) {
    // RLS blocked it
    return { deleted: false, error: error.message }
  }
  
  // RLS failed to block it
  return { deleted: true, data }
}
