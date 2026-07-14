import assert from 'node:assert/strict'

const values = new Map()
const storage = {
  getItem: (key) => values.get(key) ?? null,
  setItem: (key, value) => values.set(key, String(value)),
  removeItem: (key) => values.delete(key),
  clear: () => values.clear()
}

const cloud = {
  row: null,
  pushed: []
}

const createQuery = () => ({
  select() { return this },
  eq() { return this },
  maybeSingle: async () => ({ data: cloud.row, error: null }),
  upsert: async (payload) => {
    cloud.pushed.push(payload)
    return { error: null }
  }
})

globalThis.localStorage = storage
globalThis.SafeStorage = storage
globalThis.window = {
  localStorage: storage,
  SafeStorage: storage,
  supabase: {
    auth: {
      getSession: async () => ({ data: { session: { user: { id: 'owner-a' } } }, error: null })
    },
    from: () => createQuery()
  }
}

const { default: AuthContext } = await import('../src/auth/authContext.js')
const { STORAGE_KEYS } = await import('../src/constants/storageKeys.js')
const { UserAppSettingsService } = await import('./userAppSettingsService.js')

AuthContext._state = {
  ...AuthContext._state,
  user: { id: 'owner-a' },
  isAuthenticated: true
}

const ownerKey = (key) => `${key}::user:owner-a`
const ownerMetaKey = (key) => `${key}::meta::user:owner-a`
const setLocalVersion = (key, value, updatedAt) => {
  values.set(ownerKey(key), JSON.stringify(value))
  if (updatedAt) values.set(ownerMetaKey(key), JSON.stringify({ updated_at: updatedAt }))
}
const resetCase = () => {
  storage.clear()
  cloud.row = null
  cloud.pushed = []
}

resetCase()
setLocalVersion(STORAGE_KEYS.recurringIncomes, [{ id: 'stale-income', name: 'Ancien revenu' }], '2026-07-01T10:00:00.000Z')
cloud.row = {
  key: STORAGE_KEYS.recurringIncomes,
  data: [],
  updated_at: '2026-07-02T10:00:00.000Z'
}
let result = await UserAppSettingsService.syncCloudSettingToLocal(STORAGE_KEYS.recurringIncomes)
assert.equal(result.action, 'cloud-to-local-empty-conflict', 'a newer cloud deletion must win over stale local items')
assert.deepEqual(JSON.parse(values.get(ownerKey(STORAGE_KEYS.recurringIncomes))), [], 'the newer cloud deletion must clear stale local items')
assert.equal(cloud.pushed.length, 0, 'stale local items must not be pushed back after a cloud deletion')

resetCase()
setLocalVersion(STORAGE_KEYS.billSchedules, [], '2026-07-03T10:00:00.000Z')
cloud.row = {
  key: STORAGE_KEYS.billSchedules,
  data: [{ id: 'stale-bill', name: 'Ancienne facture' }],
  updated_at: '2026-07-02T10:00:00.000Z'
}
result = await UserAppSettingsService.syncCloudSettingToLocal(STORAGE_KEYS.billSchedules)
assert.equal(result.action, 'local-to-cloud-empty-conflict', 'a newer local deletion must win over stale cloud items')
assert.deepEqual(cloud.pushed[0].data, [], 'the explicit local deletion must be synchronized to the cloud')
assert.deepEqual(JSON.parse(values.get(ownerKey(STORAGE_KEYS.billSchedules))), [], 'the local deletion must remain intact')

resetCase()
setLocalVersion(STORAGE_KEYS.goals, [], '2026-07-04T10:00:00.000Z')
cloud.row = {
  key: STORAGE_KEYS.goals,
  data: [{ id: 'stale-goal', name: 'Ancien objectif' }],
  updated_at: '2026-07-03T10:00:00.000Z'
}
result = await UserAppSettingsService.syncCloudSettingToLocal(STORAGE_KEYS.goals)
assert.equal(result.action, 'local-to-cloud-empty-conflict', 'goal deletion must follow the same timestamp rule as other arrays')
assert.deepEqual(cloud.pushed[0].data, [], 'deleted goals must not be restored by the former special-case hydration')

resetCase()
setLocalVersion(STORAGE_KEYS.debts, [{ id: 'current-debt', name: 'Dette actuelle' }], '2026-07-05T10:00:00.000Z')
cloud.row = {
  key: STORAGE_KEYS.debts,
  data: [],
  updated_at: '2026-07-04T10:00:00.000Z'
}
result = await UserAppSettingsService.syncCloudSettingToLocal(STORAGE_KEYS.debts)
assert.equal(result.action, 'local-to-cloud-empty-conflict', 'newer local items must still be protected from an older empty cloud state')
assert.equal(cloud.pushed[0].data[0].id, 'current-debt', 'newer local items should be pushed without data loss')

resetCase()
cloud.row = {
  key: STORAGE_KEYS.goals,
  data: [{ id: 'cloud-goal', name: 'Objectif cloud' }],
  updated_at: '2026-07-06T10:00:00.000Z'
}
result = await UserAppSettingsService.syncCloudSettingToLocal(STORAGE_KEYS.goals)
assert.equal(result.action, 'cloud-to-local', 'a device with no local version must still hydrate from cloud')
assert.equal(JSON.parse(values.get(ownerKey(STORAGE_KEYS.goals)))[0].id, 'cloud-goal', 'initial hydration must preserve cloud data')

resetCase()
setLocalVersion(STORAGE_KEYS.debts, [{ id: 'kept-debt', name: 'Dette conservée' }], '2026-07-08T10:00:00.000Z')
cloud.row = {
  key: STORAGE_KEYS.debts,
  data: [
    { id: 'kept-debt', name: 'Dette conservée' },
    { id: 'deleted-debt', name: 'Dette supprimée' }
  ],
  updated_at: '2026-07-07T10:00:00.000Z'
}
result = await UserAppSettingsService.syncCloudSettingToLocal(STORAGE_KEYS.debts)
assert.equal(result.action, 'local-to-cloud-subset-deletion', 'a newer local strict subset must represent a partial deletion')
assert.deepEqual(cloud.pushed[0].data.map(item => item.id), ['kept-debt'], 'the removed local item must not be merged back from stale cloud data')

resetCase()
setLocalVersion(STORAGE_KEYS.goals, [
  { id: 'kept-goal', name: 'Objectif conservé' },
  { id: 'deleted-goal', name: 'Objectif supprimé' }
], '2026-07-09T10:00:00.000Z')
cloud.row = {
  key: STORAGE_KEYS.goals,
  data: [{ id: 'kept-goal', name: 'Objectif conservé' }],
  updated_at: '2026-07-10T10:00:00.000Z'
}
result = await UserAppSettingsService.syncCloudSettingToLocal(STORAGE_KEYS.goals)
assert.equal(result.action, 'cloud-to-local-subset-deletion', 'a newer cloud strict subset must represent a partial deletion')
assert.deepEqual(
  JSON.parse(values.get(ownerKey(STORAGE_KEYS.goals))).map(item => item.id),
  ['kept-goal'],
  'the removed cloud item must be deleted locally instead of resurrected'
)

resetCase()
setLocalVersion(STORAGE_KEYS.debts, [{ id: 'local-debt', name: 'Dette locale' }], '2026-07-11T10:00:00.000Z')
cloud.row = {
  key: STORAGE_KEYS.debts,
  data: [{ id: 'cloud-debt', name: 'Dette cloud' }],
  updated_at: '2026-07-10T10:00:00.000Z'
}
result = await UserAppSettingsService.syncCloudSettingToLocal(STORAGE_KEYS.debts)
assert.equal(result.action, 'merged-array', 'independent concurrent additions must still be merged')
assert.deepEqual(
  new Set(JSON.parse(values.get(ownerKey(STORAGE_KEYS.debts))).map(item => item.id)),
  new Set(['local-debt', 'cloud-debt']),
  'the subset deletion rule must not discard independent additions'
)

console.info('userAppSettingsDeletionSync-tests: newer explicit deletions cannot be resurrected — OK')
