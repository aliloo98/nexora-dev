import assert from 'node:assert/strict'
import fs from 'node:fs'

const html = fs.readFileSync(new URL('../../index.html', import.meta.url), 'utf8')
const mainSource = fs.readFileSync(new URL('../main.js', import.meta.url), 'utf8')

assert.doesNotMatch(
  html,
  /window\.onload\s*=\s*async/,
  'legacy financial initialization must not race authentication through window.onload'
)
assert.match(
  html,
  /window\.initLegacyBudgetUi\s*=\s*\(\)\s*=>/,
  'legacy financial initialization should be explicitly orchestrated'
)
assert.match(
  html,
  /if \(legacyBudgetUiInitPromise\) return legacyBudgetUiInitPromise/,
  'legacy initialization should be idempotent across initial auth and sign-in events'
)

const authInitIndex = mainSource.indexOf('await initAuthRouting()')
const authWaitIndex = mainSource.indexOf('await waitForAuthenticatedState()', authInitIndex)
const notificationInitIndex = mainSource.indexOf('await NotificationsService.init()', authWaitIndex)
const legacyInitIndex = mainSource.indexOf('await initializeLegacyUiForAuthState(authenticatedState)', authWaitIndex)
assert.notEqual(authInitIndex, -1, 'modern startup should initialize authentication')
assert.equal(
  authWaitIndex > authInitIndex,
  true,
  'modern startup should wait for a successful authentication'
)
assert.equal(
  notificationInitIndex > authWaitIndex,
  true,
  'user-scoped services should initialize only after the owner is known'
)
assert.equal(
  legacyInitIndex > authWaitIndex,
  true,
  'financial UI initialization should happen only after successful authentication'
)
assert.match(
  mainSource,
  /if \(!state\?\.isAuthenticated \|\| !state\?\.user\) return null/,
  'logged-out startup should not initialize financial data'
)
assert.match(
  mainSource,
  /const waitForAuthenticatedState = \(\) => \{[\s\S]*AuthContext\.subscribe\(\(state\) => \{[\s\S]*resolve\(state\)/,
  'a later successful sign-in should resume authenticated initialization'
)

console.log('authStartupOrder-tests: authentication precedes financial initialization — OK')
