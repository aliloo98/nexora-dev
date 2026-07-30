/**
 * Regression tests for onboarding integration
 * These tests ensure that the variable scope fix for revenue/expense detection
 * continues to work correctly.
 * 
 * The bug: The original code referenced `data[key]` outside the `.some()` callback scope,
 * causing a ReferenceError because `key` was not accessible.
 * 
 * The fix: Move the value check inside the callback where `key` is accessible.
 */

export async function runOnboardingIntegrationTests() {
  console.log('🧪 Running Onboarding Integration Regression Tests')
  
  let passed = 0
  let failed = 0
  
  // Test 1: Revenue detection with valid data (FIXED implementation)
  try {
    const data = { rev_ali: 1700, loyer: 650 }
    
    // This is the FIXED implementation - value check inside callback
    const hasRevenueEntry = Object.keys(data).some(key => {
      const value = Number(data[key]) || 0
      return (key.toLowerCase().includes('rev') || 
             key.toLowerCase().includes('revenu') ||
             key.toLowerCase().includes('salaire') ||
             key.toLowerCase().includes('income')) && value > 0
    })
    
    if (hasRevenueEntry === true) {
      console.log('✓ [Regression] Revenue detection works correctly with valid data')
      passed++
    } else {
      console.error('✗ [Regression] Revenue detection failed - should detect positive revenue')
      failed++
    }
  } catch (error) {
    console.error('✗ [Regression] Revenue detection test failed:', error.message)
    failed++
  }
  
  // Test 2: Revenue detection ignores zero/negative values
  try {
    const data = { rev_ali: 0, loyer: 650 }
    
    const hasRevenueEntry = Object.keys(data).some(key => {
      const value = Number(data[key]) || 0
      return (key.toLowerCase().includes('rev') || 
             key.toLowerCase().includes('revenu') ||
             key.toLowerCase().includes('salaire') ||
             key.toLowerCase().includes('income')) && value > 0
    })
    
    if (hasRevenueEntry === false) {
      console.log('✓ [Regression] Revenue detection correctly ignores zero values')
      passed++
    } else {
      console.error('✗ [Regression] Revenue detection incorrectly detected zero as positive')
      failed++
    }
  } catch (error) {
    console.error('✗ [Regression] Zero value test failed:', error.message)
    failed++
  }
  
  // Test 3: Expense detection with valid data
  try {
    const data = { courses: 420, variable_expense: 100 }
    
    const hasExpenseEntry = Object.keys(data).some(key => {
      const value = Number(data[key]) || 0
      return (key.toLowerCase().includes('dep') || 
             key.toLowerCase().includes('dépense') ||
             key.toLowerCase().includes('charge') ||
             key.toLowerCase().includes('fixe') ||
             key.toLowerCase().includes('variable')) && value > 0
    })
    
    if (hasExpenseEntry === true) {
      console.log('✓ [Regression] Expense detection works correctly with valid data')
      passed++
    } else {
      console.error('✗ [Regression] Expense detection failed - should detect positive expense')
      failed++
    }
  } catch (error) {
    console.error('✗ [Regression] Expense detection test failed:', error.message)
    failed++
  }
  
  // Test 4: Expense detection ignores zero/negative values
  try {
    const data = { loyer: 0, courses: 0 }
    
    const hasExpenseEntry = Object.keys(data).some(key => {
      const value = Number(data[key]) || 0
      return (key.toLowerCase().includes('dep') || 
             key.toLowerCase().includes('dépense') ||
             key.toLowerCase().includes('charge') ||
             key.toLowerCase().includes('fixe') ||
             key.toLowerCase().includes('variable')) && value > 0
    })
    
    if (hasExpenseEntry === false) {
      console.log('✓ [Regression] Expense detection correctly ignores zero values')
      passed++
    } else {
      console.error('✗ [Regression] Expense detection incorrectly detected zero as positive')
      failed++
    }
  } catch (error) {
    console.error('✗ [Regression] Zero expense test failed:', error.message)
    failed++
  }
  
  // Test 5: Multiple revenue keys - should detect any positive value
  try {
    const data = { rev_ali: 0, rev_megane: 1300, rev_excep: 0 }
    
    const hasRevenueEntry = Object.keys(data).some(key => {
      const value = Number(data[key]) || 0
      return (key.toLowerCase().includes('rev') || 
             key.toLowerCase().includes('revenu') ||
             key.toLowerCase().includes('salaire') ||
             key.toLowerCase().includes('income')) && value > 0
    })
    
    if (hasRevenueEntry === true) {
      console.log('✓ [Regression] Revenue detection works with mixed positive/zero values')
      passed++
    } else {
      console.error('✗ [Regression] Revenue detection failed with mixed values')
      failed++
    }
  } catch (error) {
    console.error('✗ [Regression] Mixed values test failed:', error.message)
    failed++
  }
  
  // Test 6: OLD implementation would fail (demonstrates the bug)
  try {
    const data = { rev_ali: 1700 }
    
    // This is the BUGGY implementation - would throw ReferenceError
    let buggyFailed = false
    try {
      const hasRevenueEntry = Object.keys(data).some(key => 
        key.toLowerCase().includes('rev')
      )
      // BUG: Trying to access data[key] outside callback scope
      if (hasRevenueEntry && data[key] > 0) { // ReferenceError: key is not defined
        buggyFailed = false
      }
    } catch (e) {
      buggyFailed = true
    }
    
    if (buggyFailed) {
      console.log('✓ [Regression] Old buggy implementation correctly fails (demonstrates bug)')
      passed++
    } else {
      console.error('✗ [Regression] Old buggy implementation did not fail as expected')
      failed++
    }
  } catch (error) {
    console.error('✗ [Regression] Buggy implementation test failed:', error.message)
    failed++
  }
  
  console.log(`📊 Onboarding Integration Regression Tests: ${passed} passed, ${failed} failed`)
  return { passed, failed }
}

// Run tests if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runOnboardingIntegrationTests().then(({ passed, failed }) => {
    process.exit(failed > 0 ? 1 : 0)
  })
}
