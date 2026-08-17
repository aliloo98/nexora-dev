/**
 * Test-only Supabase PostgREST client for administrative and RLS verification
 * This runs in Node/test context, NOT in browser
 * Uses REST/PostgREST API directly to avoid Realtime/WebSocket dependency
 * Uses service-role key for admin operations only
 * NEVER expose service-role to browser
 */

/**
 * Create an admin client with service-role privileges using PostgREST
 * Used ONLY for post-condition verification in tests
 * @param {string} url - Supabase URL
 * @param {string} serviceRoleKey - Service role key (from CI env)
 * @returns {object} - Simple client with from() method
 */
export function createAdminClient(url, serviceRoleKey) {
  if (!serviceRoleKey) {
    throw new Error('Service role key required for admin client')
  }
  return {
    url,
    apiKey: serviceRoleKey,
    headers: {
      'apikey': serviceRoleKey,
      'Authorization': `Bearer ${serviceRoleKey}`,
      'Content-Type': 'application/json'
    },
    from(table) {
      return {
        select(columns = '*') {
          return {
            eq(column, value) {
              return {
                single() {
                  return fetch(`${this.url}/rest/v1/${table}?${column}=eq.${encodeURIComponent(value)}&select=${columns}`, {
                    headers: this.headers
                  }).then(async res => {
                    const data = await res.json()
                    if (!res.ok) {
                      return { data: null, error: { message: res.statusText } }
                    }
                    return { data, error: null }
                  })
                }
              }
            }
          }
        }
      }
    }
  }
}

/**
 * Create a user client with a specific JWT token using PostgREST
 * Used for RLS testing with real user sessions
 * @param {string} url - Supabase URL
 * @param {string} anonKey - Anon key
 * @param {string} accessToken - User JWT token
 * @returns {object} - Simple client with from() method
 */
export function createUserClient(url, anonKey, accessToken) {
  return {
    url,
    apiKey: anonKey,
    accessToken,
    headers: {
      'apikey': anonKey,
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    from(table) {
      return {
        insert(payload) {
          return {
            select(columns = '*') {
              return {
                single() {
                  return fetch(`${this.url}/rest/v1/${table}?select=${columns}`, {
                    method: 'POST',
                    headers: this.headers,
                    body: JSON.stringify(payload)
                  }).then(async res => {
                    const data = await res.json()
                    if (!res.ok) {
                      return { data: null, error: { message: res.statusText } }
                    }
                    return { data, error: null }
                  })
                }
              }
            }
          }
        },
        select(columns = '*') {
          return {
            eq(column, value) {
              return {
                async execute() {
                  const response = await fetch(`${this.url}/rest/v1/${table}?${column}=eq.${encodeURIComponent(value)}&select=${columns}`, {
                    headers: this.headers
                  })
                  const data = await response.json()
                  if (!response.ok) {
                    return { data: null, error: { message: response.statusText } }
                  }
                  return { data, error: null }
                }
              }
            }
          }
        },
        update(payload) {
          return {
            eq(column, value) {
              return {
                select(columns = '*') {
                  return {
                    async execute() {
                      const response = await fetch(`${this.url}/rest/v1/${table}?${column}=eq.${encodeURIComponent(value)}&select=${columns}`, {
                        method: 'PATCH',
                        headers: this.headers,
                        body: JSON.stringify(payload)
                      })
                      const data = await response.json()
                      if (!response.ok) {
                        return { data: null, error: { message: response.statusText } }
                      }
                      return { data, error: null }
                    }
                  }
                }
              }
            }
          }
        },
        delete() {
          return {
            eq(column, value) {
              return {
                select(columns = '*') {
                  return {
                    async execute() {
                      const response = await fetch(`${this.url}/rest/v1/${table}?${column}=eq.${encodeURIComponent(value)}&select=${columns}`, {
                        method: 'DELETE',
                        headers: this.headers
                      })
                      const data = await response.json()
                      if (!response.ok) {
                        return { data: null, error: { message: response.statusText } }
                      }
                      return { data, error: null }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }
}

/**
 * Verify row ownership
 * @param {object} adminClient - Admin client
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
 * @param {object} adminClient - Admin client
 * @param {string} table - Table name
 * @param {string} userId - User ID
 * @returns {Promise<Array>}
 */
export async function getUserRecords(adminClient, table, userId) {
  const response = await fetch(`${adminClient.url}/rest/v1/${table}?user_id=eq.${encodeURIComponent(userId)}&select=*`, {
    headers: adminClient.headers
  })
  const data = await response.json()
  if (!response.ok) {
    throw new Error(`Failed to get user records: ${response.statusText}`)
  }
  return data || []
}

/**
 * Attempt cross-user SELECT (RLS test)
 * @param {object} userClient - User client with JWT
 * @param {string} table - Table name
 * @param {string} recordId - Target record ID
 * @returns {Promise<{accessible: boolean, rowCount: number, error?: string}>}
 */
export async function attemptCrossUserSelect(userClient, table, recordId) {
  const { data, error } = await userClient
    .from(table)
    .select('*')
    .eq('id', recordId)
    .execute()

  // Technical error - FAIL
  if (error) {
    throw new Error(`Technical error during cross-user SELECT: ${error.message}`)
  }

  // RLS behavior: should return empty array when blocked
  const rowCount = data ? data.length : 0
  return { accessible: rowCount === 0, rowCount }
}

/**
 * Attempt cross-user UPDATE (RLS test)
 * @param {object} userClient - User client with JWT
 * @param {string} table - Table name
 * @param {string} recordId - Target record ID
 * @param {object} updates - Update payload
 * @returns {Promise<{updated: boolean, affectedCount: number, error?: string}>}
 */
export async function attemptCrossUserUpdate(userClient, table, recordId, updates) {
  const { data, error } = await userClient
    .from(table)
    .update(updates)
    .eq('id', recordId)
    .select()
    .execute()

  // Technical error - FAIL
  if (error) {
    throw new Error(`Technical error during cross-user UPDATE: ${error.message}`)
  }

  // RLS behavior: should return empty array when blocked
  const affectedCount = data ? data.length : 0
  return { updated: affectedCount === 0, affectedCount }
}

/**
 * Attempt cross-user DELETE (RLS test)
 * @param {object} userClient - User client with JWT
 * @param {string} table - Table name
 * @param {string} recordId - Target record ID
 * @returns {Promise<{deleted: boolean, affectedCount: number, error?: string}>}
 */
export async function attemptCrossUserDelete(userClient, table, recordId) {
  const { data, error } = await userClient
    .from(table)
    .delete()
    .eq('id', recordId)
    .select()
    .execute()

  // Technical error - FAIL
  if (error) {
    throw new Error(`Technical error during cross-user DELETE: ${error.message}`)
  }

  // RLS behavior: should return empty array when blocked
  const affectedCount = data ? data.length : 0
  return { deleted: affectedCount === 0, affectedCount }
}
