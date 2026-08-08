import assert from 'node:assert/strict'
import fs from 'node:fs'
import { shouldPersistPlaceholderAuth } from './authService.js'

// In Node.js environment, shouldPersistPlaceholderAuth() returns false (no window, no localhost)
assert.equal(shouldPersistPlaceholderAuth(), false, 'placeholder auth should NOT persist in Node.js (no window, no localhost)')

const source = fs.readFileSync(new URL('./authService.js', import.meta.url), 'utf8')
const getCurrentUserSource = source.slice(source.indexOf('  async getCurrentUser()'), source.indexOf('  /**\n   * Get current session'))
const getSessionSource = source.slice(source.indexOf('  async getSession()'), source.indexOf('  /**\n   * Store user session locally'))

assert.doesNotMatch(getCurrentUserSource, /writeStoredJson/, 'real user restoration must not duplicate the Supabase user in app storage')
assert.doesNotMatch(getSessionSource, /writeStoredJson/, 'real session restoration must not duplicate Supabase tokens in app storage')
assert.match(source, /shouldPersistPlaceholderAuth/, 'placeholder storage should be guarded by centralized policy')
assert.match(source, /isLocalDevLoopback/, 'local development should allow localhost OR 127.0.0.1')
assert.match(getCurrentUserSource, /supabase\.auth\.getSession\(\)/, 'offline identity should come from the native Supabase session')

console.log('authStoragePolicy-tests: OK')
