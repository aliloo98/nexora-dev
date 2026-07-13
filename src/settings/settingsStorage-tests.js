import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const storageValues = new Map()
globalThis.localStorage = {
  getItem: (key) => storageValues.get(key) ?? null,
  setItem: (key, value) => storageValues.set(key, String(value)),
  removeItem: (key) => storageValues.delete(key)
}
globalThis.window = globalThis

const { default: AuthContext } = await import('../auth/authContext.js')
const { SettingsService } = await import('./settingsService.js')

const setCurrentUser = (userId) => {
  AuthContext._state.user = userId ? { id: userId } : null
  AuthContext._state.isAuthenticated = Boolean(userId)
}

const anonymousIncomes = [{ id: 'income-local', name: 'Revenu anonyme', amount: 1000, frequency: 'monthly', day: 1 }]
const anonymousBills = [{ id: 'bill-local', name: 'Facture anonyme', amount: 100, day: 5, priority: 'standard' }]
const serializedAnonymousIncomes = JSON.stringify(anonymousIncomes)
const serializedAnonymousBills = JSON.stringify(anonymousBills)
storageValues.set(SettingsService.RECURRING_INCOMES_KEY, serializedAnonymousIncomes)
storageValues.set(SettingsService.BILL_SCHEDULES_KEY, serializedAnonymousBills)

setCurrentUser('user-a')
assert.deepEqual(await SettingsService.loadRecurringIncomes(), [], 'user A must not inherit anonymous recurring incomes')
assert.deepEqual(await SettingsService.loadBillSchedules(), [], 'user A must not inherit anonymous bill schedules')
await SettingsService.saveRecurringIncomes([{ id: 'income-a', name: 'Revenu A', amount: 2000, frequency: 'monthly', day: 2 }])
await SettingsService.saveBillSchedules([{ id: 'bill-a', name: 'Facture A', amount: 200, day: 6, priority: 'importante' }])

assert.equal(
  JSON.parse(storageValues.get(`${SettingsService.RECURRING_INCOMES_KEY}::user:user-a`))[0].name,
  'Revenu A',
  'user A recurring incomes must be stored in the user A namespace'
)
assert.equal(
  JSON.parse(storageValues.get(`${SettingsService.BILL_SCHEDULES_KEY}::user:user-a`))[0].name,
  'Facture A',
  'user A bill schedules must be stored in the user A namespace'
)

setCurrentUser('user-b')
assert.deepEqual(await SettingsService.loadRecurringIncomes(), [], 'user B must not read user A recurring incomes')
assert.deepEqual(await SettingsService.loadBillSchedules(), [], 'user B must not read user A bill schedules')
await SettingsService.saveRecurringIncomes([{ id: 'income-b', name: 'Revenu B', amount: 3000, frequency: 'monthly', day: 3 }])
await SettingsService.saveBillSchedules([{ id: 'bill-b', name: 'Facture B', amount: 300, day: 7, priority: 'critique' }])

setCurrentUser('user-a')
assert.equal((await SettingsService.loadRecurringIncomes())[0].name, 'Revenu A', 'user A recurring incomes must remain isolated after switching users')
assert.equal((await SettingsService.loadBillSchedules())[0].name, 'Facture A', 'user A bill schedules must remain isolated after switching users')

setCurrentUser(null)
assert.equal((await SettingsService.loadRecurringIncomes())[0].name, 'Revenu anonyme', 'anonymous mode should keep access to anonymous recurring incomes')
assert.equal((await SettingsService.loadBillSchedules())[0].name, 'Facture anonyme', 'anonymous mode should keep access to anonymous bill schedules')
assert.equal(storageValues.get(SettingsService.RECURRING_INCOMES_KEY), serializedAnonymousIncomes, 'authenticated writes must preserve anonymous recurring incomes')
assert.equal(storageValues.get(SettingsService.BILL_SCHEDULES_KEY), serializedAnonymousBills, 'authenticated writes must preserve anonymous bill schedules')

const indexHtml = readFileSync(new URL('../../index.html', import.meta.url), 'utf8')
assert.match(
  indexHtml,
  /function readLocalJsonArray\(key\)[\s\S]*?const storageKey = syncedSettingStorageKey\(key\)/,
  'budget model fallback reads must use the current owner namespace'
)
assert.match(
  indexHtml,
  /const storageKey = syncedSettingStorageKey\('nexora_recurring_incomes'\);[\s\S]*?const raw = SafeStorage\.getItem\(storageKey\)/,
  'week plan recurring income reads must use the current owner namespace'
)

console.info('settingsStorage-tests: user-scoped recurring incomes and bill schedules — OK')
