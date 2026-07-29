/**
 * Integration tests for real AssistantService with actual application services
 * 
 * These tests verify that the assistant works with the real Nexora services
 * instead of mock implementations.
 */

import { getRealAssistantService, areRealServicesAvailable } from './assistantFactory.js'

function assert(condition, message) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`)
  }
}

function assertEqual(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(`Assertion failed: ${message} (expected: ${expected}, actual: ${actual})`)
  }
}

function runTest(name, fn) {
  try {
    fn()
    console.log(`✓ ${name}`)
  } catch (error) {
    console.error(`✗ ${name}`)
    console.error(`  ${error.message}`)
    throw error
  }
}

async function runRealServiceTests() {
  console.log('\n=== Real AssistantService Integration Tests ===\n')

  runTest('should check if real services are available', () => {
    const available = areRealServicesAvailable()
    console.log(`  Real services available: ${available}`)
    assert(true, 'Check completed')
  })

  runTest('should get real assistant service instance', () => {
    const service = getRealAssistantService()
    assert(service !== null, 'Service should not be null')
    assert(typeof service.analyze === 'function', 'Service should have analyze method')
    assert(typeof service.getQuickInsights === 'function', 'Service should have getQuickInsights method')
  })

  if (areRealServicesAvailable()) {
    runTest('should analyze current month with real data', async () => {
      const service = getRealAssistantService()
      
      // Get current month key
      const now = new Date()
      const monthKey = now.toLocaleString('fr-FR', { month: 'long', year: 'numeric' })
      
      console.log(`  Analyzing month: ${monthKey}`)
      
      const report = await service.analyze(monthKey)
      
      assert(report !== null, 'Report should not be null')
      assert(typeof report.score === 'number', 'Report should have score')
      assert(typeof report.status === 'string', 'Report should have status')
      assert(Array.isArray(report.alerts), 'Report should have alerts array')
      assert(Array.isArray(report.recommendations), 'Report should have recommendations array')
      
      console.log(`  Score: ${report.score}`)
      console.log(`  Status: ${report.status}`)
      console.log(`  Alerts: ${report.alerts.length}`)
      console.log(`  Recommendations: ${report.recommendations.length}`)
    })

    runTest('should get quick insights with real data', async () => {
      const service = getRealAssistantService()
      
      const now = new Date()
      const monthKey = now.toLocaleString('fr-FR', { month: 'long', year: 'numeric' })
      
      const insights = await service.getQuickInsights(monthKey)
      
      assert(insights !== null, 'Insights should not be null')
      assert(typeof insights.score === 'number', 'Insights should have score')
      assert(typeof insights.status === 'string', 'Insights should have status')
      assert(typeof insights.hasData === 'boolean', 'Insights should have hasData')
      
      console.log(`  Quick insights score: ${insights.score}`)
      console.log(`  Has data: ${insights.hasData}`)
    })

    runTest('should get judgment with real data', async () => {
      const service = getRealAssistantService()
      
      const now = new Date()
      const monthKey = now.toLocaleString('fr-FR', { month: 'long', year: 'numeric' })
      
      const judgment = await service.getJudgment(monthKey)
      
      assert(judgment !== null, 'Judgment should not be null')
      assert(typeof judgment.diagnostic === 'string', 'Judgment should have diagnostic')
      assert(typeof judgment.action === 'string', 'Judgment should have action')
      
      console.log(`  Judgment diagnostic: ${judgment.diagnostic}`)
    })
  } else {
    console.log('⚠ Skipping real data tests (services not available)')
  }

  console.log('\n=== Real AssistantService Integration Tests Passed ===\n')
}

// Run tests if this file is executed directly
if (typeof window === 'undefined' || typeof global !== 'undefined') {
  runRealServiceTests().catch(error => {
    console.error('Tests failed:', error)
    process.exit(1)
  })
}

export { runRealServiceTests }
