/**
 * Auth Form Regression Tests
 * Tests for P1 fixes: session-gated signup and password recovery wiring
 */

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

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

  console.log('\n=== Auth Form Regression Tests ===\n')

  // Test 1: RegisterForm handles email confirmation required state (P1-A)
  test('RegisterForm handles email confirmation required state', () => {
    const registerFormPath = join(
      dirname(fileURLToPath(import.meta.url)),
      'RegisterForm.js'
    )
    const registerFormSource = readFileSync(registerFormPath, 'utf8')

    // Verify session is destructured from signUp
    const sessionPattern = /const \{ user, session, error \} = await AuthContext\.signUp/
    assert(sessionPattern.test(registerFormSource), 'RegisterForm should destructure session from signUp')

    // Verify confirmation-required check exists
    const confirmationPattern = /if \(user && !session\) \{[\s\S]*Vérifiez votre e-mail pour confirmer/
    assert(confirmationPattern.test(registerFormSource), 'RegisterForm should check for session-null and show confirmation message')

    // Verify dashboard navigation is guarded
    const navigationAfterGuard = registerFormSource.match(
      /if \(user && !session\)[\s\S]*?return[\s\S]*?window\.location\.hash = '#section-dashboard'/s
    )
    assert(navigationAfterGuard !== null, 'Dashboard navigation should only occur after session check')
  })

  // Test 2: RegisterForm preserves authenticated signup flow
  test('RegisterForm preserves authenticated signup flow', () => {
    const registerFormPath = join(
      dirname(fileURLToPath(import.meta.url)),
      'RegisterForm.js'
    )
    const registerFormSource = readFileSync(registerFormPath, 'utf8')

    // Verify normal success message still exists
    const normalPattern = /showToast\('✅ Inscription réussie! Bienvenue/
    assert(normalPattern.test(registerFormSource), 'Normal signup success message should still exist')

    // Verify dashboard navigation code still exists
    const navigationPattern = /window\.location\.hash = '#section-dashboard'/
    assert(navigationPattern.test(registerFormSource), 'Dashboard navigation should still exist for authenticated signup')
  })

  // Test 3: ForgotPasswordForm imports AuthService correctly (P1-B)
  test('ForgotPasswordForm imports AuthService correctly', () => {
    const forgotPasswordPath = join(
      dirname(fileURLToPath(import.meta.url)),
      'ForgotPasswordForm.js'
    )
    const forgotPasswordSource = readFileSync(forgotPasswordPath, 'utf8')

    // Verify correct import pattern
    const importPattern = /const \{ AuthService \} = await import\('\.\.\/auth\/authService\.js'\)/
    assert(importPattern.test(forgotPasswordSource), 'ForgotPasswordForm should import AuthService')

    // Verify correct call pattern
    const callPattern = /await AuthService\.resetPassword\(email\)/
    assert(callPattern.test(forgotPasswordSource), 'ForgotPasswordForm should call AuthService.resetPassword')

    // Verify broken pattern is gone
    const brokenPattern = /const \{ resetPassword \} = await import/
    assert(!brokenPattern.test(forgotPasswordSource), 'ForgotPasswordForm should not import resetPassword as named export')
  })

  console.log(`\n=== Test Results: ${passed} passed, ${failed} failed ===\n`)
  
  return { passed, failed }
}

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runTests()
}

export { runTests }
