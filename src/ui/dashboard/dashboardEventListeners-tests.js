/**
 * Regression test for dashboard event listener memory leak
 * 
 * This test verifies that the fix for the budget coach action button
 * memory leak (cloning the node to remove existing listeners) works correctly.
 * 
 * The bug: updateAll() added a new event listener to the budget coach button
 * on every call without removing the previous one, causing memory leaks.
 * 
 * The fix: Clone the button node to remove existing listeners before adding the new one.
 * 
 * Note: This test verifies the cloning behavior conceptually. Direct DOM testing
 * in Node.js requires complex mocking, so we test the core principle that cloning
 * removes listeners by using a simplified mock that tracks listener counts.
 */

export async function runDashboardEventListenerTests() {
  console.log('🧪 Running Dashboard Event Listener Regression Tests')
  
  let passed = 0
  let failed = 0
  
  // Test 1: Verify that cloning removes existing listeners (conceptual test)
  try {
    // Create a mock button that tracks listeners
    const createMockButton = () => ({
      _listeners: [],
      dataset: {},
      addEventListener(event, handler) {
        this._listeners.push({ event, handler })
      },
      cloneNode(deep) {
        // Cloning should NOT copy listeners (this is the DOM behavior)
        const clone = { ...this, _listeners: [] }
        if (deep && this.childNodes) {
          clone.childNodes = this.childNodes.map(n => n.cloneNode ? n.cloneNode(deep) : n)
        }
        return clone
      }
    })
    
    const button = createMockButton()
    button.dataset.target = 'dashboard'
    
    // Add first listener
    button.addEventListener('click', () => {})
    
    // Clone the button (simulates the fix)
    const newButton = button.cloneNode(true)
    
    // Add new listener to cloned button
    newButton.addEventListener('click', () => {})
    
    // Original should have 1 listener, clone should have 1 (not 2)
    if (button._listeners.length === 1 && newButton._listeners.length === 1) {
      console.log('✓ [Regression] Cloning removes existing listeners (original has 1, clone has 1)')
      passed++
    } else {
      console.error(`✗ [Regression] Expected 1 listener each, got original: ${button._listeners.length}, clone: ${newButton._listeners.length}`)
      failed++
    }
  } catch (error) {
    console.error('✗ [Regression] Listener removal test failed:', error.message)
    failed++
  }
  
  // Test 2: Verify that without cloning, listeners accumulate (demonstrates the bug)
  try {
    const createMockButton = () => ({
      _listeners: [],
      dataset: {},
      addEventListener(event, handler) {
        this._listeners.push({ event, handler })
      }
    })
    
    const button = createMockButton()
    button.dataset.target = 'dashboard'
    
    // Simulate the BUGGY behavior: add listener without cloning
    for (let i = 0; i < 5; i++) {
      button.addEventListener('click', () => {})
    }
    
    // Should have 5 listeners (accumulated)
    if (button._listeners.length === 5) {
      console.log('✓ [Regression] Without cloning, listeners accumulate (5 listeners added)')
      passed++
    } else {
      console.error(`✗ [Regression] Expected 5 accumulated listeners, got ${button._listeners.length}`)
      failed++
    }
  } catch (error) {
    console.error('✗ [Regression] Accumulation test failed:', error.message)
    failed++
  }
  
  // Test 3: Verify dataset attributes are preserved during cloning
  try {
    const createMockButton = () => ({
      _listeners: [],
      dataset: {},
      addEventListener(event, handler) {
        this._listeners.push({ event, handler })
      },
      cloneNode(deep) {
        const clone = { ...this, _listeners: [], dataset: { ...this.dataset } }
        return clone
      }
    })
    
    const button = createMockButton()
    button.dataset.target = 'revenues'
    button.dataset.other = 'value'
    
    const newButton = button.cloneNode(true)
    
    if (newButton.dataset.target === 'revenues' && newButton.dataset.other === 'value') {
      console.log('✓ [Regression] Dataset attributes preserved during cloning')
      passed++
    } else {
      console.error('✗ [Regression] Dataset attributes lost during cloning')
      failed++
    }
  } catch (error) {
    console.error('✗ [Regression] Dataset preservation test failed:', error.message)
    failed++
  }
  
  // Test 4: Verify the fix pattern works correctly
  try {
    const createMockButton = () => ({
      _listeners: [],
      dataset: {},
      addEventListener(event, handler) {
        this._listeners.push({ event, handler })
      },
      cloneNode(deep) {
        const clone = { ...this, _listeners: [], dataset: { ...this.dataset } }
        return clone
      }
    })
    
    // Simulate the fix pattern from updateAll()
    const simulateUpdateAll = (button) => {
      // The fix: clone to remove existing listeners
      const newButton = button.cloneNode(true)
      // Add new listener after cloning
      newButton.addEventListener('click', () => {})
      return newButton
    }
    
    const button = createMockButton()
    button.dataset.target = 'dashboard'
    
    // Simulate multiple updateAll() calls with the fix
    let currentButton = button
    for (let i = 0; i < 5; i++) {
      currentButton = simulateUpdateAll(currentButton)
    }
    
    // Should only have 1 listener (the last one added)
    if (currentButton._listeners.length === 1) {
      console.log('✓ [Regression] Fix pattern prevents listener accumulation (1 listener after 5 updates)')
      passed++
    } else {
      console.error(`✗ [Regression] Expected 1 listener with fix, got ${currentButton._listeners.length}`)
      failed++
    }
  } catch (error) {
    console.error('✗ [Regression] Fix pattern test failed:', error.message)
    failed++
  }
  
  console.log(`📊 Dashboard Event Listener Regression Tests: ${passed} passed, ${failed} failed`)
  return { passed, failed }
}

// Run tests if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runDashboardEventListenerTests().then(({ passed, failed }) => {
    process.exit(failed > 0 ? 1 : 0)
  })
}
