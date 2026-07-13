import assert from 'node:assert/strict'
import fs from 'node:fs'

const createMemoryStorage = () => {
  const values = new Map()
  return {
    getItem: (key) => values.has(key) ? values.get(key) : null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: (key) => values.delete(key)
  }
}

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

const originalWindow = globalThis.window
const originalSafeStorage = globalThis.SafeStorage
const storage = createMemoryStorage()
globalThis.window = {}
globalThis.SafeStorage = storage

const { default: AuthContext } = await import('../auth/authContext.js')
const { UserAppSettingsService } = await import('../../js/userAppSettingsService.js')
const originalAuthState = { ...AuthContext._state }

const html = fs.readFileSync(new URL('../../index.html', import.meta.url), 'utf8')
const CAGNOTTES_STORAGE_KEY = 'budget_cagnottes'
const getCurrentStorageOwnerId = eval(`(${extractFunction(html, 'getCurrentStorageOwnerId')})`)
const syncedSettingStorageKey = eval(`(${extractFunction(html, 'syncedSettingStorageKey')})`)
const readCagnottes = eval(`(${extractFunction(html, 'readCagnottes')})`)
const writeCagnottes = eval(`(${extractFunction(html, 'writeCagnottes')})`)
const getAnalyticsGoals = eval(`(${extractFunction(html, 'getAnalyticsGoals')})`)

try {
  window.AuthContext = AuthContext
  window.UserAppSettingsService = {
    getLocalStorageKey: UserAppSettingsService.getLocalStorageKey
  }

  storage.setItem(CAGNOTTES_STORAGE_KEY, JSON.stringify([
    { name: 'Projet local historique', target: 1000, current: 100 }
  ]))
  storage.setItem(`${CAGNOTTES_STORAGE_KEY}::user:owner-a`, JSON.stringify([
    { name: 'Projet A', target: 2000, current: 500 }
  ]))

  AuthContext._state = { ...AuthContext._state, user: { id: 'owner-a' }, isAuthenticated: true }
  assert.deepEqual(readCagnottes(), [
    { name: 'Projet A', target: 2000, current: 500 }
  ], 'owner A should read only its savings projects')
  assert.deepEqual(getAnalyticsGoals(), readCagnottes(), 'analytics should use real owner projects without fake defaults')

  AuthContext._state = { ...AuthContext._state, user: { id: 'owner-b' }, isAuthenticated: true }
  assert.deepEqual(readCagnottes(), [], 'owner B must not inherit owner A or the legacy global projects')
  writeCagnottes([{ name: 'Projet B', target: 800, current: 50 }])
  assert.deepEqual(JSON.parse(storage.getItem(`${CAGNOTTES_STORAGE_KEY}::user:owner-b`)), [
    { name: 'Projet B', target: 800, current: 50 }
  ], 'owner B should write only to its namespace')
  assert.equal(
    JSON.parse(storage.getItem(`${CAGNOTTES_STORAGE_KEY}::user:owner-a`))[0].name,
    'Projet A',
    'owner B writes should preserve owner A projects'
  )
  assert.equal(
    JSON.parse(storage.getItem(CAGNOTTES_STORAGE_KEY))[0].name,
    'Projet local historique',
    'authenticated writes should preserve legacy global projects'
  )

  AuthContext._state = { ...AuthContext._state, user: null, session: null, isAuthenticated: false }
  assert.equal(readCagnottes()[0].name, 'Projet local historique', 'anonymous mode should keep legacy projects')

  assert.doesNotMatch(html, /Seed demo cagnottes/, 'the app should not auto-create fake savings projects')
  assert.doesNotMatch(html, /Voyage Japon/, 'storage should not auto-create a fake savings project')
  assert.doesNotMatch(
    extractFunction(html, 'getAnalyticsGoals'),
    /Voyage de noces|Fonds d'urgence|Voiture|Maison/,
    'analytics should not present fake defaults as user data'
  )

  console.info('cagnottesStorage-tests: user-scoped savings projects — OK')
} finally {
  AuthContext._state = originalAuthState
  if (originalWindow === undefined) delete globalThis.window
  else globalThis.window = originalWindow
  if (originalSafeStorage === undefined) delete globalThis.SafeStorage
  else globalThis.SafeStorage = originalSafeStorage
}
