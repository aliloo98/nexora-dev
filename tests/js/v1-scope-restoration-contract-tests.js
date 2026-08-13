/**
 * LOT J3 — V1 SCOPE RESTORATION CONTRACT UNIT TESTS
 *
 * Directly tests that V1_SCOPE flag controls Couple restoration behavior
 * by exercising actual product code branches where possible.
 */

import assert from 'node:assert/strict'
import { V1_SCOPE } from '../../src/constants/v1Scope.js'
import { refreshCoupleUi } from '../../src/bootstrap/applicationUiBootstrap.js'
import fs from 'node:fs'

console.log('🧪 Running V1 Scope Restoration Contract Tests')

// Test 1: V1_SCOPE object exists and has COUPLE_MODE_ENABLED
assert.ok(V1_SCOPE, 'V1_SCOPE object exists')
assert.ok(V1_SCOPE.COUPLE_MODE_ENABLED !== undefined, 'V1_SCOPE.COUPLE_MODE_ENABLED is defined')
console.log('✓ V1_SCOPE object exists and has COUPLE_MODE_ENABLED')

// Test 2: V1_SCOPE.COUPLE_MODE_ENABLED is false in V1 (disabled state)
assert.strictEqual(V1_SCOPE.COUPLE_MODE_ENABLED, false, 'V1_SCOPE.COUPLE_MODE_ENABLED is false in V1')
console.log('✓ V1_SCOPE.COUPLE_MODE_ENABLED is false in V1 (disabled state)')

// Test 3: authRouting.js - STATIC CONTRACT VERIFICATION
const authRoutingContent = fs.readFileSync('./src/auth/authRouting.js', 'utf-8')
assert.ok(authRoutingContent.includes('V1_SCOPE.COUPLE_MODE_ENABLED'), 'authRouting.js contains V1_SCOPE.COUPLE_MODE_ENABLED')
assert.ok(authRoutingContent.includes('protectedRoutes.push(\'couple\')'), 'authRouting.js contains flag-dependent Couple route logic')
assert.ok(authRoutingContent.includes('requiresAuth'), 'authRouting.js contains requiresAuth function')
console.log('✓ authRouting.js contains flag-dependent Couple route logic (static contract)')

// Test 4: refreshCoupleUi - ACTUAL EXECUTION - disabled state
let updateNavCalledDisabled = false
let renderSectionCalledDisabled = false
await refreshCoupleUi({
  updateCoupleNavigation: () => { updateNavCalledDisabled = true },
  renderCoupleSection: () => { renderSectionCalledDisabled = true }
})
assert.strictEqual(updateNavCalledDisabled, false, 'updateCoupleNavigation not called when disabled')
assert.strictEqual(renderSectionCalledDisabled, false, 'renderCoupleSection not called when disabled')
console.log('✓ refreshCoupleUi does not invoke callbacks when disabled (runtime proof)')

// Test 5: refreshCoupleUi - ACTUAL EXECUTION - enabled state
let updateNavCalledEnabled = false
let renderSectionCalledEnabled = false
const originalValue = V1_SCOPE.COUPLE_MODE_ENABLED
try {
  V1_SCOPE.COUPLE_MODE_ENABLED = true
  await refreshCoupleUi({
    updateCoupleNavigation: () => { updateNavCalledEnabled = true },
    renderCoupleSection: () => { renderSectionCalledEnabled = true }
  })
  assert.strictEqual(updateNavCalledEnabled, true, 'updateCoupleNavigation called when enabled')
  assert.strictEqual(renderSectionCalledEnabled, true, 'renderCoupleSection called when enabled')
  console.log('✓ refreshCoupleUi invokes callbacks when enabled (runtime proof)')
} finally {
  V1_SCOPE.COUPLE_MODE_ENABLED = originalValue
}

// Test 6: preAuthBootstrap.js - STATIC CONTRACT VERIFICATION
const preAuthBootstrapContent = fs.readFileSync('./src/bootstrap/preAuthBootstrap.js', 'utf-8')
assert.ok(preAuthBootstrapContent.includes('V1_SCOPE.COUPLE_MODE_ENABLED'), 'preAuthBootstrap.js contains V1_SCOPE.COUPLE_MODE_ENABLED')
assert.ok(preAuthBootstrapContent.includes('style.display'), 'preAuthBootstrap.js contains DOM visibility logic')
assert.ok(preAuthBootstrapContent.includes('coupleNavBtn'), 'preAuthBootstrap.js contains Couple nav logic')
assert.ok(preAuthBootstrapContent.includes('coupleSection'), 'preAuthBootstrap.js contains Couple section logic')
console.log('✓ preAuthBootstrap.js contains flag-dependent DOM visibility logic (static contract)')

// Test 7: main.js - STATIC CONTRACT VERIFICATION
const mainJsContent = fs.readFileSync('./src/main.js', 'utf-8')
assert.ok(mainJsContent.includes('V1_SCOPE.COUPLE_MODE_ENABLED'), 'main.js contains V1_SCOPE.COUPLE_MODE_ENABLED')
assert.ok(mainJsContent.includes('COUPLE_MODE_V1_ENABLED'), 'main.js uses COUPLE_MODE_V1_ENABLED flag')
assert.ok(mainJsContent.includes('coupleController'), 'main.js contains coupleController logic')
console.log('✓ main.js contains flag-dependent Couple controller logic (static contract)')

// Test 8: SettingsUI.js - STATIC CONTRACT VERIFICATION
const settingsUiContent = fs.readFileSync('./src/settings/SettingsUI.js', 'utf-8')
assert.ok(settingsUiContent.includes('V1_SCOPE.COUPLE_MODE_ENABLED'), 'SettingsUI.js contains V1_SCOPE.COUPLE_MODE_ENABLED')
assert.ok(settingsUiContent.includes('renderCoupleModeSettings'), 'SettingsUI.js contains renderCoupleModeSettings')
console.log('✓ SettingsUI.js contains flag-dependent Couple settings logic (static contract)')

// Test 9: Restoration contract summary
console.log('\n📊 Restoration Contract Summary:')
console.log('  RUNTIME PROOF:')
console.log('    - refreshCoupleUi does not invoke callbacks when disabled ✓')
console.log('    - refreshCoupleUi invokes callbacks when enabled ✓')
console.log('  STATIC CONTRACT:')
console.log('    - authRouting.js contains flag-dependent Couple route logic ✓')
console.log('    - preAuthBootstrap.js contains flag-dependent DOM visibility logic ✓')
console.log('    - main.js contains flag-dependent Couple controller logic ✓')
console.log('    - SettingsUI.js contains flag-dependent Couple settings logic ✓')
console.log('\n  To restore Couple mode: Change V1_SCOPE.COUPLE_MODE_ENABLED to true in src/constants/v1Scope.js')

console.log('\n📊 All V1 Scope Restoration Contract tests passed')
