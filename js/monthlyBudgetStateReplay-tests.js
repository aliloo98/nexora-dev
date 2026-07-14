import assert from 'node:assert/strict'
import AuthContext from '../src/auth/authContext.js'
import { supabase } from '../src/supabase.js'
import { MonthlyBudgetStateService } from './monthlyBudgetStateService.js'

const values = new Map()
const storage = {
  getItem: key => values.get(key) ?? null,
  setItem: (key, value) => values.set(key, String(value)),
  removeItem: key => values.delete(key)
}

const remote = {
  userId: 'owner-a',
  error: null,
  pushed: [],
  defer: false,
  releases: []
}
const onlineListeners = []
const originalAuthState = { ...AuthContext._state }
const originalSafeStorage = globalThis.SafeStorage
const originalWindow = globalThis.window
const originalNavigatorDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'navigator')
const originalGetSession = supabase.auth.getSession
const originalFrom = supabase.from

try {
  globalThis.SafeStorage = storage
  globalThis.window = {
    addEventListener: (event, listener) => {
      if (event === 'online') onlineListeners.push(listener)
    }
  }
  Object.defineProperty(globalThis, 'navigator', {
    configurable: true,
    value: { onLine: false }
  })
  AuthContext._state = {
    ...AuthContext._state,
    user: { id: 'owner-a' },
    isAuthenticated: true
  }

  supabase.auth.getSession = async () => ({
    data: { session: remote.userId ? { user: { id: remote.userId } } : null },
    error: null
  })
  supabase.from = () => ({
    upsert(payload) {
      remote.pushed.push(payload)
      return {
        select() {
          return {
            single: async () => {
              const response = {
                data: remote.error ? null : { data: payload.data, updated_at: '2026-07-14T10:00:00.000Z' },
                error: remote.error
              }
              if (!remote.defer) return response
              return new Promise(resolve => remote.releases.push(() => resolve(response)))
            }
          }
        }
      }
    }
  })

  let result = await MonthlyBudgetStateService.saveMonthlyBudgetState('2026-07', { rev_ali: 2600 })
  assert.equal(result.reason, 'offline', 'offline saves must return immediately after durable local persistence')
  assert.deepEqual(MonthlyBudgetStateService.getPendingMonthKeys(), ['2026-07'], 'the offline month must remain pending')

  globalThis.navigator.onLine = true
  result = await MonthlyBudgetStateService.init()
  assert.equal(result.ok, true, 'initialization after authentication must replay pending months')
  assert.deepEqual(result.pending, [], 'successful replay must clear the monthly pending marker')
  assert.deepEqual(remote.pushed[0].data, { rev_ali: 2600 }, 'replay must send the latest local snapshot')
  assert.equal(remote.pushed[0].user_id, 'owner-a', 'replay must target only the authenticated owner')

  await MonthlyBudgetStateService.init()
  assert.equal(onlineListeners.length, 1, 'the reconnect listener must be installed only once')

  remote.error = { message: 'temporary network failure' }
  result = await MonthlyBudgetStateService.saveMonthlyBudgetState('2026-08', { rev_ali: 2700 })
  assert.equal(result.reason, 'cloud-error', 'a rejected cloud write must fall back to local state')
  assert.deepEqual(MonthlyBudgetStateService.getPendingMonthKeys(), ['2026-08'], 'cloud failures must preserve the pending month')

  remote.error = null
  result = await MonthlyBudgetStateService.replayPendingChanges()
  assert.equal(result.ok, true, 'a later replay must recover from the temporary failure')
  assert.deepEqual(result.pending, [], 'the recovered month must no longer be pending')

  remote.defer = true
  const firstSave = MonthlyBudgetStateService.saveMonthlyBudgetState('2026-10', { rev_ali: 2900 })
  const secondSave = MonthlyBudgetStateService.saveMonthlyBudgetState('2026-10', { rev_ali: 3000 })
  while (remote.releases.length < 1) await new Promise(resolve => setTimeout(resolve, 0))
  remote.releases.shift()()
  const firstResult = await firstSave
  assert.equal(firstResult.reason, 'local-changed-during-sync', 'an older response must detect a newer local revision')
  while (remote.releases.length < 1) await new Promise(resolve => setTimeout(resolve, 0))
  remote.releases.shift()()
  const secondResult = await secondSave
  assert.equal(secondResult.synced, true, 'the newer revision must be sent after the older request completes')
  assert.deepEqual(
    JSON.parse(storage.getItem('budget_owner-a_2026-10')),
    { rev_ali: 3000 },
    'an older cloud response must never overwrite a newer local snapshot'
  )
  assert.equal(
    JSON.parse(storage.getItem('nexora_monthly_budget_states_meta_v1::user:owner-a'))['2026-10'].pending_operation,
    null,
    'only the newest successful revision may clear the pending marker'
  )
  assert.deepEqual(
    remote.pushed.slice(-2).map(payload => payload.data.rev_ali),
    [2900, 3000],
    'same-month requests must reach Supabase in local revision order'
  )

  const ownerASave = MonthlyBudgetStateService.saveMonthlyBudgetState('2026-11', { rev_ali: 3100 })
  while (remote.releases.length < 1) await new Promise(resolve => setTimeout(resolve, 0))
  AuthContext._state = {
    ...AuthContext._state,
    user: { id: 'owner-b' },
    isAuthenticated: true
  }
  remote.userId = 'owner-b'
  remote.releases.shift()()
  assert.equal((await ownerASave).synced, true, 'an in-flight owner A response may complete safely after an account switch')
  assert.deepEqual(
    JSON.parse(storage.getItem('budget_owner-a_2026-11')),
    { rev_ali: 3100 },
    'an in-flight response must remain in the namespace captured when the save started'
  )
  assert.equal(storage.getItem('budget_owner-b_2026-11'), null, 'an owner A response must never write into owner B storage')

  remote.defer = false

  AuthContext._state = {
    ...AuthContext._state,
    user: { id: 'owner-a' },
    isAuthenticated: true
  }
  remote.userId = null
  result = await MonthlyBudgetStateService.saveMonthlyBudgetState('2026-09', { rev_ali: 2800 })
  assert.equal(result.reason, 'no-session', 'no monthly snapshot may be sent without a session')
  assert.deepEqual(MonthlyBudgetStateService.getPendingMonthKeys(), ['2026-09'], 'no-session saves must remain queued')

  console.info('monthlyBudgetStateReplay-tests: offline monthly saves are durable and replayable — OK')
} finally {
  AuthContext._state = originalAuthState
  supabase.auth.getSession = originalGetSession
  supabase.from = originalFrom

  if (originalSafeStorage === undefined) delete globalThis.SafeStorage
  else globalThis.SafeStorage = originalSafeStorage

  if (originalWindow === undefined) delete globalThis.window
  else globalThis.window = originalWindow

  if (originalNavigatorDescriptor) {
    Object.defineProperty(globalThis, 'navigator', originalNavigatorDescriptor)
  } else {
    delete globalThis.navigator
  }
}
