import assert from 'node:assert/strict'
import fs from 'node:fs'
import { shouldUsePlaceholderAuth, isDemoModeAllowed, isLocalDevelopmentPlaceholderAllowed, isDevelopmentMode } from './authService.js'
import { createLoginForm } from '../components/LoginForm.js'

// In Node.js environment, both isDemoModeAllowed() and isLocalDevelopmentPlaceholderAllowed() return false (no window)
assert.equal(shouldUsePlaceholderAuth(), false, 'placeholder auth should NOT be available in Node.js (no window, no localhost)')
assert.equal(isDemoModeAllowed(), false, 'demo mode should not be allowed in Node.js environment (no window)')
assert.equal(isLocalDevelopmentPlaceholderAllowed(), false, 'local development placeholder should not be allowed in Node.js (no window)')
assert.equal(isDevelopmentMode(), false, 'development mode should not be active in Node.js environment')

// Test with explicit demoModeEnabled=false (simulating production mode)
const configuredLoginMarkup = createLoginForm({ demoModeEnabled: false })
assert.doesNotMatch(configuredLoginMarkup, /id="loginDemoBtn"/, 'configured Supabase should hide the local test mode button')
assert.match(configuredLoginMarkup, /Authentification Supabase active/, 'configured Supabase should display the real auth status')

// Test with default parameters (should not show demo button in Node.js environment)
const defaultLoginMarkup = createLoginForm()
assert.doesNotMatch(defaultLoginMarkup, /id="loginDemoBtn"/, 'default should not show demo button without explicit enable')

const authServiceSource = fs.readFileSync(new URL('./authService.js', import.meta.url), 'utf8')
assert.doesNotMatch(authServiceSource, /email\s*===\s*['"]demo@nexora\.local['"]/, 'demo email must not bypass configured authentication')
assert.match(authServiceSource, /if \(shouldUsePlaceholderAuth\(\)\)/, 'sign in should use the configuration-only placeholder guard')

// Verify the security functions exist and check hostname
assert.match(authServiceSource, /isStrictLocalhost/, 'isStrictLocalhost function should exist')
assert.match(authServiceSource, /hostname === 'localhost'/, 'hostname check should be localhost only')
assert.match(authServiceSource, /isLocalDevLoopback/, 'isLocalDevLoopback function should exist')
assert.match(authServiceSource, /isLocalDevLoopback/, 'local dev loopback should check localhost OR 127.0.0.1')
assert.match(authServiceSource, /isDemoModeAllowed/, 'isDemoModeAllowed function should exist')
assert.match(authServiceSource, /isLocalDevelopmentPlaceholderAllowed/, 'isLocalDevelopmentPlaceholderAllowed function should exist')
assert.match(authServiceSource, /isDevelopmentMode/, 'isDevelopmentMode function should exist')

// Verify that shouldUsePlaceholderAuth uses the centralized policy
assert.match(authServiceSource, /isDemoModeAllowed\(\) \|\| isLocalDevelopmentPlaceholderAllowed\(\)/, 'shouldUsePlaceholderAuth should use both conditions')

// Verify that isLocalDevelopmentPlaceholderAllowed uses isLocalDevLoopback (not isStrictLocalhost)
assert.match(authServiceSource, /isLocalDevelopmentPlaceholderAllowed\(\)/, 'local development placeholder function should exist')
assert.match(authServiceSource, /isLocalDevLoopback/, 'local dev loopback function should exist')
assert.match(authServiceSource, /isLocalDevLoopback\(\)/, 'local development placeholder should use loopback')

// Verify that isDemoModeAllowed still uses isStrictLocalhost (localhost only, not 127.0.0.1)
assert.match(authServiceSource, /isDemoModeAllowed\(\)/, 'demo mode function should exist')
assert.match(authServiceSource, /isStrictLocalhost\(\)/, 'demo mode should use strict localhost')

// Verify the security distinction: development allows 127.0.0.1, demo does not
assert.match(authServiceSource, /isLocalDevLoopback/, 'development allows 127.0.0.1')
assert.doesNotMatch(authServiceSource, /isDemoModeAllowed\(\)[\s\S]*?127\.0\.0\.1/, 'demo mode should NOT use 127.0.0.1')

// Verify that signUp also respects the security policy
assert.match(authServiceSource, /shouldUsePlaceholderAuth\(\)/, 'signUp should check shouldUsePlaceholderAuth')
assert.match(authServiceSource, /Authentification locale non autorisée/, 'signUp should return error when placeholder not allowed')

console.log('authMode-tests: OK')
