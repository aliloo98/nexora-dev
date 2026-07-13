import assert from 'node:assert/strict'
import AuthContext from '../src/auth/authContext.js'
import { MonthlyBudgetStateService } from './monthlyBudgetStateService.js'

const META_KEY = 'nexora_monthly_budget_states_meta_v1'
const metaKeyFor = (userId) => `${META_KEY}::user:${userId}`

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
      return Array.from(values.keys())[index] || null
    }
  }
}

const originalAuthState = { ...AuthContext._state }
const originalSafeStorage = globalThis.SafeStorage
const originalNavigatorDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'navigator')

try {
  const storage = createMemoryStorage()
  globalThis.SafeStorage = storage
  Object.defineProperty(globalThis, 'navigator', {
    configurable: true,
    value: { onLine: false }
  })

  const legacyMeta = {
    '2026-01': {
      source: 'legacy',
      local_updated_at: '2026-01-15T10:00:00.000Z'
    }
  }
  const legacyMetaRaw = JSON.stringify(legacyMeta)
  storage.setItem(META_KEY, legacyMetaRaw)

  AuthContext._state.user = { id: 'user-a' }
  await MonthlyBudgetStateService.saveMonthlyBudgetState('2026-07', { rev_ali: 2400 })

  const userAMeta = JSON.parse(storage.getItem(metaKeyFor('user-a')))
  assert.equal(userAMeta['2026-07'].source, 'local', 'user A metadata should use its namespace')
  assert.equal(storage.getItem(META_KEY), legacyMetaRaw, 'authenticated writes should not alter legacy global metadata')

  AuthContext._state.user = { id: 'user-b' }
  await MonthlyBudgetStateService.saveMonthlyBudgetState('2026-08', { rev_ali: 3100 })

  const userBMeta = JSON.parse(storage.getItem(metaKeyFor('user-b')))
  assert.equal(userBMeta['2026-08'].source, 'local', 'user B metadata should use its namespace')
  assert.equal(userBMeta['2026-07'], undefined, 'user B should not read user A metadata')
  assert.equal(JSON.parse(storage.getItem(metaKeyFor('user-a')))['2026-08'], undefined, 'user A should not read user B metadata')
  assert.equal(storage.getItem(META_KEY), legacyMetaRaw, 'a second authenticated user should not alter legacy global metadata')

  AuthContext._state.user = { id: 'user-a' }
  await MonthlyBudgetStateService.deleteMonthlyBudgetState('2026-07')

  assert.equal(JSON.parse(storage.getItem(metaKeyFor('user-a')))['2026-07'], undefined, 'user A deletion should remove only user A metadata')
  assert.equal(JSON.parse(storage.getItem(metaKeyFor('user-b')))['2026-08'].source, 'local', 'user A deletion should preserve user B metadata')
  assert.equal(storage.getItem(META_KEY), legacyMetaRaw, 'authenticated deletion should not alter legacy global metadata')

  AuthContext._state.user = null
  await MonthlyBudgetStateService.saveMonthlyBudgetState('2026-09', { rev_ali: 1800 })

  const anonymousMeta = JSON.parse(storage.getItem(META_KEY))
  assert.deepEqual(anonymousMeta['2026-01'], legacyMeta['2026-01'], 'anonymous writes should preserve existing global metadata')
  assert.equal(anonymousMeta['2026-09'].source, 'local', 'anonymous metadata should keep using the global key')

  await MonthlyBudgetStateService.deleteMonthlyBudgetState('2026-09')

  assert.deepEqual(JSON.parse(storage.getItem(META_KEY)), legacyMeta, 'anonymous deletion should preserve unrelated global metadata')
  assert.equal(storage.getItem(metaKeyFor('user-b')) !== null, true, 'anonymous operations should preserve authenticated metadata')

  console.log('monthlyBudgetStateService-tests: OK')
} finally {
  AuthContext._state = originalAuthState

  if (originalSafeStorage === undefined) delete globalThis.SafeStorage
  else globalThis.SafeStorage = originalSafeStorage

  if (originalNavigatorDescriptor) {
    Object.defineProperty(globalThis, 'navigator', originalNavigatorDescriptor)
  } else {
    delete globalThis.navigator
  }
}
