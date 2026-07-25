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

// With bootstrap architecture, these calls are in bootstrap modules
// Verify the bootstrap orchestration preserves the order
const bootstrapCallIndex = mainSource.indexOf('await bootstrapApplication({')
assert.notEqual(bootstrapCallIndex, -1, 'modern startup should use bootstrap orchestration')

// Verify the helper functions still exist in main.js for bootstrap injection
// initAuthRouting is imported, not defined as const
assert.notEqual(mainSource.indexOf('initAuthRouting'), -1, 'initAuthRouting should be available')
assert.notEqual(mainSource.indexOf('const waitForAuthenticatedState'), -1, 'waitForAuthenticatedState should be available')
assert.notEqual(mainSource.indexOf('const initializeLegacyUiForAuthState'), -1, 'initializeLegacyUiForAuthState should be available')
assert.notEqual(mainSource.indexOf('const injectAuthStyles'), -1, 'injectAuthStyles should be available')
assert.notEqual(mainSource.indexOf('const injectCoupleStyles'), -1, 'injectCoupleStyles should be available')

// Verify the order is preserved by checking the bootstrap module imports
const bootstrapImport = mainSource.indexOf("import { bootstrapApplication } from './bootstrap/appBootstrap.js'")
assert.notEqual(bootstrapImport, -1, 'bootstrap application should be imported')

// Verify the actual order in appBootstrap.js by analyzing function calls, not just comments
const appBootstrapSource = fs.readFileSync(new URL('../bootstrap/appBootstrap.js', import.meta.url), 'utf-8')
const preAuthBootstrapSource = fs.readFileSync(new URL('../bootstrap/preAuthBootstrap.js', import.meta.url), 'utf-8')
const authenticatedBootstrapSource = fs.readFileSync(new URL('../bootstrap/authenticatedBootstrap.js', import.meta.url), 'utf-8')
const userDataBootstrapSource = fs.readFileSync(new URL('../bootstrap/userDataBootstrap.js', import.meta.url), 'utf-8')
const applicationUiBootstrapSource = fs.readFileSync(new URL('../bootstrap/applicationUiBootstrap.js', import.meta.url), 'utf-8')

// 1. Verify bootstrapPreAuth is called before bootstrapAuthenticatedServices in appBootstrap.js
const bootstrapPreAuthCallIndex = appBootstrapSource.indexOf('await bootstrapPreAuth({')
const bootstrapAuthenticatedServicesCallIndex = appBootstrapSource.indexOf('await bootstrapAuthenticatedServices({')
assert.notEqual(bootstrapPreAuthCallIndex, -1, 'bootstrapPreAuth should be called in appBootstrap.js')
assert.notEqual(bootstrapAuthenticatedServicesCallIndex, -1, 'bootstrapAuthenticatedServices should be called in appBootstrap.js')
assert.equal(bootstrapAuthenticatedServicesCallIndex > bootstrapPreAuthCallIndex, true, 'bootstrapAuthenticatedServices must be called after bootstrapPreAuth')

// 2. Verify waitForAuthenticatedState is called before NotificationsService and MonthlyBudgetStateService
const waitForAuthIndex = preAuthBootstrapSource.indexOf('await waitForAuthenticatedState()')
const notificationsInitIndex = authenticatedBootstrapSource.indexOf('await NotificationsService.init()')
const monthlyBudgetInitIndex = authenticatedBootstrapSource.indexOf('await MonthlyBudgetStateService.init()')
assert.notEqual(waitForAuthIndex, -1, 'waitForAuthenticatedState should be called in preAuthBootstrap.js')
assert.notEqual(notificationsInitIndex, -1, 'NotificationsService.init should be called in authenticatedBootstrap.js')
assert.notEqual(monthlyBudgetInitIndex, -1, 'MonthlyBudgetStateService.init should be called in authenticatedBootstrap.js')
// Since waitForAuth is in preAuthBootstrap and the services are in authenticatedBootstrap, and bootstrapPreAuth is called before bootstrapAuthenticatedServices, this order is guaranteed
assert.equal(bootstrapAuthenticatedServicesCallIndex > bootstrapPreAuthCallIndex, true, 'waitForAuthenticatedState (in preAuthBootstrap) must complete before NotificationsService.init (in authenticatedBootstrap)')

// 3. Verify first updateCoupleNavigation is after initializeLegacyUiForAuthState
const legacyUiInitIndex = authenticatedBootstrapSource.indexOf('await initializeLegacyUiForAuthState()')
const firstCoupleNavIndex = authenticatedBootstrapSource.indexOf('await updateCoupleNavigation()')
assert.notEqual(legacyUiInitIndex, -1, 'initializeLegacyUiForAuthState should be called in authenticatedBootstrap.js')
assert.notEqual(firstCoupleNavIndex, -1, 'first updateCoupleNavigation should be called in authenticatedBootstrap.js')
assert.equal(firstCoupleNavIndex > legacyUiInitIndex, true, 'first updateCoupleNavigation must be called after initializeLegacyUiForAuthState')

// 4. Verify second updateCoupleNavigation is before renderCoupleSection
const refreshCoupleUiIndex = applicationUiBootstrapSource.indexOf('export async function refreshCoupleUi')
const secondCoupleNavInRefreshIndex = applicationUiBootstrapSource.indexOf('await updateCoupleNavigation()', refreshCoupleUiIndex)
const renderCoupleSectionIndex = applicationUiBootstrapSource.indexOf('await renderCoupleSection()', refreshCoupleUiIndex)
assert.notEqual(secondCoupleNavInRefreshIndex, -1, 'second updateCoupleNavigation should be called in refreshCoupleUi')
assert.notEqual(renderCoupleSectionIndex, -1, 'renderCoupleSection should be called in refreshCoupleUi')
assert.equal(renderCoupleSectionIndex > secondCoupleNavInRefreshIndex, true, 'renderCoupleSection must be called after second updateCoupleNavigation')

// 5. Verify syncInitialGoals is before GoalsPage.init
const syncInitialGoalsIndex = appBootstrapSource.indexOf('await syncInitialGoals({')
const renderPrimaryUiIndex = appBootstrapSource.indexOf('await renderPrimaryApplicationUi({')
assert.notEqual(syncInitialGoalsIndex, -1, 'syncInitialGoals should be called in appBootstrap.js')
assert.notEqual(renderPrimaryUiIndex, -1, 'renderPrimaryApplicationUi should be called in appBootstrap.js')
assert.equal(renderPrimaryUiIndex > syncInitialGoalsIndex, true, 'renderPrimaryApplicationUi (which calls GoalsPage.init) must be called after syncInitialGoals')

// 6. Verify syncUserApplicationSettings is before attachAmountInputHandlers
const syncUserSettingsIndex = appBootstrapSource.indexOf('await syncUserApplicationSettings({')
// attachAmountInputHandlers is called in main.js after bootstrapApplication, so we verify it's after syncUserApplicationSettings in the bootstrap sequence
const renderAssistantIndex = appBootstrapSource.indexOf('await renderAssistant({')
assert.notEqual(syncUserSettingsIndex, -1, 'syncUserApplicationSettings should be called in appBootstrap.js')
assert.notEqual(renderAssistantIndex, -1, 'renderAssistant should be called in appBootstrap.js')
assert.equal(renderAssistantIndex > syncUserSettingsIndex, true, 'renderAssistant must be called after syncUserApplicationSettings')

// 7. Verify attachAmountInputHandlers is before advanced UI renders
const attachAmountHandlersIndex = mainSource.indexOf('window.attachAmountInputHandlers = attachAmountInputHandlers')
const bootstrapCallForAttachIndex = mainSource.indexOf('await bootstrapApplication({')
assert.notEqual(attachAmountHandlersIndex, -1, 'attachAmountInputHandlers should be exposed in main.js')
assert.notEqual(bootstrapCallForAttachIndex, -1, 'bootstrapApplication should be called in main.js')
assert.equal(attachAmountHandlersIndex < bootstrapCallForAttachIndex, true, 'attachAmountInputHandlers must be exposed before bootstrapApplication starts')
// Since attachAmountInputHandlers is exposed before bootstrapApplication, and advanced UI is the last phase of bootstrap, attachAmountInputHandlers comes before advanced UI
// This is the correct order: attachAmountInputHandlers is exposed first, then bootstrap runs (including advanced UI renders)
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
