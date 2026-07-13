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
const {
  AI_SETTINGS_KEY,
  FINANCIAL_MEMORY_KEY,
  readAiSettings,
  readFinancialMemory,
  updateAiSettings,
  updateFinancialMemory
} = await import('./proactiveCoachService.js')

const setCurrentUser = (userId) => {
  AuthContext._state.user = userId ? { id: userId } : null
  AuthContext._state.isAuthenticated = Boolean(userId)
}
const flushSettingWrite = () => new Promise(resolve => setTimeout(resolve, 0))

const anonymousSettings = {
  cautionLevel: 'aggressive',
  coachPriority: 'savings',
  communicationStyle: 'direct',
  recommendationFrequency: 'weekly',
  thresholds: { minBalance: 50, chargesRate: 90, variableRate: 60, goalDelayDays: 2 }
}
const anonymousMemory = {
  lastPrimaryGoal: 'Objectif anonyme',
  lastImportantAlerts: ['Alerte anonyme'],
  lastRecommendation: 'Conseil anonyme',
  recentProgress: '',
  preferences: {},
  lastAdviceDate: '2026-07-01'
}
const serializedAnonymousSettings = JSON.stringify(anonymousSettings)
const serializedAnonymousMemory = JSON.stringify(anonymousMemory)
storageValues.set(AI_SETTINGS_KEY, serializedAnonymousSettings)
storageValues.set(FINANCIAL_MEMORY_KEY, serializedAnonymousMemory)

setCurrentUser('user-a')
assert.equal(readAiSettings().cautionLevel, 'balanced', 'user A must not inherit anonymous AI settings')
assert.equal(readFinancialMemory().lastRecommendation, '', 'user A must not inherit anonymous financial memory')
updateAiSettings({ cautionLevel: 'very_cautious' })
updateFinancialMemory({ lastRecommendation: 'Conseil A', lastPrimaryGoal: 'Objectif A' })
await flushSettingWrite()

assert.equal(
  JSON.parse(storageValues.get(`${AI_SETTINGS_KEY}::user:user-a`)).cautionLevel,
  'very_cautious',
  'user A settings must be written only to the user A namespace'
)
assert.equal(
  JSON.parse(storageValues.get(`${FINANCIAL_MEMORY_KEY}::user:user-a`)).lastRecommendation,
  'Conseil A',
  'user A memory must be written only to the user A namespace'
)

setCurrentUser('user-b')
assert.equal(readAiSettings().cautionLevel, 'balanced', 'user B must not read user A settings')
assert.equal(readFinancialMemory().lastRecommendation, '', 'user B must not read user A memory')
updateAiSettings({ cautionLevel: 'cautious' })
updateFinancialMemory({ lastRecommendation: 'Conseil B', lastPrimaryGoal: 'Objectif B' })
await flushSettingWrite()

assert.equal(readAiSettings().cautionLevel, 'cautious', 'user B should read their own settings')
assert.equal(readFinancialMemory().lastRecommendation, 'Conseil B', 'user B should read their own memory')

setCurrentUser('user-a')
assert.equal(readAiSettings().cautionLevel, 'very_cautious', 'user A settings must remain isolated after switching users')
assert.equal(readFinancialMemory().lastRecommendation, 'Conseil A', 'user A memory must remain isolated after switching users')

setCurrentUser(null)
assert.equal(readAiSettings().cautionLevel, 'aggressive', 'anonymous mode should keep access to anonymous AI settings')
assert.equal(readFinancialMemory().lastRecommendation, 'Conseil anonyme', 'anonymous mode should keep access to anonymous memory')
assert.equal(storageValues.get(AI_SETTINGS_KEY), serializedAnonymousSettings, 'authenticated writes must preserve legacy anonymous settings')
assert.equal(storageValues.get(FINANCIAL_MEMORY_KEY), serializedAnonymousMemory, 'authenticated writes must preserve legacy anonymous memory')

const indexHtml = readFileSync(new URL('../../index.html', import.meta.url), 'utf8')
assert.match(
  indexHtml,
  /SafeStorage\.getItem\(syncedSettingStorageKey\('nexora_ai_settings_v1'\)\)/,
  'the legacy UI read fallback must use the current owner namespace'
)
assert.match(
  indexHtml,
  /SafeStorage\.setItem\(syncedSettingStorageKey\('nexora_ai_settings_v1'\)/,
  'the legacy UI write fallback must use the current owner namespace'
)

console.info('proactiveCoachStorage-tests: user-scoped AI settings and financial memory — OK')
