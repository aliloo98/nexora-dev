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
const BUDGET_CYCLE_SETTINGS_KEY = 'nexora_budget_cycle_settings_v1'
const StorageManager = { setItem: async () => true }
const clampBudgetCycleDay = eval(`(${extractFunction(html, 'clampBudgetCycleDay')})`)
const getDefaultBudgetCycleSettings = eval(`(${extractFunction(html, 'getDefaultBudgetCycleSettings')})`)
const getCurrentStorageOwnerId = eval(`(${extractFunction(html, 'getCurrentStorageOwnerId')})`)
const syncedSettingStorageKey = eval(`(${extractFunction(html, 'syncedSettingStorageKey')})`)
const readBudgetCycleSettings = eval(`(${extractFunction(html, 'readBudgetCycleSettings')})`)
const writeBudgetCycleSettings = eval(`(${extractFunction(html, 'writeBudgetCycleSettings')})`)

try {
  window.AuthContext = AuthContext
  window.UserAppSettingsService = {
    getLocalStorageKey: UserAppSettingsService.getLocalStorageKey,
    saveSetting: async () => ({ updated_at: new Date().toISOString() }),
    syncLocalSettingToCloud: async () => ({ ok: true })
  }

  storage.setItem(BUDGET_CYCLE_SETTINGS_KEY, JSON.stringify({
    mode: 'custom',
    startDay: 20,
    endDay: 19,
    updatedAt: 'legacy-global'
  }))
  storage.setItem(`${BUDGET_CYCLE_SETTINGS_KEY}::user:owner-a`, JSON.stringify({
    mode: 'custom',
    startDay: 28,
    endDay: 27,
    updatedAt: 'owner-a'
  }))

  AuthContext._state = { ...AuthContext._state, user: { id: 'owner-a' }, isAuthenticated: true }
  assert.deepEqual(readBudgetCycleSettings(), {
    mode: 'custom',
    startDay: 28,
    endDay: 27,
    updatedAt: 'owner-a'
  }, 'owner A should read only its budget cycle')

  AuthContext._state = { ...AuthContext._state, user: { id: 'owner-b' }, isAuthenticated: true }
  assert.deepEqual(
    readBudgetCycleSettings(),
    getDefaultBudgetCycleSettings(),
    'owner B must not inherit owner A or the legacy global cycle'
  )

  const ownerBValue = writeBudgetCycleSettings({ mode: 'custom', startDay: 15, endDay: 14 })
  const storedOwnerBValue = JSON.parse(storage.getItem(`${BUDGET_CYCLE_SETTINGS_KEY}::user:owner-b`))
  assert.deepEqual(storedOwnerBValue, ownerBValue, 'owner B should write its budget cycle only in its namespace')
  assert.equal(
    JSON.parse(storage.getItem(BUDGET_CYCLE_SETTINGS_KEY)).updatedAt,
    'legacy-global',
    'authenticated direct writes should preserve the legacy global cycle'
  )
  assert.equal(
    JSON.parse(storage.getItem(`${BUDGET_CYCLE_SETTINGS_KEY}::user:owner-a`)).updatedAt,
    'owner-a',
    'owner B writes should preserve owner A cycle'
  )

  AuthContext._state = { ...AuthContext._state, user: null, session: null, isAuthenticated: false }
  assert.equal(readBudgetCycleSettings().startDay, 20, 'anonymous mode should keep the legacy global cycle')
  await new Promise(resolve => setTimeout(resolve, 0))

  console.info('budgetCycleStorage-tests: user-scoped cycle settings — OK')
} finally {
  AuthContext._state = originalAuthState
  if (originalWindow === undefined) delete globalThis.window
  else globalThis.window = originalWindow
  if (originalSafeStorage === undefined) delete globalThis.SafeStorage
  else globalThis.SafeStorage = originalSafeStorage
}
