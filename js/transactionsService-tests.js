import assert from 'node:assert/strict'
import AuthContext from '../src/auth/authContext.js'
import { supabase } from '../src/supabase.js'
import {
  TransactionsService,
  shouldEnableLegacyTransactionCloudSync
} from './transactionsService.js'

const createMemoryStorage = () => {
  const values = new Map()
  return {
    get length() {
      return values.size
    },
    getItem(key) {
      return values.has(key) ? values.get(key) : null
    },
    setItem(key, value) {
      values.set(key, String(value))
    },
    removeItem(key) {
      values.delete(key)
    },
    key(index) {
      return [...values.keys()][index] || null
    }
  }
}

assert.equal(shouldEnableLegacyTransactionCloudSync(), false)
assert.equal(shouldEnableLegacyTransactionCloudSync(undefined), false)
assert.equal(shouldEnableLegacyTransactionCloudSync(true), false)
assert.equal(shouldEnableLegacyTransactionCloudSync('1'), false)
assert.equal(shouldEnableLegacyTransactionCloudSync('true'), true)

const originalAuthState = { ...AuthContext._state }
const originalSafeStorage = globalThis.SafeStorage
const originalNavigatorDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'navigator')
const originalGetSession = supabase.auth.getSession
const originalFrom = supabase.from

try {
  const storage = createMemoryStorage()
  let cloudCalls = 0

  globalThis.SafeStorage = storage
  Object.defineProperty(globalThis, 'navigator', {
    configurable: true,
    value: { onLine: true }
  })

  AuthContext._state = {
    ...AuthContext._state,
    user: { id: 'transaction-user-a' },
    isAuthenticated: true
  }

  supabase.auth.getSession = async () => {
    cloudCalls += 1
    throw new Error('legacy cloud auth must not be called')
  }
  supabase.from = () => {
    cloudCalls += 1
    throw new Error('legacy cloud tables must not be queried')
  }

  assert.equal(TransactionsService.getSyncState().legacyCloudSyncEnabled, false)

  const saved = await TransactionsService.update({
    user_id: 'transaction-user-a',
    local_id: '2026-07_custom_income',
    amount: 1200,
    transaction_type: 'income',
    metadata: {
      month: '2026-07',
      category: 'custom_income'
    }
  })

  assert.equal(saved.user_id, 'transaction-user-a')
  assert.equal(saved.metadata.local_id, '2026-07_custom_income')
  assert.equal(cloudCalls, 0, 'local transaction fallback must not contact Supabase')

  const fallbackRaw = storage.getItem('nexora_transactions_fallback_v2::user:transaction-user-a')
  const fallback = JSON.parse(fallbackRaw)
  assert.equal(fallback.transactions.length, 1)
  assert.equal(fallback.transactions[0].amount, 1200)

  AuthContext._state = {
    ...AuthContext._state,
    user: { id: 'transaction-user-b' },
    isAuthenticated: true
  }

  await TransactionsService.update({
    user_id: 'transaction-user-b',
    local_id: '2026-07_custom_income',
    amount: 800,
    transaction_type: 'income',
    metadata: {
      month: '2026-07',
      category: 'custom_income'
    }
  })

  const secondUserFallback = JSON.parse(
    storage.getItem('nexora_transactions_fallback_v2::user:transaction-user-b')
  )
  assert.equal(secondUserFallback.transactions.length, 1)
  assert.equal(secondUserFallback.transactions[0].amount, 800)
  assert.equal(JSON.parse(fallbackRaw).transactions[0].amount, 1200)

  AuthContext._state = {
    ...AuthContext._state,
    user: null,
    session: null,
    isAuthenticated: false
  }

  await TransactionsService.update({
    local_id: '2026-07_anonymous_income',
    amount: 50,
    transaction_type: 'income',
    metadata: {
      month: '2026-07',
      category: 'anonymous_income'
    }
  })

  const anonymousFallback = JSON.parse(storage.getItem('nexora_transactions_fallback_v2'))
  assert.equal(anonymousFallback.transactions.length, 1)
  assert.equal(anonymousFallback.transactions[0].user_id, null)
  assert.equal(cloudCalls, 0)

  AuthContext._state = {
    ...AuthContext._state,
    user: { id: 'transaction-user-a' },
    isAuthenticated: true
  }

  assert.equal(
    await TransactionsService._readFromSupabase('2026-07', 'transaction-user-a'),
    null,
    'legacy budget_entries reads must stay disabled'
  )
  assert.equal(cloudCalls, 0)

  const syncResult = await TransactionsService.syncSupabaseToLocal()
  assert.equal(syncResult.reason, 'legacy-cloud-sync-disabled')
  assert.equal(cloudCalls, 0)

  await TransactionsService.delete({
    user_id: 'transaction-user-a',
    local_id: '2026-07_custom_income'
  })

  const afterDelete = JSON.parse(
    storage.getItem('nexora_transactions_fallback_v2::user:transaction-user-a')
  )
  assert.equal(afterDelete.transactions.length, 0)
  assert.equal(cloudCalls, 0)

  let monthlyBudgetStateUpserts = 0
  let lastMonthlyBudgetPayload = null
  const originalSupabaseFrom = supabase.from
  const originalGetSession = supabase.auth.getSession

  AuthContext._state = {
    ...AuthContext._state,
    user: { id: 'transaction-user-sync' },
    session: { user: { id: 'transaction-user-sync' }, access_token: 'test-token' },
    isAuthenticated: true
  }

  supabase.auth.getSession = async () => ({
    data: { session: { user: { id: 'transaction-user-sync' } } },
    error: null
  })
  supabase.from = (table) => {
    if (table !== 'monthly_budget_states') {
      throw new Error(`unexpected table ${table}`)
    }

    monthlyBudgetStateUpserts += 1
    return {
      upsert(payload) {
        lastMonthlyBudgetPayload = payload
        return {
          select() {
            return {
              single: async () => ({
                data: { data: payload.data, updated_at: payload.updated_at },
                error: null
              })
            }
          }
        }
      }
    }
  }

  await TransactionsService.update({
    user_id: 'transaction-user-sync',
    local_id: '2026-07_sync_income',
    amount: 250,
    transaction_type: 'income',
    metadata: {
      month: '2026-07',
      category: 'sync_income'
    }
  })

  assert.equal(monthlyBudgetStateUpserts, 1)
  assert.equal(lastMonthlyBudgetPayload.user_id, 'transaction-user-sync')
  assert.equal(lastMonthlyBudgetPayload.month_key, '2026-07')
  assert.equal(lastMonthlyBudgetPayload.data.sync_income, 250)

  supabase.from = originalSupabaseFrom
  supabase.auth.getSession = originalGetSession

  console.info('transactionsService-tests: legacy cloud bridge disabled, local fallback preserved — OK')
} finally {
  AuthContext._state = originalAuthState
  supabase.auth.getSession = originalGetSession
  supabase.from = originalFrom

  if (originalSafeStorage === undefined) delete globalThis.SafeStorage
  else globalThis.SafeStorage = originalSafeStorage

  if (originalNavigatorDescriptor) {
    Object.defineProperty(globalThis, 'navigator', originalNavigatorDescriptor)
  } else {
    delete globalThis.navigator
  }
}
