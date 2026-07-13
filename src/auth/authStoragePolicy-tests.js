import assert from 'node:assert/strict'
import fs from 'node:fs'
import { shouldPersistPlaceholderAuth } from './authService.js'

assert.equal(shouldPersistPlaceholderAuth(false), true, 'unconfigured local development should persist its placeholder session')
assert.equal(shouldPersistPlaceholderAuth(true), false, 'configured Supabase should never persist a duplicate placeholder session')

const source = fs.readFileSync(new URL('./authService.js', import.meta.url), 'utf8')
const getCurrentUserSource = source.slice(source.indexOf('  async getCurrentUser()'), source.indexOf('  /**\n   * Get current session'))
const getSessionSource = source.slice(source.indexOf('  async getSession()'), source.indexOf('  /**\n   * Store user session locally'))

assert.doesNotMatch(getCurrentUserSource, /writeStoredJson/, 'real user restoration must not duplicate the Supabase user in app storage')
assert.doesNotMatch(getSessionSource, /writeStoredJson/, 'real session restoration must not duplicate Supabase tokens in app storage')
assert.match(source, /if \(!shouldPersistPlaceholderAuth\(\)\)/, 'placeholder storage should be guarded by Supabase configuration')
assert.match(getCurrentUserSource, /supabase\.auth\.getSession\(\)/, 'offline identity should come from the native Supabase session')

console.log('authStoragePolicy-tests: OK')
