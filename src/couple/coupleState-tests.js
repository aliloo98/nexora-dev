/**
 * Couple State Tests
 *
 * Tests for the Couple state management and synchronization with legacy globals.
 */

import assert from 'node:assert/strict'
import { createCoupleState } from './coupleState.js'

/**
 * Test couple state synchronization with callback
 */
export function runCoupleStateTests() {
  console.log('🧪 Running Couple State Tests')

  let callbackCallCount = 0
  let lastCallbackValue = null

  const mockCallback = (value) => {
    callbackCallCount++
    lastCallbackValue = value
  }

  // Test 1: Initial state triggers callback with false
  const state1 = createCoupleState({
    initialVisible: false,
    onVisibilityChange: mockCallback
  })

  assert.strictEqual(callbackCallCount, 1, 'Callback should be called on initialization')
  assert.strictEqual(lastCallbackValue, false, 'Initial callback value should be false')
  assert.strictEqual(state1.getIsCoupleTabVisible(), false, 'Initial state should be false')

  // Test 2: Set to true triggers callback
  callbackCallCount = 0
  const result1 = state1.setIsCoupleTabVisible(true)
  assert.strictEqual(callbackCallCount, 1, 'Callback should be called on state change')
  assert.strictEqual(lastCallbackValue, true, 'Callback value should be true')
  assert.strictEqual(result1, true, 'setIsCoupleTabVisible should return new state')
  assert.strictEqual(state1.getIsCoupleTabVisible(), true, 'State should be true')

  // Test 3: Set to false triggers callback
  callbackCallCount = 0
  const result2 = state1.setIsCoupleTabVisible(false)
  assert.strictEqual(callbackCallCount, 1, 'Callback should be called on state change')
  assert.strictEqual(lastCallbackValue, false, 'Callback value should be false')
  assert.strictEqual(result2, false, 'setIsCoupleTabVisible should return new state')
  assert.strictEqual(state1.getIsCoupleTabVisible(), false, 'State should be false')

  // Test 4: No direct window dependency
  const stateCode = String(createCoupleState)
  assert.doesNotMatch(stateCode, /window/, 'State factory should not reference window directly')

  // Test 5: Initial state true triggers callback with true
  callbackCallCount = 0
  const state2 = createCoupleState({
    initialVisible: true,
    onVisibilityChange: mockCallback
  })
  assert.strictEqual(callbackCallCount, 1, 'Callback should be called on initialization with true')
  assert.strictEqual(lastCallbackValue, true, 'Initial callback value should be true')
  assert.strictEqual(state2.getIsCoupleTabVisible(), true, 'Initial state should be true')

  console.log('✓ Couple state synchronization tests passed')
}

runCoupleStateTests()
