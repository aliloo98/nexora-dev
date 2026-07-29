/**
 * Unit tests for AnalysisEngine
 */

import { AnalysisEngine } from './AnalysisEngine.js'
import { RuleRegistry } from './RuleRegistry.js'
import { AssistantReport } from './AssistantReport.js'

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

export function runAnalysisEngineTests() {
  console.log('\n=== AnalysisEngine Tests ===\n')

  runTest('should create a new engine', () => {
    const registry = new RuleRegistry()
    const engine = new AnalysisEngine(registry)
    assert(engine !== null, 'Engine should be created')
  })

  runTest('should calculate metrics from data', () => {
    const registry = new RuleRegistry()
    const engine = new AnalysisEngine(registry)
    
    const data = {
      budget: {
        income: 2000,
        metrics: {
          fixed: 800,
          variable: 400,
          expenses: 1200,
          savings: 800
        }
      },
      debts: { total: 5000, monthlyTotal: 200 },
      historical: { avgIncome: 1800, avgExpenses: 1100 }
    }
    
    const metrics = engine.calculateMetrics(data)
    
    assertEqual(metrics.income, 2000, 'Income should match')
    assertEqual(metrics.fixedExpenses, 800, 'Fixed expenses should match')
    assertEqual(metrics.variableExpenses, 400, 'Variable expenses should match')
    assertEqual(metrics.totalExpenses, 1200, 'Total expenses should match')
    assertEqual(metrics.savings, 800, 'Savings should match')
    assertEqual(metrics.chargesRate, 60, 'Charges rate should be calculated')
    assertEqual(metrics.fixedRate, 40, 'Fixed rate should be calculated')
    assertEqual(metrics.variableRate, 20, 'Variable rate should be calculated')
  })

  runTest('should calculate score with no income', () => {
    const registry = new RuleRegistry()
    const engine = new AnalysisEngine(registry)
    
    const metrics = { income: 0, savingsRate: 0, chargesRate: 0, savings: 0 }
    const score = engine.calculateScore(metrics)
    
    assertEqual(score.score, 0, 'Score should be 0 with no income')
    assertEqual(score.label, 'Données insuffisantes', 'Label should indicate insufficient data')
  })

  runTest('should calculate score with positive income', () => {
    const registry = new RuleRegistry()
    const engine = new AnalysisEngine(registry)
    
    const metrics = { income: 2000, savingsRate: 20, chargesRate: 60, savings: 400 }
    const score = engine.calculateScore(metrics)
    
    assert(score.score > 0, 'Score should be positive with income')
    assert(score.score <= 100, 'Score should not exceed 100')
  })

  runTest('should determine status with no data', () => {
    const registry = new RuleRegistry()
    const engine = new AnalysisEngine(registry)
    
    const metrics = { income: 0, savings: 0 }
    const score = { score: 0, label: 'Données insuffisantes' }
    const { status, trajectoryLabel } = engine.determineStatus(metrics, score)
    
    assertEqual(status, 'no_data', 'Status should be no_data')
    assert(trajectoryLabel.includes('insuffisantes'), 'Trajectory should indicate insufficient data')
  })

  runTest('should determine status with excellent score', () => {
    const registry = new RuleRegistry()
    const engine = new AnalysisEngine(registry)
    
    const metrics = { income: 2000, savings: 500 }
    const score = { score: 95, label: 'Excellent' }
    const { status, trajectoryLabel } = engine.determineStatus(metrics, score)
    
    assertEqual(status, 'excellent', 'Status should be excellent')
    assert(trajectoryLabel.includes('Excellente'), 'Trajectory should indicate excellent')
  })

  runTest('should determine status with critical score', () => {
    const registry = new RuleRegistry()
    const engine = new AnalysisEngine(registry)
    
    const metrics = { income: 2000, savings: -100 }
    const score = { score: 30, label: 'Critique' }
    const { status, trajectoryLabel } = engine.determineStatus(metrics, score)
    
    assertEqual(status, 'critical', 'Status should be critical')
    assert(trajectoryLabel.includes('critique'), 'Trajectory should indicate critical')
  })

  runTest('should build judgment', () => {
    const registry = new RuleRegistry()
    const engine = new AnalysisEngine(registry)
    
    const metrics = { income: 2000, fixedExpenses: 800, variableExpenses: 400, totalExpenses: 1200, savings: 800, debtRate: 10 }
    const data = {
      debts: { debts: [] },
      goals: { goals: [], primaryGoal: null }
    }
    
    const judgment = engine.buildJudgment(metrics, data)
    
    assert(judgment !== null, 'Judgment should be built')
    assert(judgment.diagnostic.length > 0, 'Judgment should have diagnostic')
    assert(judgment.impact.length > 0, 'Judgment should have impact')
    assert(judgment.action.length > 0, 'Judgment should have action')
    assert(judgment.why.length > 0, 'Judgment should have why')
  })

  runTest('should build debt strategy with no debts', () => {
    const registry = new RuleRegistry()
    const engine = new AnalysisEngine(registry)
    
    const metrics = { income: 2000, savings: 800, debtTotal: 0, debtMonthlyTotal: 0, debtRate: 0 }
    const data = { debts: { debts: [] } }
    
    const strategy = engine.buildDebtStrategy(metrics, data)
    
    assertEqual(strategy.total, 0, 'Total should be 0')
    assertEqual(strategy.monthlyTotal, 0, 'Monthly total should be 0')
    assertEqual(strategy.rate, 0, 'Rate should be 0')
    assert(strategy.recommendation.length > 0, 'Should have recommendation')
  })

  runTest('should build debt strategy with debts', () => {
    const registry = new RuleRegistry()
    const engine = new AnalysisEngine(registry)
    
    const metrics = { income: 2000, savings: 800, debtTotal: 5000, debtMonthlyTotal: 200, debtRate: 10 }
    const data = {
      debts: {
        debts: [
          { name: 'Crédit voiture', remaining: 5000, monthly: 200 }
        ]
      }
    }
    
    const strategy = engine.buildDebtStrategy(metrics, data)
    
    assertEqual(strategy.total, 5000, 'Total should match')
    assertEqual(strategy.monthlyTotal, 200, 'Monthly total should match')
    assertEqual(strategy.rate, 10, 'Rate should match')
    assert(strategy.mainDebt !== null, 'Should have main debt')
  })

  runTest('should build goals analysis', () => {
    const registry = new RuleRegistry()
    const engine = new AnalysisEngine(registry)
    
    const metrics = { income: 2000, savings: 800 }
    const data = {
      goals: {
        goals: [
          { name: 'Vacances', target: 2000, current: 500 },
          { name: 'Voiture', target: 10000, current: 2000 }
        ],
        primaryGoal: { name: 'Vacances', target: 2000, current: 500 }
      }
    }
    
    const analysis = engine.buildGoalsAnalysis(metrics, data)
    
    assertEqual(analysis.total, 2, 'Should have 2 goals')
    assert(analysis.primaryGoal !== null, 'Should have primary goal')
    assertEqual(analysis.projections.length, 2, 'Should have 2 projections')
  })

  runTest('should build goals analysis with no goals', () => {
    const registry = new RuleRegistry()
    const engine = new AnalysisEngine(registry)
    
    const metrics = { income: 2000, savings: 800 }
    const data = {
      goals: {
        goals: [],
        primaryGoal: null
      }
    }
    
    const analysis = engine.buildGoalsAnalysis(metrics, data)
    
    assertEqual(analysis.total, 0, 'Should have 0 goals')
    assertEqual(analysis.primaryGoal, null, 'Should have no primary goal')
    assertEqual(analysis.projections.length, 0, 'Should have 0 projections')
  })

  runTest('should build rule context', () => {
    const registry = new RuleRegistry()
    const engine = new AnalysisEngine(registry)
    
    const metrics = { income: 2000, savings: 800 }
    const data = {
      debts: { debts: [] },
      goals: { goals: [], primaryGoal: null }
    }
    const judgment = { diagnostic: 'Test', impact: 'Test', action: 'Test', why: 'Test' }
    
    const context = engine.buildRuleContext(metrics, data, judgment)
    
    assertEqual(context.income, 2000, 'Context should have income')
    assertEqual(context.savings, 800, 'Context should have savings')
    assert(context.judgment !== null, 'Context should have judgment')
    assert(context.hasData === true, 'Context should indicate has data')
  })

  runTest('should analyze data and return report', () => {
    const registry = new RuleRegistry()
    const engine = new AnalysisEngine(registry)
    
    // Register a test rule
    registry.registerRule('alerts', {
      id: 'test_alert',
      category: 'alerts',
      condition: (ctx) => ctx.income > 0,
      message: (ctx) => 'Test alert',
      priority: 50
    })
    
    const data = {
      budget: {
        income: 2000,
        metrics: {
          fixed: 800,
          variable: 400,
          expenses: 1200,
          savings: 800
        }
      },
      debts: { debts: [] },
      goals: { goals: [], primaryGoal: null },
      historical: { avgIncome: 1800, avgExpenses: 1100 }
    }
    
    const report = engine.analyze(data)
    
    assert(report instanceof AssistantReport, 'Should return AssistantReport')
    assert(report.score >= 0, 'Should have score')
    assert(report.scoreLabel.length > 0, 'Should have score label')
    assert(report.status.length > 0, 'Should have status')
  })

  runTest('should handle analysis errors gracefully', () => {
    const registry = new RuleRegistry()
    const engine = new AnalysisEngine(registry)
    
    const invalidData = null
    
    const report = engine.analyze(invalidData)
    
    assert(report instanceof AssistantReport, 'Should return AssistantReport even on error')
    assertEqual(report.score, 0, 'Should have score 0 on error')
  })

  runTest('should use custom rule registry', () => {
    const customRegistry = new RuleRegistry()
    const engine = new AnalysisEngine(customRegistry)
    
    const data = {
      budget: {
        income: 2000,
        metrics: { fixed: 800, variable: 400, expenses: 1200, savings: 800 }
      },
      debts: { debts: [] },
      goals: { goals: [], primaryGoal: null },
      historical: { avgIncome: 1800, avgExpenses: 1100 }
    }
    
    const report = engine.analyze(data)
    
    assert(report instanceof AssistantReport, 'Should use custom registry')
  })

  runTest('should calculate historical trends', () => {
    const registry = new RuleRegistry()
    const engine = new AnalysisEngine(registry)
    
    const data = {
      budget: {
        income: 2000,
        metrics: { fixed: 800, variable: 400, expenses: 1200, savings: 800 }
      },
      debts: { debts: [] },
      goals: { goals: [], primaryGoal: null },
      historical: {
        avgIncome: 1800,
        avgExpenses: 1100
      }
    }
    
    const metrics = engine.calculateMetrics(data)
    
    assert(metrics.incomeTrendPct !== undefined, 'Should calculate income trend')
    assert(metrics.expenseInflationRate !== undefined, 'Should calculate expense inflation')
  })

  runTest('should handle zero income in metrics', () => {
    const registry = new RuleRegistry()
    const engine = new AnalysisEngine(registry)
    
    const data = {
      budget: {
        income: 0,
        metrics: { fixed: 0, variable: 0, expenses: 0, savings: 0 }
      },
      debts: { debts: [] },
      goals: { goals: [], primaryGoal: null },
      historical: { avgIncome: 0, avgExpenses: 0 }
    }
    
    const metrics = engine.calculateMetrics(data)
    
    assertEqual(metrics.income, 0, 'Income should be 0')
    assertEqual(metrics.chargesRate, 0, 'Charges rate should be 0')
    assertEqual(metrics.savingsRate, 0, 'Savings rate should be 0')
  })

  console.log('\n=== All AnalysisEngine tests passed ===\n')
}

// Run tests if this file is executed directly
if (typeof window === 'undefined' || typeof global !== 'undefined') {
  runAnalysisEngineTests()
}
