import assert from 'node:assert/strict'

const values = new Map()
const storage = {
  getItem: key => values.get(key) ?? null,
  setItem: (key, value) => values.set(key, String(value)),
  removeItem: key => values.delete(key),
  clear: () => values.clear()
}

const remote = {
  userId: 'owner-a',
  row: null,
  upsertError: null,
  pushed: []
}
const onlineListeners = []

const createQuery = () => ({
  select() { return this },
  eq() { return this },
  maybeSingle: async () => ({ data: remote.row, error: null }),
  upsert: async (payload) => {
    remote.pushed.push(payload)
    return { error: remote.upsertError }
  }
})

globalThis.localStorage = storage
globalThis.SafeStorage = storage
globalThis.navigator = { onLine: true }
globalThis.window = {
  localStorage: storage,
  SafeStorage: storage,
  addEventListener: (event, listener) => {
    if (event === 'online') onlineListeners.push(listener)
  },
  supabase: {
    auth: {
      getSession: async () => ({
        data: { session: remote.userId ? { user: { id: remote.userId } } : null },
        error: null
      })
    },
    from: () => createQuery()
  }
}

const { default: AuthContext } = await import('../src/auth/authContext.js')
const { STORAGE_KEYS } = await import('../src/constants/storageKeys.js')
const { UserAppSettingsService } = await import('./userAppSettingsService.js')

const setOwner = (userId) => {
  remote.userId = userId
  AuthContext._state = {
    ...AuthContext._state,
    user: userId ? { id: userId } : null,
    isAuthenticated: Boolean(userId)
  }
}

const queueKey = ownerId => ownerId
  ? `nexora_user_app_settings_pending_v1::user:${ownerId}`
  : 'nexora_user_app_settings_pending_v1'

storage.clear()
setOwner('owner-a')
remote.upsertError = { message: 'network unavailable' }
await UserAppSettingsService.saveSetting(STORAGE_KEYS.debts, [{ id: 'offline-debt', name: 'Dette hors ligne' }])
assert.deepEqual(
  await UserAppSettingsService.getPendingSettingKeys(),
  [STORAGE_KEYS.debts],
  'saving locally must queue the setting before a cloud attempt'
)

let result = await UserAppSettingsService.syncLocalSettingToCloud(STORAGE_KEYS.debts)
assert.equal(result.ok, false, 'a failed cloud write must remain visible to the service')
assert.deepEqual(
  JSON.parse(storage.getItem(queueKey('owner-a'))),
  [STORAGE_KEYS.debts],
  'a failed cloud write must keep its durable pending key'
)

remote.upsertError = null
result = await UserAppSettingsService.replayPendingSettings()
assert.equal(result.ok, true, 'pending settings must replay after connectivity returns')
assert.deepEqual(result.pending, [], 'a successful replay must empty the pending queue')
assert.equal(remote.pushed.at(-1).user_id, 'owner-a', 'replay must write only for the authenticated owner')

storage.clear()
setOwner('owner-a')
await UserAppSettingsService.saveSetting(STORAGE_KEYS.goals, [{ id: 'goal-a' }])
setOwner('owner-b')
await UserAppSettingsService.saveSetting(STORAGE_KEYS.debts, [{ id: 'debt-b' }])
assert.deepEqual(await UserAppSettingsService.getPendingSettingKeys(), [STORAGE_KEYS.debts], 'owner B must see only owner B pending writes')
setOwner('owner-a')
assert.deepEqual(await UserAppSettingsService.getPendingSettingKeys(), [STORAGE_KEYS.goals], 'owner A pending writes must remain isolated')

storage.clear()
remote.pushed = []
setOwner(null)
await UserAppSettingsService.saveSetting(STORAGE_KEYS.aiSettings, { enabled: false })
result = await UserAppSettingsService.replayPendingSettings()
assert.equal(result.ok, false, 'pending writes must not be sent without an authenticated session')
assert.equal(result.results[STORAGE_KEYS.aiSettings].reason, 'no-user', 'anonymous replay must stop before any cloud write')
assert.deepEqual(result.pending, [STORAGE_KEYS.aiSettings], 'anonymous pending data must remain available for a later safe decision')
assert.equal(remote.pushed.length, 0, 'no cloud write may occur without a user')

await UserAppSettingsService.init()
await UserAppSettingsService.init()
assert.equal(onlineListeners.length, 1, 'the reconnect replay listener must be attached only once')

console.info('userAppSettingsQueue-tests: failed writes remain durable, isolated, and replayable — OK')
