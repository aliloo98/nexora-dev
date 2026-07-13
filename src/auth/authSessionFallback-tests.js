import assert from 'node:assert/strict'
import {
  isStoredSessionValid,
  shouldUseStoredAuthFallback
} from './authService.js'

const nowSeconds = 1_800_000_000
const user = { id: 'user-a' }
const validSession = {
  access_token: 'token',
  expires_at: nowSeconds + 3600,
  user: { id: 'user-a' }
}

assert.equal(isStoredSessionValid({ session: validSession, user, nowSeconds }), true, 'matching non-expired session should be valid')
assert.equal(isStoredSessionValid({ session: { ...validSession, expires_at: nowSeconds }, user, nowSeconds }), false, 'expired session should be invalid')
assert.equal(isStoredSessionValid({ session: { ...validSession, expires_at: undefined }, user, nowSeconds }), false, 'session without expiry should be invalid')
assert.equal(isStoredSessionValid({ session: { ...validSession, access_token: '' }, user, nowSeconds }), false, 'session without access token should be invalid')
assert.equal(isStoredSessionValid({ session: { ...validSession, user: { id: 'user-b' } }, user, nowSeconds }), false, 'session and cached user must match')

assert.equal(
  shouldUseStoredAuthFallback({ configured: true, online: false, session: validSession, user, nowSeconds }),
  true,
  'configured app may use a valid cached session while offline'
)
assert.equal(
  shouldUseStoredAuthFallback({ configured: true, online: true, session: validSession, user, nowSeconds }),
  false,
  'configured app must fail closed when online validation fails'
)
assert.equal(
  shouldUseStoredAuthFallback({ configured: true, online: false, session: { ...validSession, expires_at: nowSeconds }, user, nowSeconds }),
  false,
  'configured app must reject expired offline sessions'
)
assert.equal(
  shouldUseStoredAuthFallback({ configured: false, online: true, session: null, user, nowSeconds }),
  true,
  'unconfigured local development should retain placeholder restoration'
)

console.log('authSessionFallback-tests: OK')
