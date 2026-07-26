/**
 * Tests for password recovery functionality in AuthContext
 */

import AuthContext from './authContext.js'
import { AuthService } from './authService.js'

function runTests() {
  let passed = 0
  let failed = 0

  function test(name, fn) {
    try {
      fn()
      console.log(`✓ ${name}`)
      passed++
    } catch (error) {
      console.error(`✗ ${name}`)
      console.error(`  ${error.message}`)
      failed++
    }
  }

  function assert(condition, message) {
    if (!condition) {
      throw new Error(message || 'Assertion failed')
    }
  }

  function assertEqual(actual, expected, message) {
    if (actual !== expected) {
      throw new Error(message || `Expected ${expected}, got ${actual}`)
    }
  }

  console.log('\n=== AuthContext Password Recovery Tests ===\n')

  // Test 1: PASSWORD_RECOVERY activates isPasswordRecovery via real callback
  test('PASSWORD_RECOVERY activates isPasswordRecovery via real callback', () => {
    // Reset state
    AuthContext._state.isPasswordRecovery = false
    AuthContext._state.user = null
    AuthContext._state.session = null
    AuthContext._state.isAuthenticated = false

    // Mock AuthService.subscribeToAuthChanges to capture the callback
    let capturedCallback = null
    const originalSubscribe = AuthService.subscribeToAuthChanges
    AuthService.subscribeToAuthChanges = (callback) => {
      capturedCallback = callback
      return () => {} // Mock unsubscribe
    }

    // Re-setup the listener to capture the callback
    AuthContext._setupAuthListener()

    assert(capturedCallback !== null, 'Callback should be captured')

    // Trigger PASSWORD_RECOVERY event via the real callback
    const mockUser = { id: 'test-id', email: 'test@example.com' }
    const mockSession = { access_token: 'test-token' }
    
    capturedCallback({ event: 'PASSWORD_RECOVERY', user: mockUser, session: mockSession })

    // Verify the flag is activated
    assert(AuthContext.isPasswordRecoveryMode() === true, 'isPasswordRecovery should be true after PASSWORD_RECOVERY')
    assertEqual(AuthContext._state.user?.id, 'test-id', 'User should be set')
    assertEqual(AuthContext._state.session?.access_token, 'test-token', 'Session should be set')
    assert(AuthContext._state.isAuthenticated === true, 'Should be authenticated')

    // Restore original method
    AuthService.subscribeToAuthChanges = originalSubscribe
    
    // Reset state
    AuthContext._state.isPasswordRecovery = false
    AuthContext._state.user = null
    AuthContext._state.session = null
    AuthContext._state.isAuthenticated = false
  })

  // Test 2: Normal SIGNED_IN does NOT activate isPasswordRecovery via real callback
  test('Normal SIGNED_IN does NOT activate isPasswordRecovery via real callback', () => {
    // Reset state
    AuthContext._state.isPasswordRecovery = false
    AuthContext._state.user = null
    AuthContext._state.session = null
    AuthContext._state.isAuthenticated = false

    // Mock AuthService.subscribeToAuthChanges to capture the callback
    let capturedCallback = null
    const originalSubscribe = AuthService.subscribeToAuthChanges
    AuthService.subscribeToAuthChanges = (callback) => {
      capturedCallback = callback
      return () => {} // Mock unsubscribe
    }

    // Re-setup the listener to capture the callback
    AuthContext._setupAuthListener()

    assert(capturedCallback !== null, 'Callback should be captured')

    // Trigger normal SIGNED_IN event via the real callback
    const mockUser = { id: 'test-id', email: 'test@example.com' }
    const mockSession = { access_token: 'test-token' }
    
    capturedCallback({ event: 'SIGNED_IN', user: mockUser, session: mockSession })

    // Verify the flag is NOT activated
    assert(AuthContext.isPasswordRecoveryMode() === false, 'isPasswordRecovery should remain false for normal SIGNED_IN')
    assertEqual(AuthContext._state.user?.id, 'test-id', 'User should be set')
    assertEqual(AuthContext._state.session?.access_token, 'test-token', 'Session should be set')
    assert(AuthContext._state.isAuthenticated === true, 'Should be authenticated')

    // Restore original method
    AuthService.subscribeToAuthChanges = originalSubscribe
    
    // Reset state
    AuthContext._state.user = null
    AuthContext._state.session = null
    AuthContext._state.isAuthenticated = false
  })

  // Test 3: SIGNED_OUT deactivates isPasswordRecovery via real callback
  test('SIGNED_OUT deactivates isPasswordRecovery via real callback', () => {
    // Mock localStorage and sessionStorage
    const originalLocalStorage = global.localStorage
    const originalSessionStorage = global.sessionStorage
    global.localStorage = {
      removeItem: () => {},
      getItem: () => null,
      setItem: () => {}
    }
    global.sessionStorage = {
      removeItem: () => {},
      getItem: () => null,
      setItem: () => {}
    }

    // Set initial state with recovery mode active
    AuthContext._state.isPasswordRecovery = true
    AuthContext._state.user = { id: 'test-id', email: 'test@example.com' }
    AuthContext._state.session = { access_token: 'test-token' }
    AuthContext._state.isAuthenticated = true

    // Mock AuthService.subscribeToAuthChanges to capture the callback
    let capturedCallback = null
    const originalSubscribe = AuthService.subscribeToAuthChanges
    AuthService.subscribeToAuthChanges = (callback) => {
      capturedCallback = callback
      return () => {} // Mock unsubscribe
    }

    // Re-setup the listener to capture the callback
    AuthContext._setupAuthListener()

    assert(capturedCallback !== null, 'Callback should be captured')

    // Trigger SIGNED_OUT event via the real callback
    capturedCallback({ event: 'SIGNED_OUT', user: null, session: null })

    // Verify the flag is deactivated
    assert(AuthContext.isPasswordRecoveryMode() === false, 'isPasswordRecovery should be false after SIGNED_OUT')
    assert(AuthContext._state.user === null, 'User should be null')
    assert(AuthContext._state.session === null, 'Session should be null')
    assert(AuthContext._state.isAuthenticated === false, 'Should not be authenticated')

    // Restore original methods
    AuthService.subscribeToAuthChanges = originalSubscribe
    if (originalLocalStorage) {
      global.localStorage = originalLocalStorage
    } else {
      delete global.localStorage
    }
    if (originalSessionStorage) {
      global.sessionStorage = originalSessionStorage
    } else {
      delete global.sessionStorage
    }
  })

  // Test 4: No post-login sync during PASSWORD_RECOVERY (spy on _syncSupabaseToLocalAfterLogin)
  test('No post-login sync during PASSWORD_RECOVERY (spy)', () => {
    // Reset state
    AuthContext._state.isPasswordRecovery = false
    AuthContext._state.user = null
    AuthContext._state.session = null
    AuthContext._state.isAuthenticated = false

    // Spy on _syncSupabaseToLocalAfterLogin
    let syncCallCount = 0
    const originalSync = AuthContext._syncSupabaseToLocalAfterLogin
    AuthContext._syncSupabaseToLocalAfterLogin = () => {
      syncCallCount++
    }

    // Mock AuthService.subscribeToAuthChanges to capture the callback
    let capturedCallback = null
    const originalSubscribe = AuthService.subscribeToAuthChanges
    AuthService.subscribeToAuthChanges = (callback) => {
      capturedCallback = callback
      return () => {} // Mock unsubscribe
    }

    // Re-setup the listener to capture the callback
    AuthContext._setupAuthListener()

    assert(capturedCallback !== null, 'Callback should be captured')

    // Trigger PASSWORD_RECOVERY event
    const mockUser = { id: 'test-id', email: 'test@example.com' }
    const mockSession = { access_token: 'test-token' }
    
    capturedCallback({ event: 'PASSWORD_RECOVERY', user: mockUser, session: mockSession })

    // Verify sync was NOT called
    assertEqual(syncCallCount, 0, '_syncSupabaseToLocalAfterLogin should not be called during PASSWORD_RECOVERY')

    // Restore original methods
    AuthService.subscribeToAuthChanges = originalSubscribe
    AuthContext._syncSupabaseToLocalAfterLogin = originalSync
    
    // Reset state
    AuthContext._state.isPasswordRecovery = false
    AuthContext._state.user = null
    AuthContext._state.session = null
    AuthContext._state.isAuthenticated = false
  })

  // Test 5: Post-login sync IS called during normal SIGNED_IN (spy on _syncSupabaseToLocalAfterLogin)
  test('Post-login sync IS called during normal SIGNED_IN (spy)', () => {
    // Reset state
    AuthContext._state.isPasswordRecovery = false
    AuthContext._state.user = null
    AuthContext._state.session = null
    AuthContext._state.isAuthenticated = false
    AuthContext._state.isLoading = false

    // Spy on _syncSupabaseToLocalAfterLogin
    let syncCallCount = 0
    const originalSync = AuthContext._syncSupabaseToLocalAfterLogin
    AuthContext._syncSupabaseToLocalAfterLogin = () => {
      syncCallCount++
    }

    // Mock AuthService.subscribeToAuthChanges to capture the callback
    let capturedCallback = null
    const originalSubscribe = AuthService.subscribeToAuthChanges
    AuthService.subscribeToAuthChanges = (callback) => {
      capturedCallback = callback
      return () => {} // Mock unsubscribe
    }

    // Re-setup the listener to capture the callback
    AuthContext._setupAuthListener()

    assert(capturedCallback !== null, 'Callback should be captured')

    // Trigger normal SIGNED_IN event with different user ID
    const mockUser = { id: 'test-id', email: 'test@example.com' }
    const mockSession = { access_token: 'test-token' }
    
    capturedCallback({ event: 'SIGNED_IN', user: mockUser, session: mockSession })

    // Verify sync WAS called (previousUserId was null, new user id is different)
    assertEqual(syncCallCount, 1, '_syncSupabaseToLocalAfterLogin should be called during normal SIGNED_IN')

    // Restore original methods
    AuthService.subscribeToAuthChanges = originalSubscribe
    AuthContext._syncSupabaseToLocalAfterLogin = originalSync
    
    // Reset state
    AuthContext._state.user = null
    AuthContext._state.session = null
    AuthContext._state.isAuthenticated = false
  })

  console.log(`\n=== Test Results: ${passed} passed, ${failed} failed ===\n`)
  
  return { passed, failed }
}

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runTests()
}

export { runTests }
