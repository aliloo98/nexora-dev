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

assert.match(
  extractFunction(html, 'exportData'),
  /if \(!k \|\| isSensitiveExportStorageKey\(k\)\) continue;/,
  'JSON export must apply the sensitive-key guard before reading storage values'
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

console.log('exportSecurity-tests: OK')
