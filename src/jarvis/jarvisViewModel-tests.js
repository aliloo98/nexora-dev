/**
 * Jarvis View Model Tests
 *
 * Tests the pure transformation from J4 snapshot to Jarvis view model.
 */

import assert from 'node:assert/strict'
import { createJarvisViewModel } from './jarvisViewModel.js'

console.log('🧪 Running Jarvis View Model Tests')

function testHealthyState() {
  const snapshot = {
    health: { status: 'strong', cashflow: 'positive', score: 85, label: 'Solide' },
    priorities: [],
    forecast: { finalBalance: 500, lowestBalance: 200, overdraftRisk: 'NONE' },
    risks: [],
    opportunities: [],
    goal: null,
    debt: null,
    cashflow: { income: 3000, expenses: 2000, savings: 1000, savingsRate: 33 },
    dataQuality: { isComplete: true, hasIncome: true, hasExpenses: true, hasGoal: false, hasDebt: false, issues: [] },
    trends: { available: false, reason: 'insufficient_history' },
    evidence: {}
  }

  const vm = createJarvisViewModel(snapshot)

  assert.strictEqual(vm.visualState, 'strong', 'Visual state should be strong')
  assert.strictEqual(vm.capabilities.core, true, 'Core should be available')
  assert.strictEqual(vm.priority, null, 'No priority when healthy')
  assert.strictEqual(vm.trajectory.available, true, 'Trajectory should be available')
}

function testCriticalDeficit() {
  const snapshot = {
    health: { status: 'critical', cashflow: 'negative', score: 20, label: 'Critique' },
    priorities: [
      { id: 'fix_deficit', rank: 1, action: 'Réduire les dépenses', domain: 'cashflow', severity: 'critical' }
    ],
    forecast: { finalBalance: -300, lowestBalance: -300, overdraftRisk: 'HIGH' },
    risks: [
      { id: 'deficit', domain: 'cashflow', severity: 'critical', evidence: {} }
    ],
    opportunities: [],
    goal: null,
    debt: null,
    cashflow: { income: 2000, expenses: 2300, savings: -300, savingsRate: -15 },
    dataQuality: { isComplete: true, hasIncome: true, hasExpenses: true, hasGoal: false, hasDebt: false, issues: [] },
    trends: { available: false, reason: 'insufficient_history' },
    evidence: {}
  }

  const vm = createJarvisViewModel(snapshot)

  assert.strictEqual(vm.visualState, 'critical', 'Visual state should be critical')
  assert.strictEqual(vm.priority.id, 'fix_deficit', 'Priority should be fix_deficit')
  assert.strictEqual(vm.priorityCta.target, 'saisie', 'CTA target should be saisie')
  assert.strictEqual(vm.trajectory.cashflowPositive, false, 'Cashflow should be negative')
}

function testNoIncome() {
  const snapshot = {
    health: { status: 'no_income', cashflow: 'negative', score: 0, label: 'Inconnu' },
    priorities: [
      { id: 'secure_income', rank: 2, action: 'Enregistrer des revenus', domain: 'income', severity: 'high' }
    ],
    forecast: { finalBalance: 0, lowestBalance: 0, overdraftRisk: 'NONE' },
    risks: [
      { id: 'no_income', domain: 'income', severity: 'high', evidence: {} }
    ],
    opportunities: [],
    goal: null,
    debt: null,
    cashflow: { income: 0, expenses: 0, savings: 0, savingsRate: 0 },
    dataQuality: { isComplete: false, hasIncome: false, hasExpenses: false, hasGoal: false, hasDebt: false, issues: [{ code: 'NO_INCOME', severity: 'high' }] },
    trends: { available: false, reason: 'insufficient_history' },
    evidence: {}
  }

  const vm = createJarvisViewModel(snapshot)

  assert.strictEqual(vm.visualState, 'no_income', 'Visual state should be no_income')
  assert.strictEqual(vm.headline, 'J\'ai besoin de revenus pour établir une analyse.', 'Headline should match no_income')
  assert.strictEqual(vm.priority.id, 'secure_income', 'Priority should be secure_income')
  assert.strictEqual(vm.dataQuality.isComplete, false, 'Data quality should be incomplete')
}

function testInsufficientHistory() {
  const snapshot = {
    health: { status: 'balanced', cashflow: 'positive', score: 60, label: 'Équilibrée' },
    priorities: [],
    forecast: { finalBalance: 200, lowestBalance: 100, overdraftRisk: 'NONE' },
    risks: [],
    opportunities: [
      { id: 'positive_cashflow', title: 'Marge disponible', description: 'Tu termineras le mois avec une marge.', estimatedGain: 200 }
    ],
    goal: null,
    debt: null,
    cashflow: { income: 3000, expenses: 2000, savings: 1000, savingsRate: 33 },
    dataQuality: { isComplete: false, hasIncome: true, hasExpenses: true, hasGoal: false, hasDebt: false, issues: [{ code: 'INSUFFICIENT_HISTORY', severity: 'medium' }] },
    trends: { available: false, reason: 'insufficient_history' },
    evidence: {}
  }

  const vm = createJarvisViewModel(snapshot)

  assert.strictEqual(vm.capabilities.core, true, 'Core should be available despite history issue')
  assert.strictEqual(vm.capabilities.trends, false, 'Trends should not be available')
  assert.strictEqual(vm.trajectory.trendsAvailable, false, 'Trajectory should show trends unavailable')
  assert.strictEqual(vm.dataQuality.isComplete, false, 'Data quality should be incomplete due to history')
}

function testTrueIncompleteCoreData() {
  const snapshot = {
    health: { status: 'no_income', cashflow: 'negative', score: 0, label: 'Inconnu' },
    priorities: [],
    forecast: { finalBalance: 0, lowestBalance: 0, overdraftRisk: 'NONE' },
    risks: [],
    opportunities: [],
    goal: null,
    debt: null,
    cashflow: { income: 0, expenses: 0, savings: 0, savingsRate: 0 },
    dataQuality: { isComplete: false, hasIncome: false, hasExpenses: false, hasGoal: false, hasDebt: false, issues: [{ code: 'NO_INCOME', severity: 'high' }] },
    trends: { available: false, reason: 'insufficient_history' },
    evidence: {}
  }

  const vm = createJarvisViewModel(snapshot)

  assert.strictEqual(vm.capabilities.core, false, 'Core should not be available')
  assert.strictEqual(vm.dataQuality.isComplete, false, 'Data quality should be incomplete')
}

function testRiskMapping() {
  const snapshot = {
    health: { status: 'critical', cashflow: 'negative', score: 20, label: 'Critique' },
    priorities: [],
    forecast: { finalBalance: -300, lowestBalance: -300, overdraftRisk: 'HIGH' },
    risks: [
      { id: 'deficit', domain: 'cashflow', severity: 'critical', evidence: {} },
      { id: 'overdraft_risk', domain: 'cashflow', severity: 'high', evidence: {} }
    ],
    opportunities: [],
    goal: null,
    debt: null,
    cashflow: { income: 2000, expenses: 2300, savings: -300, savingsRate: -15 },
    dataQuality: { isComplete: true, hasIncome: true, hasExpenses: true, hasGoal: false, hasDebt: false, issues: [] },
    trends: { available: false, reason: 'insufficient_history' },
    evidence: {}
  }

  const vm = createJarvisViewModel(snapshot)

  assert.strictEqual(vm.risks.length, 2, 'Should have 2 risks')
  assert.strictEqual(vm.risks[0].id, 'deficit', 'First risk should be deficit')
  assert.strictEqual(vm.risks[0].label, 'Déficit mensuel', 'Risk label should match')
  assert.strictEqual(vm.risks[0].severity, 'critical', 'Risk severity should match')
  assert.strictEqual(vm.risks[0].domain, 'cashflow', 'Risk domain should match')
}

function testOpportunityMapping() {
  const snapshot = {
    health: { status: 'strong', cashflow: 'positive', score: 85, label: 'Solide' },
    priorities: [],
    forecast: { finalBalance: 500, lowestBalance: 200, overdraftRisk: 'NONE' },
    risks: [],
    opportunities: [
      { id: 'positive_cashflow', title: 'Marge disponible', description: 'Tu termineras le mois avec une marge.', estimatedGain: 500 }
    ],
    goal: null,
    debt: null,
    cashflow: { income: 3000, expenses: 2000, savings: 1000, savingsRate: 33 },
    dataQuality: { isComplete: true, hasIncome: true, hasExpenses: true, hasGoal: false, hasDebt: false, issues: [] },
    trends: { available: false, reason: 'insufficient_history' },
    evidence: {}
  }

  const vm = createJarvisViewModel(snapshot)

  assert.strictEqual(vm.opportunities.length, 1, 'Should have 1 opportunity')
  assert.strictEqual(vm.opportunities[0].id, 'positive_cashflow', 'Opportunity ID should match')
  assert.strictEqual(vm.opportunities[0].title, 'Marge disponible', 'Opportunity title should match')
  assert.strictEqual(vm.opportunities[0].amount, 500, 'Opportunity amount should match')
}

function testGoalMapping() {
  const snapshot = {
    health: { status: 'strong', cashflow: 'positive', score: 85, label: 'Solide' },
    priorities: [],
    forecast: { finalBalance: 500, lowestBalance: 200, overdraftRisk: 'NONE' },
    risks: [],
    opportunities: [],
    goal: {
      id: 'g1',
      target: 10000,
      current: 7500,
      progress: 75,
      remaining: 2500,
      isPrimary: true,
      targetDate: '2026-12-31',
      pace: 'Normal'
    },
    debt: null,
    cashflow: { income: 3000, expenses: 2000, savings: 1000, savingsRate: 33 },
    dataQuality: { isComplete: true, hasIncome: true, hasExpenses: true, hasGoal: true, hasDebt: false, issues: [] },
    trends: { available: false, reason: 'insufficient_history' },
    evidence: {}
  }

  const vm = createJarvisViewModel(snapshot)

  assert.ok(vm.goal, 'Goal should exist')
  assert.strictEqual(vm.goal.id, 'g1', 'Goal ID should match')
  assert.strictEqual(vm.goal.progress, 75, 'Goal progress should match')
  assert.strictEqual(vm.goal.remaining, 2500, 'Goal remaining should match')
  assert.strictEqual(vm.goal.pace, 'Normal', 'Goal pace should match')
}

function testDebtMapping() {
  const snapshot = {
    health: { status: 'fragile', cashflow: 'positive', score: 45, label: 'Fragile' },
    priorities: [],
    forecast: { finalBalance: 100, lowestBalance: 50, overdraftRisk: 'NONE' },
    risks: [],
    opportunities: [],
    goal: null,
    debt: {
      total: 7000,
      monthlyTotal: 230,
      payoffMonths: 36,
      totalInterest: 1500
    },
    cashflow: { income: 3000, expenses: 2000, savings: 1000, savingsRate: 33 },
    dataQuality: { isComplete: true, hasIncome: true, hasExpenses: true, hasGoal: false, hasDebt: true, issues: [] },
    trends: { available: false, reason: 'insufficient_history' },
    evidence: {}
  }

  const vm = createJarvisViewModel(snapshot)

  assert.ok(vm.debt, 'Debt should exist')
  assert.strictEqual(vm.debt.total, 7000, 'Debt total should match')
  assert.strictEqual(vm.debt.monthlyTotal, 230, 'Debt monthly total should match')
  assert.strictEqual(vm.debt.payoffMonths, 36, 'Debt payoff months should match')
}

function testDataQualityCodeMapping() {
  const snapshot = {
    health: { status: 'no_income', cashflow: 'negative', score: 0, label: 'Inconnu' },
    priorities: [],
    forecast: { finalBalance: 0, lowestBalance: 0, overdraftRisk: 'NONE' },
    risks: [],
    opportunities: [],
    goal: null,
    debt: null,
    cashflow: { income: 0, expenses: 0, savings: 0, savingsRate: 0 },
    dataQuality: {
      isComplete: false,
      hasIncome: false,
      hasExpenses: false,
      hasGoal: false,
      hasDebt: false,
      issues: [
        { code: 'NO_INCOME', severity: 'high' },
        { code: 'INSUFFICIENT_HISTORY', severity: 'medium' }
      ]
    },
    trends: { available: false, reason: 'insufficient_history' },
    evidence: {}
  }

  const vm = createJarvisViewModel(snapshot)

  assert.strictEqual(vm.dataQuality.issues.length, 2, 'Should have 2 issues')
  assert.strictEqual(vm.dataQuality.issues[0].code, 'NO_INCOME', 'Issue code should be preserved')
  assert.strictEqual(vm.dataQuality.issues[0].label, 'J\'ai besoin de revenus pour établir une analyse.', 'Issue label should be mapped')
  assert.strictEqual(vm.dataQuality.issues[1].code, 'INSUFFICIENT_HISTORY', 'Second issue code should be preserved')
}

function testNoUndefinedFields() {
  const snapshot = {
    health: { status: 'unknown', cashflow: 'negative', score: 0, label: 'Inconnu' },
    priorities: [],
    forecast: { finalBalance: 0, lowestBalance: 0, overdraftRisk: 'NONE' },
    risks: [],
    opportunities: [],
    goal: null,
    debt: null,
    cashflow: { income: 0, expenses: 0, savings: 0, savingsRate: 0 },
    dataQuality: { isComplete: false, hasIncome: false, hasExpenses: false, hasGoal: false, hasDebt: false, issues: [] },
    trends: { available: false, reason: 'insufficient_history' },
    evidence: {}
  }

  const vm = createJarvisViewModel(snapshot)

  // Check no undefined in critical fields
  assert.ok(vm.visualState !== undefined, 'visualState should not be undefined')
  assert.ok(vm.statusLabel !== undefined, 'statusLabel should not be undefined')
  assert.ok(vm.headline !== undefined, 'headline should not be undefined')
  assert.ok(vm.priority !== undefined, 'priority should not be undefined')
  assert.ok(vm.priorityCta !== undefined, 'priorityCta should not be undefined')
  assert.ok(vm.trajectory !== undefined, 'trajectory should not be undefined')
  assert.ok(vm.risks !== undefined, 'risks should not be undefined')
  assert.ok(vm.opportunities !== undefined, 'opportunities should not be undefined')
  assert.ok(vm.goal !== undefined, 'goal should not be undefined')
  assert.ok(vm.debt !== undefined, 'debt should not be undefined')
  assert.ok(vm.cashflow !== undefined, 'cashflow should not be undefined')
  assert.ok(vm.dataQuality !== undefined, 'dataQuality should not be undefined')
  assert.ok(vm.capabilities !== undefined, 'capabilities should not be undefined')
}

function testNoNaNOrInfinity() {
  const snapshot = {
    health: { status: 'strong', cashflow: 'positive', score: 85, label: 'Solide' },
    priorities: [],
    forecast: { finalBalance: 500, lowestBalance: 200, overdraftRisk: 'NONE' },
    risks: [],
    opportunities: [],
    goal: null,
    debt: null,
    cashflow: { income: 3000, expenses: 2000, savings: 1000, savingsRate: 33 },
    dataQuality: { isComplete: true, hasIncome: true, hasExpenses: true, hasGoal: false, hasDebt: false, issues: [] },
    trends: { available: false, reason: 'insufficient_history' },
    evidence: {}
  }

  const vm = createJarvisViewModel(snapshot)

  // Check trajectory values
  assert.ok(!isNaN(vm.trajectory.finalBalance), 'finalBalance should not be NaN')
  assert.ok(!isNaN(vm.trajectory.lowestBalance), 'lowestBalance should not be NaN')
  assert.ok(vm.trajectory.finalBalance !== Infinity, 'finalBalance should not be Infinity')
  assert.ok(vm.trajectory.finalBalance !== -Infinity, 'finalBalance should not be -Infinity')
}

// Run tests
let passed = 0
let total = 0

function runTest(fn, name) {
  total++
  try {
    fn()
    passed++
    console.log(`✓ ${name}: PASS`)
  } catch (e) {
    console.log(`✗ ${name}: FAIL - ${e.message}`)
  }
}

runTest(testHealthyState, 'Healthy state')
runTest(testCriticalDeficit, 'Critical deficit')
runTest(testNoIncome, 'No income')
runTest(testInsufficientHistory, 'Insufficient history')
runTest(testTrueIncompleteCoreData, 'True incomplete core data')
runTest(testRiskMapping, 'Risk mapping')
runTest(testOpportunityMapping, 'Opportunity mapping')
runTest(testGoalMapping, 'Goal mapping')
runTest(testDebtMapping, 'Debt mapping')
runTest(testDataQualityCodeMapping, 'Data quality code mapping')
runTest(testNoUndefinedFields, 'No undefined fields')
runTest(testNoNaNOrInfinity, 'No NaN or Infinity')

console.log(`\nJarvis View Model Tests: ${passed}/${total} passed`)
