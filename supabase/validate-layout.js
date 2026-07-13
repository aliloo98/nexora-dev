import assert from 'node:assert/strict'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { resolve } from 'node:path'
import { SYNCED_APP_SETTING_KEYS } from '../src/constants/storageKeys.js'

const root = resolve(import.meta.dirname)
const migrationsDir = resolve(root, 'migrations')
const testsDir = resolve(root, 'tests')
const workflowPath = resolve(root, '..', '.github', 'workflows', 'supabase-ci.yml')

const config = readFileSync(resolve(root, 'config.toml'), 'utf8')
const packageJson = JSON.parse(readFileSync(resolve(root, '..', 'package.json'), 'utf8'))
const workflow = readFileSync(workflowPath, 'utf8')

for (const key of SYNCED_APP_SETTING_KEYS) {
  assert.match(key, /^nexora_[a-z0-9_]+$/, `cloud setting key is not SQL-compatible: ${key}`)
  assert.ok(key.length <= 128, `cloud setting key is too long for SQL: ${key}`)
}

assert.match(config, /^project_id = "nexora-dev"$/m)
assert.match(config, /^site_url = "http:\/\/127\.0\.0\.1:5173"$/m)
assert.match(config, /\[db\.seed\][\s\S]*?enabled = false/)
assert.match(config, /\[db\.migrations\][\s\S]*?enabled = true/)

const localScripts = [
  'supabase:reset',
  'supabase:lint',
  'test:db'
]

for (const scriptName of localScripts) {
  assert.match(packageJson.scripts?.[scriptName] || '', /--local\b/)
  assert.doesNotMatch(packageJson.scripts[scriptName], /--linked\b/)
}

const migrationNames = readdirSync(migrationsDir)
  .filter((name) => statSync(resolve(migrationsDir, name)).isFile())
  .sort()

assert.ok(migrationNames.length > 0, 'at least one migration is required')
assert.equal(new Set(migrationNames).size, migrationNames.length, 'migration names must be unique')

const forbiddenSql = [
  /\bsupabase\s+link\b/i,
  /\bsupabase\s+db\s+push\b/i,
  /\bproject[_ -]?ref\b/i,
  /\bservice[_ -]?role[_ -]?key\b/i,
  /\bali\b/i,
  /\bm[ée]gane\b/i
]

for (const name of migrationNames) {
  assert.match(name, /^\d{14}_[a-z0-9_]+\.sql$/, `invalid migration name: ${name}`)
  const sql = readFileSync(resolve(migrationsDir, name), 'utf8')
  assert.match(sql, /^begin;\s/im, `${name} must start a transaction`)
  assert.match(sql, /commit;\s*$/i, `${name} must commit its transaction`)
  forbiddenSql.forEach((pattern) => assert.doesNotMatch(sql, pattern, `${name} contains forbidden content`))
}

const testNames = readdirSync(testsDir)
  .filter((name) => name.endsWith('.sql'))
  .sort()

assert.ok(testNames.length > 0, 'at least one SQL test is required')

for (const name of testNames) {
  assert.match(name, /^\d{4}_[a-z0-9_]+\.test\.sql$/, `invalid SQL test name: ${name}`)
  const sql = readFileSync(resolve(testsDir, name), 'utf8')
  assert.match(sql, /^begin;\s/im, `${name} must start a transaction`)
  assert.match(sql, /rollback;\s*$/i, `${name} must roll back fixtures`)
  forbiddenSql.forEach((pattern) => assert.doesNotMatch(sql, pattern, `${name} contains forbidden content`))
}

const requiredWorkflowPatterns = [
  /^  pull_request:\s*$/m,
  /^  push:\s*$/m,
  /^      - main\s*$/m,
  /^  workflow_dispatch:\s*$/m,
  /^permissions:\s*\n  contents: read\s*$/m,
  /runs-on: ubuntu-latest/,
  /timeout-minutes: 35/,
  /VITE_SUPABASE_ANON_KEY: ""/,
  /VITE_SUPABASE_URL: ""/,
  /uses: actions\/checkout@v4/,
  /uses: actions\/setup-node@v4/,
  /node-version: "20"/,
  /cache: npm/,
  /run: npm ci/,
  /uses: supabase\/setup-cli@v1/,
  /version: 2\.109\.1/,
  /docker info/,
  /supabase start --output json > "\$start_output"/,
  /supabase db reset --local --no-seed/,
  /supabase db lint --local --level warning --fail-on warning/,
  /supabase test db --local/,
  /run: npm run test:js/,
  /run: npm run test:e2e/,
  /run: npm run build/,
  /if: always\(\)/,
  /supabase stop --project-id nexora-dev --no-backup/
]

for (const pattern of requiredWorkflowPatterns) {
  assert.match(workflow, pattern, `Supabase CI is missing required guard or step: ${pattern}`)
}

const forbiddenWorkflowPatterns = [
  /\bsupabase\s+login\b/i,
  /\bsupabase\s+link\b/i,
  /\bsupabase\s+db\s+push\b/i,
  /--linked\b/i,
  /--db-url\b/i,
  /\bnexora-prod\b/i,
  /\bproject[_-]?ref\b/i,
  /\bSUPABASE_ACCESS_TOKEN\b/,
  /\bSUPABASE_DB_PASSWORD\b/,
  /\bSUPABASE_PROJECT_ID\b/,
  /\bsecrets\s*\./i
]

for (const pattern of forbiddenWorkflowPatterns) {
  assert.doesNotMatch(workflow, pattern, `Supabase CI contains forbidden remote access: ${pattern}`)
}

console.info(`Supabase layout: ${migrationNames.length} migration(s), ${testNames.length} SQL test file(s) — OK`)
