/**
 * Integration tests for Assistant Nexora V1
 * Tests the complete pipeline from AssistantService
 */

import { AssistantService } from './AssistantService.js'
import { AssistantReport } from './AssistantReport.js'
import { registerPredefinedRules } from './rules.js'
import { RuleRegistry } from './RuleRegistry.js'

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

export async function runIntegrationTests() {
  console.log('\n=== Integration Tests ===\n')

  runTest('should create service with configuration', () => {
    const service = new AssistantService({
      services: {
        budgetService: { mock: true },
        goalsService: { mock: true },
        debtsService: { mock: true }
      }
    })
    assert(service !== null, 'Service should be created')
  })

  runTest('should initialize with predefined rules', () => {
    const freshRegistry = new RuleRegistry()
    const service = new AssistantService({ ruleRegistry: freshRegistry })
    service.initialize()
    assert(service.initialized === true, 'Service should be initialized')
  })

  runTest('should analyze with mock services', async () => {
    const freshRegistry = new RuleRegistry()
    const mockBudgetService = {
      getMonthlyBudgetState: async (month) => ({
        data: { rev_ali: 2000, rev_megane: 500 },
        metrics: { income: 2500, fixed: 1000, variable: 500, expenses: 1500, savings: 1000 }
      })
    }
    const mockGoalsService = {
      getSummary: async () => ({
        goals: [
          { name: 'Vacances', target: 2000, current: 500 }
        ]
      }),
      getPrimaryGoal: async () => ({ name: 'Vacances', target: 2000, current: 500 })
    }
    const mockDebtsService = () => []
    const mockHelpers = {
      getMonthMetrics: () => ({ income: 2500, fixed: 1000, variable: 500, expenses: 1500, savings: 1000 }),
      getAmountFromData: (data, key) => data[key] || 0,
      filterTechnicalRecords: (items) => items
    }

    const service = new AssistantService({
      services: {
        budgetService: mockBudgetService,
        goalsService: mockGoalsService,
        debtsService: mockDebtsService,
        helpers: mockHelpers
      },
      ruleRegistry: freshRegistry
    })

    const report = await service.analyze('janvier 2026')

    assert(report instanceof AssistantReport, 'Should return AssistantReport')
    assert(report.score >= 0, 'Should have score')
    assert(report.scoreLabel.length > 0, 'Should have score label')
    assert(report.status.length > 0, 'Should have status')
    assert(report.metrics.income > 0, 'Should have income')
  })

  runTest('should return empty report on error', async () => {
    const freshRegistry = new RuleRegistry()
    const mockBudgetService = {
      getMonthlyBudgetState: async () => {
        throw new Error('Service error')
      }
    }

    const service = new AssistantService({
      services: {
        budgetService: mockBudgetService
      },
      ruleRegistry: freshRegistry
    })

    const report = await service.analyze('janvier 2026')

    assert(report instanceof AssistantReport, 'Should return AssistantReport even on error')
    assertEqual(report.score, 0, 'Should have score 0 on error')
    assertEqual(report.status, 'no_data', 'Should have no_data status on error')
  })

  runTest('should get quick insights', async () => {
    const freshRegistry = new RuleRegistry()
    const mockBudgetService = {
      getMonthlyBudgetState: async () => ({
        data: { rev_ali: 2000 },
        metrics: { income: 2000, fixed: 800, variable: 400, expenses: 1200, savings: 800 }
      })
    }
    const mockGoalsService = {
      getSummary: async () => ({ goals: [] }),
      getPrimaryGoal: async () => null
    }
    const mockDebtsService = () => []
    const mockHelpers = {
      getMonthMetrics: () => ({ income: 2000, fixed: 800, variable: 400, expenses: 1200, savings: 800 }),
      getAmountFromData: (data, key) => data[key] || 0,
      filterTechnicalRecords: (items) => items
    }

    const service = new AssistantService({
      services: {
        budgetService: mockBudgetService,
        goalsService: mockGoalsService,
        debtsService: mockDebtsService,
        helpers: mockHelpers
      },
      ruleRegistry: freshRegistry
    })

    const insights = await service.getQuickInsights('janvier 2026')

    assert(insights !== null, 'Should return insights')
    assert(insights.score >= 0, 'Should have score')
    assert(insights.scoreLabel.length > 0, 'Should have score label')
    assert(insights.trajectoryLabel.length > 0, 'Should have trajectory')
    assert(insights.hasData === true, 'Should have data')
  })

  runTest('should get judgment only', async () => {
    const freshRegistry = new RuleRegistry()
    const mockBudgetService = {
      getMonthlyBudgetState: async () => ({
        data: { rev_ali: 2000 },
        metrics: { income: 2000, fixed: 800, variable: 400, expenses: 1200, savings: 800 }
      })
    }
    const mockGoalsService = {
      getSummary: async () => ({ goals: [] }),
      getPrimaryGoal: async () => null
    }
    const mockDebtsService = () => []
    const mockHelpers = {
      getMonthMetrics: () => ({ income: 2000, fixed: 800, variable: 400, expenses: 1200, savings: 800 }),
      getAmountFromData: (data, key) => data[key] || 0,
      filterTechnicalRecords: (items) => items
    }

    const service = new AssistantService({
      services: {
        budgetService: mockBudgetService,
        goalsService: mockGoalsService,
        debtsService: mockDebtsService,
        helpers: mockHelpers
      },
      ruleRegistry: freshRegistry
    })

    const judgment = await service.getJudgment('janvier 2026')

    assert(judgment !== null, 'Should return judgment')
    assert(judgment.diagnostic.length > 0, 'Should have diagnostic')
    assert(judgment.action.length > 0, 'Should have action')
  })

  runTest('should register custom rules', () => {
    const freshRegistry = new RuleRegistry()
    const service = new AssistantService({ ruleRegistry: freshRegistry })
    service.initialize()

    const customRule = {
      id: 'custom_test',
      category: 'alerts',
      condition: (ctx) => ctx.customValue > 100,
      message: (ctx) => 'Custom alert',
      priority: 75
    }

    service.registerRule('alerts', customRule)

    // Should not throw
    assert(true, 'Custom rule registered successfully')
  })

  runTest('should handle no income scenario', async () => {
    const freshRegistry = new RuleRegistry()
    const mockBudgetService = {
      getMonthlyBudgetState: async () => ({
        data: {},
        metrics: { income: 0, fixed: 0, variable: 0, expenses: 0, savings: 0 }
      })
    }
    const mockGoalsService = {
      getSummary: async () => ({ goals: [] }),
      getPrimaryGoal: async () => null
    }
    const mockDebtsService = () => []
    const mockHelpers = {
      getMonthMetrics: () => ({ income: 0, fixed: 0, variable: 0, expenses: 0, savings: 0 }),
      getAmountFromData: (data, key) => data[key] || 0,
      filterTechnicalRecords: (items) => items
    }

    const service = new AssistantService({
      services: {
        budgetService: mockBudgetService,
        goalsService: mockGoalsService,
        debtsService: mockDebtsService,
        helpers: mockHelpers
      },
      ruleRegistry: freshRegistry
    })

    const report = await service.analyze('janvier 2026')

    assertEqual(report.status, 'no_data', 'Should have no_data status')
    assertEqual(report.score, 0, 'Should have score 0')
    assert(report.alerts.length > 0, 'Should have alerts')
  })

  runTest('should handle negative balance scenario', async () => {
    const freshRegistry = new RuleRegistry()
    const mockBudgetService = {
      getMonthlyBudgetState: async () => ({
        data: { rev_ali: 1000 },
        metrics: { income: 1000, fixed: 900, variable: 300, expenses: 1200, savings: -200 }
      })
    }
    const mockGoalsService = {
      getSummary: async () => ({ goals: [] }),
      getPrimaryGoal: async () => null
    }
    const mockDebtsService = () => []
    const mockHelpers = {
      getMonthMetrics: () => ({ income: 1000, fixed: 900, variable: 300, expenses: 1200, savings: -200 }),
      getAmountFromData: (data, key) => data[key] || 0,
      filterTechnicalRecords: (items) => items
    }

    const service = new AssistantService({
      services: {
        budgetService: mockBudgetService,
        goalsService: mockGoalsService,
        debtsService: mockDebtsService,
        helpers: mockHelpers
      },
      ruleRegistry: freshRegistry
    })

    const report = await service.analyze('janvier 2026')

    assertEqual(report.status, 'critical', 'Should have critical status')
    assert(report.metrics.savings < 0, 'Should have negative savings')
  })

  runTest('should handle debts scenario', async () => {
    const freshRegistry = new RuleRegistry()
    const mockBudgetService = {
      getMonthlyBudgetState: async () => ({
        data: { rev_ali: 2000 },
        metrics: { income: 2000, fixed: 800, variable: 400, expenses: 1200, savings: 800 }
      })
    }
    const mockGoalsService = {
      getSummary: async () => ({ goals: [] }),
      getPrimaryGoal: async () => null
    }
    const mockDebtsService = () => [
      { name: 'Crédit voiture', remaining: 5000, monthly: 200 }
    ]
    const mockHelpers = {
      getMonthMetrics: () => ({ income: 2000, fixed: 800, variable: 400, expenses: 1200, savings: 800 }),
      getAmountFromData: (data, key) => data[key] || 0,
      filterTechnicalRecords: (items) => items
    }

    const service = new AssistantService({
      services: {
        budgetService: mockBudgetService,
        goalsService: mockGoalsService,
        debtsService: mockDebtsService,
        helpers: mockHelpers
      },
      ruleRegistry: freshRegistry
    })

    const report = await service.analyze('janvier 2026')

    assert(report.debtAnalysis.total > 0, 'Should have debt total')
    assertEqual(report.debtAnalysis.total, 5000, 'Debt total should match')
  })

  runTest('should reset service', () => {
    const freshRegistry = new RuleRegistry()
    const service = new AssistantService({ ruleRegistry: freshRegistry })
    service.initialize()
    service.reset()
    assertEqual(service.initialized, false, 'Service should be reset')
  })

  runTest('should handle no data scenario', async () => {
    const freshRegistry = new RuleRegistry()
    const mockBudgetService = {
      getMonthlyBudgetState: async () => ({
        data: {},
        metrics: { income: 0, fixed: 0, variable: 0, expenses: 0, savings: 0 }
      })
    }
    const mockGoalsService = {
      getSummary: async () => ({ goals: [] }),
      getPrimaryGoal: async () => null
    }
    const mockDebtsService = () => []
    const mockHelpers = {
      getMonthMetrics: () => ({ income: 0, fixed: 0, variable: 0, expenses: 0, savings: 0 }),
      getAmountFromData: (data, key) => data[key] || 0,
      filterTechnicalRecords: (items) => items
    }

    const service = new AssistantService({
      services: {
        budgetService: mockBudgetService,
        goalsService: mockGoalsService,
        debtsService: mockDebtsService,
        helpers: mockHelpers
      },
      ruleRegistry: freshRegistry
    })

    const report = await service.analyze('janvier 2026')

    assertEqual(report.status, 'no_data', 'Should have no_data status')
    assertEqual(report.score, 0, 'Should have score 0')
    assert(report.alerts.length > 0, 'Should have alerts')
  })

  runTest('should handle healthy budget scenario', async () => {
    const freshRegistry = new RuleRegistry()
    const mockBudgetService = {
      getMonthlyBudgetState: async () => ({
        data: { rev_ali: 3000 },
        metrics: { income: 3000, fixed: 1000, variable: 800, expenses: 1800, savings: 1200 }
      })
    }
    const mockGoalsService = {
      getSummary: async () => ({ goals: [] }),
      getPrimaryGoal: async () => null
    }
    const mockDebtsService = () => []
    const mockHelpers = {
      getMonthMetrics: () => ({ income: 3000, fixed: 1000, variable: 800, expenses: 1800, savings: 1200 }),
      getAmountFromData: (data, key) => data[key] || 0,
      filterTechnicalRecords: (items) => items
    }

    const service = new AssistantService({
      services: {
        budgetService: mockBudgetService,
        goalsService: mockGoalsService,
        debtsService: mockDebtsService,
        helpers: mockHelpers
      },
      ruleRegistry: freshRegistry
    })

    const report = await service.analyze('janvier 2026')

    assert(report.status === 'excellent' || report.status === 'healthy', 'Should have healthy status')
    assert(report.score >= 70, 'Should have good score')
    assert(report.metrics.savings > 0, 'Should have positive savings')
  })

  runTest('should handle critical budget scenario', async () => {
    const freshRegistry = new RuleRegistry()
    const mockBudgetService = {
      getMonthlyBudgetState: async () => ({
        data: { rev_ali: 1000 },
        metrics: { income: 1000, fixed: 900, variable: 300, expenses: 1200, savings: -200 }
      })
    }
    const mockGoalsService = {
      getSummary: async () => ({ goals: [] }),
      getPrimaryGoal: async () => null
    }
    const mockDebtsService = () => []
    const mockHelpers = {
      getMonthMetrics: () => ({ income: 1000, fixed: 900, variable: 300, expenses: 1200, savings: -200 }),
      getAmountFromData: (data, key) => data[key] || 0,
      filterTechnicalRecords: (items) => items
    }

    const service = new AssistantService({
      services: {
        budgetService: mockBudgetService,
        goalsService: mockGoalsService,
        debtsService: mockDebtsService,
        helpers: mockHelpers
      },
      ruleRegistry: freshRegistry
    })

    const report = await service.analyze('janvier 2026')

    assertEqual(report.status, 'critical', 'Should have critical status')
    assert(report.metrics.savings < 0, 'Should have negative savings')
    assert(report.alerts.length > 0, 'Should have alerts')
  })

  runTest('should handle debt scenario', async () => {
    const freshRegistry = new RuleRegistry()
    const mockBudgetService = {
      getMonthlyBudgetState: async () => ({
        data: { rev_ali: 2000 },
        metrics: { income: 2000, fixed: 800, variable: 400, expenses: 1200, savings: 800 }
      })
    }
    const mockGoalsService = {
      getSummary: async () => ({ goals: [] }),
      getPrimaryGoal: async () => null
    }
    const mockDebtsService = () => [
      { name: 'Crédit voiture', remaining: 5000, monthly: 200 }
    ]
    const mockHelpers = {
      getMonthMetrics: () => ({ income: 2000, fixed: 800, variable: 400, expenses: 1200, savings: 800 }),
      getAmountFromData: (data, key) => data[key] || 0,
      filterTechnicalRecords: (items) => items
    }

    const service = new AssistantService({
      services: {
        budgetService: mockBudgetService,
        goalsService: mockGoalsService,
        debtsService: mockDebtsService,
        helpers: mockHelpers
      },
      ruleRegistry: freshRegistry
    })

    const report = await service.analyze('janvier 2026')

    assert(report.debtAnalysis.total > 0, 'Should have debt total')
    assertEqual(report.debtAnalysis.total, 5000, 'Debt total should match')
    assert(report.recommendations.length > 0, 'Should have recommendations')
  })

  runTest('should handle good savings scenario', async () => {
    const freshRegistry = new RuleRegistry()
    const mockBudgetService = {
      getMonthlyBudgetState: async () => ({
        data: { rev_ali: 4000 },
        metrics: { income: 4000, fixed: 1200, variable: 600, expenses: 1800, savings: 2200 }
      })
    }
    const mockGoalsService = {
      getSummary: async () => ({ goals: [] }),
      getPrimaryGoal: async () => null
    }
    const mockDebtsService = () => []
    const mockHelpers = {
      getMonthMetrics: () => ({ income: 4000, fixed: 1200, variable: 600, expenses: 1800, savings: 2200 }),
      getAmountFromData: (data, key) => data[key] || 0,
      filterTechnicalRecords: (items) => items
    }

    const service = new AssistantService({
      services: {
        budgetService: mockBudgetService,
        goalsService: mockGoalsService,
        debtsService: mockDebtsService,
        helpers: mockHelpers
      },
      ruleRegistry: freshRegistry
    })

    const report = await service.analyze('janvier 2026')

    assert(report.status === 'excellent' || report.status === 'healthy', 'Should have healthy status')
    assert(report.metrics.savingsRate >= 40, 'Should have good savings rate')
    assert(report.score >= 80, 'Should have high score')
  })

  console.log('\n=== All Integration tests passed ===\n')
}

// Run tests if this file is executed directly
if (typeof window === 'undefined' || typeof global !== 'undefined') {
  runIntegrationTests().catch(error => {
    console.error('Integration tests failed:', error)
    process.exit(1)
  })
}
