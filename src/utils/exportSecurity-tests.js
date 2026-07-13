import assert from 'node:assert/strict'
import fs from 'node:fs'

const htmlPath = new URL('../../index.html', import.meta.url)
const html = fs.readFileSync(htmlPath, 'utf8')

function extractFunction(source, name) {
  const start = source.indexOf(`function ${name}(`)
  if (start === -1) throw new Error(`Function ${name} not found`)
  let index = source.indexOf('{', start)
  if (index === -1) throw new Error(`Function ${name} opening brace not found`)
  let depth = 1
  index += 1
  while (index < source.length && depth > 0) {
    const char = source[index]
    if (char === '{') depth += 1
    else if (char === '}') depth -= 1
    index += 1
  }
  if (depth !== 0) throw new Error(`Function ${name} closing brace not found`)
  return source.slice(start, index)
}

const isSensitiveExportStorageKey = eval(`(${extractFunction(html, 'isSensitiveExportStorageKey')})`)
const getCurrentExportUserId = eval(`(${extractFunction(html, 'getCurrentExportUserId')})`)
const isStorageKeyOwnedByAnotherUser = eval(`(${extractFunction(html, 'isStorageKeyOwnedByAnotherUser')})`)
const getPortableExportStorageKey = eval(`(${extractFunction(html, 'getPortableExportStorageKey')})`)
const isBudgetMonthStorageKey = eval(`(${extractFunction(html, 'isBudgetMonthStorageKey')})`)
const isUnscopedAuthenticatedExportKey = eval(`(${extractFunction(html, 'isUnscopedAuthenticatedExportKey')})`)
const getExportStorageLookupKey = eval(`(${extractFunction(html, 'getExportStorageLookupKey')})`)
const sanitizeBudgetCategoriesForExport = eval(`(${extractFunction(html, 'sanitizeBudgetCategoriesForExport')})`)

assert.match(
  extractFunction(html, 'exportData'),
  /isSensitiveExportStorageKey\(k\) \|\| isStorageKeyOwnedByAnotherUser\(k, currentUserId\)/,
  'JSON export must apply security and ownership guards before reading storage values'
)
assert.match(extractFunction(html, 'exportData'), /version: 1/, 'JSON export should identify backup format version 1')
assert.match(extractFunction(html, 'exportData'), /exportPriorities/, 'JSON export should prioritize namespaced data over legacy mirrors')
assert.match(
  extractFunction(html, 'exportData'),
  /isUnscopedAuthenticatedExportKey\(k, currentUserId\)/,
  'authenticated exports must skip unscoped user-data mirrors'
)
assert.match(
  extractFunction(html, 'exportData'),
  /getExportStorageLookupKey\(key, currentUserId\)/,
  'IndexedDB exports must read the authenticated namespace'
)

assert.equal(isSensitiveExportStorageKey('nexora_auth_user'), true, 'stored auth user must never be exported')
assert.equal(isSensitiveExportStorageKey('nexora_auth_session'), true, 'stored auth session must never be exported')
assert.equal(isSensitiveExportStorageKey('sb-project-ref-auth-token'), true, 'native Supabase auth token must never be exported')
assert.equal(isSensitiveExportStorageKey('sb-project-ref-auth-token-code-verifier'), true, 'Supabase verifier must never be exported')
assert.equal(isSensitiveExportStorageKey('nexora_sync_debug_v1'), true, 'sync debug state must not be exported')
assert.equal(isSensitiveExportStorageKey('nexora_sync_log_v1'), true, 'sync logs must not be exported')
assert.equal(isSensitiveExportStorageKey('nexora_sync_conflicts_v1'), true, 'sync conflict logs must not be exported')
assert.equal(isSensitiveExportStorageKey('nexora_last_sync_v1'), true, 'last sync marker must not be exported')

assert.equal(isSensitiveExportStorageKey('budget_2026-07'), false, 'legacy budget data should remain exportable')
assert.equal(isSensitiveExportStorageKey('budget_user-a_2026-07'), false, 'namespaced budget data should remain exportable')
assert.equal(isSensitiveExportStorageKey('nexora_goals_v1::user:user-a'), false, 'namespaced business data should remain exportable')
assert.equal(isSensitiveExportStorageKey('budget_app_theme'), false, 'non-sensitive preferences should remain exportable')
assert.equal(isSensitiveExportStorageKey(null), false, 'missing keys should be ignored without being classified as sensitive')

globalThis.window = {
  AuthContext: {
    getCurrentUser: () => ({ id: 'user.a@example.com' })
  }
}

assert.equal(getCurrentExportUserId(), 'user_a_example_com', 'current user id should use the storage namespace normalization')
assert.equal(isStorageKeyOwnedByAnotherUser('nexora_goals_v1::user:user-a', 'user-a'), false, 'current user settings should remain exportable')
assert.equal(isStorageKeyOwnedByAnotherUser('nexora_goals_v1::user:user-b', 'user-a'), true, 'another user settings must not be exported')
assert.equal(isStorageKeyOwnedByAnotherUser('budget_user-a_2026-07', 'user-a'), false, 'current user monthly snapshot should remain exportable')
assert.equal(isStorageKeyOwnedByAnotherUser('budget_user-b_2026-07', 'user-a'), true, 'another user monthly snapshot must not be exported')
assert.equal(isStorageKeyOwnedByAnotherUser('budget_user-a_other_2026-07', 'user-a'), true, 'similar owner prefixes must remain isolated')
assert.equal(isStorageKeyOwnedByAnotherUser('budget_2026-07', 'user-a'), false, 'legacy monthly data should remain unchanged in this task')
assert.equal(isStorageKeyOwnedByAnotherUser('budget_app_theme', 'user-a'), false, 'global preferences should remain exportable')
assert.equal(isStorageKeyOwnedByAnotherUser('nexora_goals_v1::user:user-a', null), true, 'anonymous export must not include authenticated settings')
assert.equal(isStorageKeyOwnedByAnotherUser('budget_user-a_2026-07', null), true, 'anonymous export must not include authenticated snapshots')

assert.equal(getPortableExportStorageKey('nexora_goals_v1::user:user-a', 'user-a'), 'nexora_goals_v1', 'current user settings should use the importable base key')
assert.equal(getPortableExportStorageKey('nexora_goals_v1::user:user-b', 'user-a'), null, 'another user settings should have no portable export key')
assert.equal(getPortableExportStorageKey('budget_user-a_2026-07', 'user-a'), 'budget_2026-07', 'current user snapshot should use the importable month key')
assert.equal(isBudgetMonthStorageKey(getPortableExportStorageKey('budget_user-a_2026-07', 'user-a')), true, 'normalized snapshots should be recognized by the existing importer')
assert.equal(getPortableExportStorageKey('budget_user-a_other_2026-07', 'user-a'), null, 'similar snapshot owner prefixes should not normalize')
assert.equal(getPortableExportStorageKey('budget_2026-07', 'user-a'), 'budget_2026-07', 'legacy month keys should remain backward compatible')
assert.equal(getPortableExportStorageKey('budget_app_theme', 'user-a'), 'budget_app_theme', 'global preferences should retain their key')

assert.equal(isUnscopedAuthenticatedExportKey('nexora_goals_v1', 'user-a'), true, 'authenticated goals mirror is user-scoped')
assert.equal(isUnscopedAuthenticatedExportKey('budget_2026-07', 'user-a'), true, 'authenticated legacy month is user-scoped')
assert.equal(isUnscopedAuthenticatedExportKey('budget_app_theme', 'user-a'), false, 'theme remains a global preference')
assert.equal(isUnscopedAuthenticatedExportKey('nexora_goals_v1', null), false, 'anonymous exports keep legacy mirrors')
assert.equal(isUnscopedAuthenticatedExportKey('nexora_goals_v1::user:user-a', 'user-a'), false, 'namespaced settings are not legacy mirrors')

assert.equal(getExportStorageLookupKey('nexora_goals_v1', 'user-a'), 'nexora_goals_v1::user:user-a', 'authenticated IndexedDB lookup uses the owner namespace')
assert.equal(getExportStorageLookupKey('nexora_budget_categories_v1', 'user-a'), 'nexora_budget_categories_v1', 'category store keeps its multi-owner storage key before filtering')
assert.equal(getExportStorageLookupKey('budget_app_theme', 'user-a'), 'budget_app_theme', 'global preferences keep their storage key')
assert.equal(getExportStorageLookupKey('nexora_goals_v1', null), 'nexora_goals_v1', 'anonymous lookup keeps the legacy key')

const sanitizedCategories = sanitizeBudgetCategoriesForExport({
  'user-a': [{ id: 'category-a' }],
  'user-b': [{ id: 'category-b' }],
  local: [{ id: 'anonymous-category' }]
}, 'user-a')
assert.deepEqual(sanitizedCategories, {
  'user-a': [{ id: 'category-a' }]
}, 'authenticated category export contains only the current owner')
assert.equal(JSON.stringify(sanitizedCategories).includes('category-b'), false, 'another owner categories must not be exported')
assert.equal(JSON.stringify(sanitizedCategories).includes('anonymous-category'), false, 'anonymous categories must not leak into authenticated exports')

console.log('exportSecurity-tests: OK')
