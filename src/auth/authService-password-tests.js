/**
 * Tests for password recovery functionality in AuthService
 */

import { AuthService } from './authService.js'

async function runTests() {
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

  console.log('\n=== AuthService Password Recovery Tests ===\n')

  // Test 1: _buildPasswordResetRedirectUrl returns correct URL
  test('_buildPasswordResetRedirectUrl returns correct URL', () => {
    const originalOrigin = global.window?.location?.origin
    global.window = { location: { origin: 'http://localhost:5173' } }
    
    const url = AuthService._buildPasswordResetRedirectUrl()
    
    assertEqual(url, 'http://localhost:5173/reset-password', 'Should return correct redirect URL')
    
    if (originalOrigin) {
      global.window.location.origin = originalOrigin
    } else {
      delete global.window
    }
  })

  // Test 2: resetPassword calls supabase.auth.resetPasswordForEmail with correct params (using injection)
  test('resetPassword calls supabase.auth.resetPasswordForEmail(email, { redirectTo })', async () => {
    let capturedEmail = null
    let capturedOptions = null
    
    const mockSupabaseClient = {
      auth: {
        resetPasswordForEmail: async (email, options) => {
          capturedEmail = email
          capturedOptions = options
          return { error: null }
        }
      }
    }

    global.window = { location: { origin: 'http://localhost:5173' } }

    await AuthService.resetPassword('test@example.com', mockSupabaseClient, true)
    
    assertEqual(capturedEmail, 'test@example.com', 'Should pass correct email')
    assert(capturedOptions !== null, 'Should pass options object')
    assertEqual(capturedOptions.redirectTo, 'http://localhost:5173/reset-password', 'Should pass correct redirectTo')
    
    delete global.window
  })

  // Test 3: updatePassword calls supabase.auth.updateUser({ password: newPassword }) (using injection)
  test('updatePassword calls supabase.auth.updateUser({ password: newPassword })', async () => {
    let capturedOptions = null
    
    const mockSupabaseClient = {
      auth: {
        updateUser: async (options) => {
          capturedOptions = options
          return { error: null }
        }
      }
    }

    await AuthService.updatePassword('newPassword123', mockSupabaseClient, true)
    
    assert(capturedOptions !== null, 'Should pass options object')
    assertEqual(capturedOptions.password, 'newPassword123', 'Should pass correct password')
  })

  // Test 4: Supabase error is propagated (using injection)
  test('Supabase error is propagated', async () => {
    const mockSupabaseClient = {
      auth: {
        resetPasswordForEmail: async () => {
          return { error: { message: 'Supabase error' } }
        }
      }
    }

    const result = await AuthService.resetPassword('test@example.com', mockSupabaseClient, true)
    
    assert(result.error !== null, 'Should return error')
    assertEqual(result.error.message, 'Supabase error', 'Error message should be propagated')
  })

  // Test 5: Network error is handled without fake success (using injection)
  test('Network error is handled without fake success', async () => {
    const mockSupabaseClient = {
      auth: {
        resetPasswordForEmail: async () => {
          throw new Error('Network error')
        }
      }
    }

    const result = await AuthService.resetPassword('test@example.com', mockSupabaseClient, true)
    
    assert(result.error !== null, 'Should return error')
    assertEqual(result.error.message, 'Network error', 'Network error should be propagated')
  })

  // Test 6: Placeholder mode returns error (no fake success)
  test('Placeholder mode returns error (no fake success)', async () => {
    const result = await AuthService.resetPassword('test@example.com')
    assert(result.error !== null, 'Should return error in placeholder mode')
    assert(result.error.message.includes('indisponible'), 'Error should mention unavailability')
  })

  // Test 7: updatePassword in placeholder mode returns error (no fake success)
  test('updatePassword in placeholder mode returns error (no fake success)', async () => {
    const result = await AuthService.updatePassword('newPassword123')
    assert(result.error !== null, 'Should return error in placeholder mode')
    assert(result.error.message.includes('indisponible'), 'Error should mention unavailability')
  })

  console.log(`\n=== Test Results: ${passed} passed, ${failed} failed ===\n`)
  
  return { passed, failed }
}

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runTests()
}

export { runTests }
