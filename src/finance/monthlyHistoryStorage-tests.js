import assert from 'node:assert/strict'
import fs from 'node:fs'

const createMemoryStorage = () => {
  const values = new Map()
  return {
    get length() {
      return values.size
    },
    getItem: (key) => values.has(key) ? values.get(key) : null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: (key) => values.delete(key),
    key: (index) => Array.from(values.keys())[index] || null
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
const MONTHLY_HISTORY_SNAPSHOTS_KEY = 'nexora_monthly_history_snapshots_v1'
const StorageManager = { setItem: async (key, value) => storage.setItem(key, value) }
const getCurrentStorageOwnerId = eval(`(${extractFunction(html, 'getCurrentStorageOwnerId')})`)
const syncedSettingStorageKey = eval(`(${extractFunction(html, 'syncedSettingStorageKey')})`)
const readMonthlyHistoryStore = eval(`(${extractFunction(html, 'readMonthlyHistoryStore')})`)
const writeMonthlyHistoryStore = eval(`(${extractFunction(html, 'writeMonthlyHistoryStore')})`)
const getBudgetMonthFromStorageKey = eval(`(${extractFunction(html, 'getBudgetMonthFromStorageKey')})`)
const getHistoryMonthsFromStorage = eval(`(${extractFunction(html, 'getHistoryMonthsFromStorage')})`)

try {
  window.AuthContext = AuthContext
  window.UserAppSettingsService = {
    getLocalStorageKey: UserAppSettingsService.getLocalStorageKey,
    saveSetting: async () => ({ updated_at: new Date().toISOString() }),
    syncLocalSettingToCloud: async () => ({ ok: true })
  }

  storage.setItem(MONTHLY_HISTORY_SNAPSHOTS_KEY, JSON.stringify({
    version: 1,
    snapshots: { '2025-12': { income: 1000 } }
  }))
  storage.setItem(`${MONTHLY_HISTORY_SNAPSHOTS_KEY}::user:owner-a`, JSON.stringify({
    version: 1,
    snapshots: { '2026-01': { income: 2000 } }
  }))
  storage.setItem('budget_2025-11', JSON.stringify({ rev_ali: 900 }))
  storage.setItem('budget_owner-a_2026-02', JSON.stringify({ rev_ali: 2100 }))
  storage.setItem('budget_owner-b_2026-03', JSON.stringify({ rev_ali: 3100 }))

  AuthContext._state = { ...AuthContext._state, user: { id: 'owner-a' }, isAuthenticated: true }
  assert.deepEqual(
    Object.keys(readMonthlyHistoryStore().snapshots),
    ['2026-01'],
    'owner A should read only its history snapshots'
  )
  assert.deepEqual(
    getHistoryMonthsFromStorage(),
    ['2026-01', '2026-02'],
    'owner A history should include only owner A snapshots and monthly keys'
  )
  assert.equal(getBudgetMonthFromStorageKey('budget_owner-b_2026-03'), null, 'owner A should reject owner B monthly keys')

  AuthContext._state = { ...AuthContext._state, user: { id: 'owner-b' }, isAuthenticated: true }
  assert.deepEqual(readMonthlyHistoryStore().snapshots, {}, 'owner B must not inherit owner A or global history')
  assert.deepEqual(getHistoryMonthsFromStorage(), ['2026-03'], 'owner B should discover only owner B monthly keys')
  writeMonthlyHistoryStore({ snapshots: { '2026-04': { income: 3200 } } })
  assert.equal(
    JSON.parse(storage.getItem(`${MONTHLY_HISTORY_SNAPSHOTS_KEY}::user:owner-b`)).snapshots['2026-04'].income,
    3200,
    'owner B history write should use owner B namespace'
  )
  assert.equal(
    JSON.parse(storage.getItem(`${MONTHLY_HISTORY_SNAPSHOTS_KEY}::user:owner-a`)).snapshots['2026-01'].income,
    2000,
    'owner B history write should preserve owner A history'
  )
  assert.equal(
    JSON.parse(storage.getItem(MONTHLY_HISTORY_SNAPSHOTS_KEY)).snapshots['2025-12'].income,
    1000,
    'authenticated history writes should preserve the legacy global store directly'
  )

  AuthContext._state = { ...AuthContext._state, user: null, session: null, isAuthenticated: false }
  assert.deepEqual(getHistoryMonthsFromStorage(), ['2025-11', '2025-12'], 'anonymous history should keep only legacy data')
  await new Promise(resolve => setTimeout(resolve, 0))

  console.info('monthlyHistoryStorage-tests: user-scoped history — OK')
} finally {
  AuthContext._state = originalAuthState
  if (originalWindow === undefined) delete globalThis.window
  else globalThis.window = originalWindow
  if (originalSafeStorage === undefined) delete globalThis.SafeStorage
  else globalThis.SafeStorage = originalSafeStorage
}
