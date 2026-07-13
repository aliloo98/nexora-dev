import assert from 'node:assert/strict'

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

const originalWindow = globalThis.window
const originalLocalStorage = globalThis.localStorage
const originalSafeStorage = globalThis.SafeStorage
const storage = createMemoryStorage()

globalThis.window = { localStorage: storage }
globalThis.localStorage = storage
globalThis.SafeStorage = storage

const { default: AuthContext } = await import('../src/auth/authContext.js')
const { readSyncedArray } = await import('./syncedSettingAccess.js')
const originalAuthState = { ...AuthContext._state }

try {
  storage.setItem('nexora_debts_v1', JSON.stringify([{ id: 'legacy-owner-a' }]))
  storage.setItem(
    'nexora_debts_v1::user:owner-a',
    JSON.stringify([{ id: 'namespaced-owner-a' }])
  )

  AuthContext._state = {
    ...AuthContext._state,
    user: { id: 'owner-a' },
    isAuthenticated: true
  }
  assert.deepEqual(
    await readSyncedArray('nexora_debts_v1'),
    [{ id: 'namespaced-owner-a' }],
    'owner A reads the owner A namespace'
  )

  AuthContext._state = {
    ...AuthContext._state,
    user: { id: 'owner-b' },
    isAuthenticated: true
  }
  assert.deepEqual(
    await readSyncedArray('nexora_debts_v1'),
    [],
    'owner B must not fall back to the global mirror written by owner A'
  )

  AuthContext._state = {
    ...AuthContext._state,
    user: null,
    session: null,
    isAuthenticated: false
  }
  assert.deepEqual(
    await readSyncedArray('nexora_debts_v1'),
    [{ id: 'legacy-owner-a' }],
    'anonymous local mode keeps the legacy global fallback'
  )

  console.info('syncedSettingAccess-tests: authenticated namespaces remain isolated — OK')
} finally {
  AuthContext._state = originalAuthState

  if (originalWindow === undefined) delete globalThis.window
  else globalThis.window = originalWindow

  if (originalLocalStorage === undefined) delete globalThis.localStorage
  else globalThis.localStorage = originalLocalStorage

  if (originalSafeStorage === undefined) delete globalThis.SafeStorage
  else globalThis.SafeStorage = originalSafeStorage
}
