/**
 * Unit tests for DataCollector
 */

import { DataCollector } from './DataCollector.js'

function assert(condition, message) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`)
  }
}

function assertEqual(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(`Assertion failed: ${message}\nExpected: ${expected}\nActual: ${actual}`)
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

export function runDataCollectorTests() {
  console.log('\n=== DataCollector Tests ===\n')

  runTest('should create a new collector', () => {
    const collector = new DataCollector()
    assert(collector !== null, 'Collector should be created')
  })

  runTest('should create collector with injected services', () => {
    const mockServices = {
      budgetService: { mock: true },
      goalsService: { mock: true },
      debtsService: { mock: true }
    }
    const collector = new DataCollector(mockServices)
    assert(collector !== null, 'Collector should be created with services')
  })

  runTest('should use injected budget service', () => {
    const mockBudgetService = {
      getMonthlyBudgetState: async () => ({ data: { income: 1000 } })
    }
    const collector = new DataCollector({ budgetService: mockBudgetService })
    
    const service = collector.getBudgetService()
    assertEqual(service, mockBudgetService, 'Should use injected service')
  })

  runTest('should use injected goals service', () => {
    const mockGoalsService = {
      getSummary: async () => ({ goals: [] })
    }
    const collector = new DataCollector({ goalsService: mockGoalsService })
    
    const service = collector.getGoalsService()
    assertEqual(service, mockGoalsService, 'Should use injected service')
  })

  runTest('should use injected debts service', () => {
    const mockDebtsService = () => []
    const collector = new DataCollector({ debtsService: mockDebtsService })
    
    const service = collector.getDebtsService()
    assertEqual(service, mockDebtsService, 'Should use injected service')
  })

  runTest('should use injected helpers', () => {
    const mockHelpers = {
      getMonthMetrics: () => ({ income: 1000 }),
      getAmountFromData: () => 500
    }
    const collector = new DataCollector({ helpers: mockHelpers })
    
    const helpers = collector.getHelpers()
    assertEqual(helpers, mockHelpers, 'Should use injected helpers')
  })

  runTest('should collect budget data', async () => {
    const mockBudgetService = {
      getMonthlyBudgetState: async (month) => ({
        data: { rev_ali: 1000, rev_megane: 500 },
        metrics: { income: 1500, fixed: 500, variable: 300, expenses: 800, savings: 700 }
      })
    }
    const mockHelpers = {
      getAmountFromData: (data, key) => data[key] || 0
    }
    
    const collector = new DataCollector({ budgetService: mockBudgetService, helpers: mockHelpers })
    const budget = await collector.collectBudgetData('janvier 2026')
    
    assert(budget !== null, 'Budget data should be collected')
    assertEqual(budget.month, 'janvier 2026', 'Month should match')
    assertEqual(budget.income, 1500, 'Income should be calculated')
  })

  runTest('should collect goals data', async () => {
    const mockGoalsService = {
      getSummary: async () => ({
        goals: [
          { name: 'Vacances', target: 2000, current: 500 }
        ]
      }),
      getPrimaryGoal: async () => ({ name: 'Vacances', target: 2000, current: 500 })
    }
    const mockHelpers = {
      filterTechnicalRecords: (items) => items
    }
    
    const collector = new DataCollector({ goalsService: mockGoalsService, helpers: mockHelpers })
    const goals = await collector.collectGoalsData()
    
    assert(goals !== null, 'Goals data should be collected')
    assertEqual(goals.goals.length, 1, 'Should have 1 goal')
    assertEqual(goals.primaryGoal.name, 'Vacances', 'Primary goal should match')
  })

  runTest('should collect debts data', async () => {
    const mockDebtsService = () => [
      { name: 'Crédit voiture', remaining: 5000, monthly: 200 },
      { name: 'Crédit immobilier', remaining: 100000, monthly: 800 }
    ]
    
    const collector = new DataCollector({ debtsService: mockDebtsService })
    const debts = await collector.collectDebtsData()
    
    assert(debts !== null, 'Debts data should be collected')
    assertEqual(debts.debts.length, 2, 'Should have 2 debts')
    assertEqual(debts.total, 105000, 'Total should be calculated')
    assertEqual(debts.monthlyTotal, 1000, 'Monthly total should be calculated')
  })

  runTest('should filter out paid debts', async () => {
    const mockDebtsService = () => [
      { name: 'Crédit voiture', remaining: 5000, monthly: 200 },
      { name: 'Ancien crédit', remaining: 0, monthly: 0 }
    ]
    
    const collector = new DataCollector({ debtsService: mockDebtsService })
    const debts = await collector.collectDebtsData()
    
    assertEqual(debts.debts.length, 1, 'Should filter out paid debts')
    assertEqual(debts.debts[0].name, 'Crédit voiture', 'Should keep active debt')
  })

  runTest('should collect historical data', async () => {
    const mockHelpers = {
      getMonthMetrics: (month, options) => ({
        income: 1500,
        expenses: 800
      })
    }
    
    const collector = new DataCollector({ helpers: mockHelpers })
    const historical = await collector.collectHistoricalData(3)
    
    assert(historical !== null, 'Historical data should be collected')
    assert(historical.samples.length > 0, 'Should have samples')
    assert(historical.avgIncome > 0, 'Should calculate average income')
  })

  runTest('should handle missing getMonthMetrics gracefully', async () => {
    const collector = new DataCollector()
    const historical = await collector.collectHistoricalData(3)
    
    assertEqual(historical.samples.length, 0, 'Should return empty samples')
    assertEqual(historical.avgIncome, 0, 'Should return 0 for average income')
  })

  runTest('should collect all data', async () => {
    const mockBudgetService = {
      getMonthlyBudgetState: async () => ({
        data: { rev_ali: 1000 },
        metrics: { income: 1000, fixed: 500, variable: 300, expenses: 800, savings: 200 }
      })
    }
    const mockGoalsService = {
      getSummary: async () => ({ goals: [] }),
      getPrimaryGoal: async () => null
    }
    const mockDebtsService = () => []
    const mockHelpers = {
      getMonthMetrics: () => ({ income: 1000 }),
      getAmountFromData: (data, key) => data[key] || 0,
      filterTechnicalRecords: (items) => items
    }
    
    const collector = new DataCollector({
      budgetService: mockBudgetService,
      goalsService: mockGoalsService,
      debtsService: mockDebtsService,
      helpers: mockHelpers
    })
    
    const data = await collector.collect('janvier 2026')
    
    assert(data.budget !== null, 'Should have budget data')
    assert(data.goals !== null, 'Should have goals data')
    assert(data.debts !== null, 'Should have debts data')
    assert(data.historical !== null, 'Should have historical data')
  })

  runTest('should handle service errors gracefully', async () => {
    const mockBudgetService = {
      getMonthlyBudgetState: async () => {
        throw new Error('Service error')
      }
    }
    
    const collector = new DataCollector({ budgetService: mockBudgetService })
    
    let threwError = false
    try {
      await collector.collectBudgetData('janvier 2026')
    } catch (error) {
      threwError = true
    }
    
    // Should throw error since it's a service error
    assert(threwError, 'Should propagate service errors')
  })

  runTest('should handle null budget service', async () => {
    const collector = new DataCollector({ budgetService: null })
    const budget = await collector.collectBudgetData('janvier 2026')
    
    assert(budget !== null, 'Should return empty budget data')
    assertEqual(budget.income, 0, 'Income should be 0')
  })

  runTest('should handle null goals service', async () => {
    const collector = new DataCollector({ goalsService: null })
    const goals = await collector.collectGoalsData()
    
    assert(goals !== null, 'Should return empty goals data')
    assertEqual(goals.goals.length, 0, 'Goals should be empty')
  })

  runTest('should handle null debts service', async () => {
    const collector = new DataCollector({ debtsService: null })
    const debts = await collector.collectDebtsData()
    
    assert(debts !== null, 'Should return empty debts data')
    assertEqual(debts.debts.length, 0, 'Debts should be empty')
  })

  console.log('\n=== All DataCollector tests passed ===\n')
}

// Run tests if this file is executed directly
if (typeof window === 'undefined' || typeof global !== 'undefined') {
  runDataCollectorTests()
}
