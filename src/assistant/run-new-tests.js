#!/usr/bin/env node
/**
 * Test runner for new Assistant Nexora architecture tests
 */

import { runRuleRegistryTests } from './RuleRegistry.tests.js'
import { runDataCollectorTests } from './DataCollector.tests.js'
import { runAnalysisEngineTests } from './AnalysisEngine.tests.js'
import { runIntegrationTests } from './integration.tests.js'

async function runAllTests() {
  console.log('\n========================================')
  console.log('  Assistant Nexora V1 - Unit Tests')
  console.log('========================================\n')

  let failed = false

  try {
    runRuleRegistryTests()
  } catch (error) {
    console.error('RuleRegistry tests failed:', error)
    failed = true
  }

  try {
    runDataCollectorTests()
  } catch (error) {
    console.error('DataCollector tests failed:', error)
    failed = true
  }

  try {
    runAnalysisEngineTests()
  } catch (error) {
    console.error('AnalysisEngine tests failed:', error)
    failed = true
  }

  try {
    await runIntegrationTests()
  } catch (error) {
    console.error('Integration tests failed:', error)
    failed = true
  }

  console.log('\n========================================')
  if (failed) {
    console.log('  ❌ Some tests failed')
    console.log('========================================\n')
    process.exit(1)
  } else {
    console.log('  ✅ All tests passed')
    console.log('========================================\n')
    process.exit(0)
  }
}

runAllTests()
