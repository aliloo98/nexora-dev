import assert from 'node:assert/strict'
import fs from 'node:fs'

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
const { UserAppSettingsService } = await import('./userAppSettingsService.js')
const originalAuthState = { ...AuthContext._state }

const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8')
const extractFunction = (source, name) => {
  const start = source.indexOf(`function ${name}(`)
  if (start === -1) throw new Error(`Function ${name} not found`)
  let index = source.indexOf('{', start) + 1
  let depth = 1
  while (index < source.length && depth > 0) {
    if (source[index] === '{') depth += 1
    else if (source[index] === '}') depth -= 1
    index += 1
  }
  return source.slice(start, index)
}
const filterTechnicalRecords = (items) => items
const DEBTS_STORAGE_KEY = 'nexora_debts_v1'
const getCurrentStorageOwnerId = eval(`(${extractFunction(html, 'getCurrentStorageOwnerId')})`)
const syncedSettingStorageKey = eval(`(${extractFunction(html, 'syncedSettingStorageKey')})`)
const readDebts = eval(`(${extractFunction(html, 'readDebts')})`)
const saveDebts = eval(`(${extractFunction(html, 'saveDebts')})`)

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
  window.AuthContext = AuthContext
  window.UserAppSettingsService = {
    getLocalStorageKey: UserAppSettingsService.getLocalStorageKey,
    saveSetting: async () => ({ updated_at: new Date().toISOString() }),
    syncLocalSettingToCloud: async () => ({ ok: true })
  }
  assert.equal(
    UserAppSettingsService.getLocalStorageKey('nexora_debts_v1'),
    'nexora_debts_v1::user:owner-a',
    'the central settings service should expose the authenticated local key'
  )
  assert.deepEqual(
    await readSyncedArray('nexora_debts_v1'),
    [{ id: 'namespaced-owner-a' }],
    'owner A reads the owner A namespace'
  )
  assert.deepEqual(readDebts(), [{ id: 'namespaced-owner-a' }], 'legacy debt UI should read owner A namespace')

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
  assert.deepEqual(readDebts(), [], 'legacy debt UI must not expose owner A debt to owner B')
  saveDebts([{ id: 'owner-b-debt', name: 'Crédit B', remaining: 400 }])
  assert.equal(
    JSON.parse(storage.getItem('nexora_debts_v1::user:owner-b'))[0].id,
    'owner-b-debt',
    'legacy debt UI should write only to owner B namespace'
  )
  assert.deepEqual(
    JSON.parse(storage.getItem('nexora_debts_v1')),
    [{ id: 'legacy-owner-a' }],
    'an authenticated debt write should not alter the legacy global value directly'
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
  assert.deepEqual(readDebts(), [{ id: 'legacy-owner-a' }], 'anonymous debt UI keeps the legacy global fallback')

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
