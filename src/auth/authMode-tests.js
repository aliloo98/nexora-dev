import assert from 'node:assert/strict'
import fs from 'node:fs'
import { shouldUsePlaceholderAuth } from './authService.js'
import { createLoginForm } from '../components/LoginForm.js'

assert.equal(shouldUsePlaceholderAuth(false), true, 'local placeholder auth should remain available without Supabase')
assert.equal(shouldUsePlaceholderAuth(true), false, 'configured Supabase must disable placeholder auth')

const localLoginMarkup = createLoginForm({ demoModeEnabled: true })
assert.match(localLoginMarkup, /id="loginDemoBtn"/, 'local development should retain the test mode button')
assert.match(localLoginMarkup, /Mode local de développement actif/, 'local development should display an accurate auth status')

const configuredLoginMarkup = createLoginForm({ demoModeEnabled: false })
assert.doesNotMatch(configuredLoginMarkup, /id="loginDemoBtn"/, 'configured Supabase should hide the local test mode button')
assert.match(configuredLoginMarkup, /Authentification Supabase active/, 'configured Supabase should display the real auth status')

const authServiceSource = fs.readFileSync(new URL('./authService.js', import.meta.url), 'utf8')
assert.doesNotMatch(authServiceSource, /email\s*===\s*['"]demo@nexora\.local['"]/, 'demo email must not bypass configured authentication')
assert.match(authServiceSource, /if \(shouldUsePlaceholderAuth\(\)\)/, 'sign in should use the configuration-only placeholder guard')

console.log('authMode-tests: OK')
