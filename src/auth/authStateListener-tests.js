import assert from 'node:assert/strict'
import AuthContext from './authContext.js'
import {
  AuthService,
  subscribeToSupabaseAuthChanges
} from './authService.js'

let nativeCallback = null
let unsubscribeCount = 0
const mockAuth = {
  onAuthStateChange(callback) {
    nativeCallback = callback
    return {
      data: {
        subscription: {
          unsubscribe: () => { unsubscribeCount += 1 }
        }
      }
    }
  }
}

let receivedEvent = null
const unsubscribe = subscribeToSupabaseAuthChanges({
  configured: true,
  auth: mockAuth,
  callback: (payload) => { receivedEvent = payload }
})

const session = { access_token: 'token', user: { id: 'user-a' } }
nativeCallback('TOKEN_REFRESHED', session)
assert.equal(receivedEvent.event, 'TOKEN_REFRESHED', 'native auth event should be forwarded')
assert.equal(receivedEvent.user.id, 'user-a', 'session user should be forwarded')
assert.equal(receivedEvent.session, session, 'session should be forwarded without duplication')
unsubscribe()
assert.equal(unsubscribeCount, 1, 'listener cleanup should unsubscribe from Supabase')

let unconfiguredSubscriptions = 0
const noopUnsubscribe = subscribeToSupabaseAuthChanges({
  configured: false,
  auth: { onAuthStateChange: () => { unconfiguredSubscriptions += 1 } },
  callback: () => {}
})
noopUnsubscribe()
assert.equal(unconfiguredSubscriptions, 0, 'placeholder auth should not register a Supabase listener')

const originalSubscribe = AuthService.subscribeToAuthChanges
const originalClear = AuthService.clearSessionPlaceholder
const originalState = AuthContext._state
const originalListeners = AuthContext._listeners
const originalUnsubscribe = AuthContext._authUnsubscribe

let contextCallback = null
let contextUnsubscribeCount = 0
let clearCount = 0
let observedState = null

try {
  AuthService.subscribeToAuthChanges = (callback) => {
    contextCallback = callback
    return () => { contextUnsubscribeCount += 1 }
  }
  AuthService.clearSessionPlaceholder = () => { clearCount += 1 }
  AuthContext._state = {
    user: null,
    session: null,
    isLoading: true,
    isAuthenticated: false,
    error: null
  }
  AuthContext._listeners = [(state) => { observedState = { ...state } }]
  AuthContext._authUnsubscribe = null

  AuthContext._setupAuthListener()
  contextCallback({ event: 'SIGNED_IN', user: session.user, session })
  assert.equal(observedState.isAuthenticated, true, 'signed-in event should authenticate the context')
  assert.equal(observedState.user.id, 'user-a', 'signed-in event should update the context user')

  contextCallback({ event: 'SIGNED_OUT', user: null, session: null })
  assert.equal(observedState.isAuthenticated, false, 'signed-out event should lock the context')
  assert.equal(observedState.user, null, 'signed-out event should clear the context user')
  assert.equal(clearCount, 1, 'signed-out event should clear placeholder remnants')

  AuthContext._setupAuthListener()
  assert.equal(contextUnsubscribeCount, 1, 'listener replacement should clean up the previous subscription')
} finally {
  AuthContext._authUnsubscribe?.()
  AuthService.subscribeToAuthChanges = originalSubscribe
  AuthService.clearSessionPlaceholder = originalClear
  AuthContext._state = originalState
  AuthContext._listeners = originalListeners
  AuthContext._authUnsubscribe = originalUnsubscribe
}

console.log('authStateListener-tests: OK')
