/**
 * Intelligence Engine V1 - Tests Matrix
 *
 * Scénarios de test pour le moteur d'intelligence financière
 */

import assert from 'node:assert/strict'
import { buildIntelligenceSnapshot } from './IntelligenceEngine.js'

console.log('🧪 Running Intelligence Engine Tests')

// SCÉNARIO A — Situation saine
function testHealthyScenario() {
  const input = {
    metrics: {
      income: 3000,
      fixedExpenses: 1200,
      variableExpenses: 800,
      plannedExpenses: 2000,
      paidExpenses: 1500,
      savingsRate: 33
    },
    history: [
      { income: 2900, expenses: 1950 },
      { income: 2850, expenses: 1900 }
    ],
    goals: [{ id: 'g1', target: 10000, current: 6000, isPrimary: true }],
    debts: [],
    billSchedules: [],
    dataAvailability: { goals: 'known', debts: 'known' }
  }

  const snapshot = buildIntelligenceSnapshot(input)

  assert.strictEqual(snapshot.health.status, 'strong', 'Health should be strong')
  assert.strictEqual(snapshot.health.cashflow, 'positive', 'Health cashflow should be positive')
  assert.strictEqual(snapshot.health.pressure, 'medium', 'Health pressure should be medium (40% fixed charges)')
  assert.strictEqual(snapshot.risks.length, 0, 'No risks in healthy scenario')
  assert.ok(snapshot.opportunities.length > 0, 'Should have opportunities')
  assert.strictEqual(snapshot.dataQuality.level, 'high', 'Data quality should be high')
}

// SCÉNARIO B — Déficit
function testDeficitScenario() {
  const input = {
    metrics: {
      income: 2000,
      fixedExpenses: 1500,
      variableExpenses: 800,
      plannedExpenses: 2300,
      paidExpenses: 1200,
      savingsRate: -15
    },
    history: [],
    goals: [],
    debts: [],
    billSchedules: [],
    dataAvailability: { goals: 'known', debts: 'known' }
  }

  const snapshot = buildIntelligenceSnapshot(input)

  assert.strictEqual(snapshot.health.cashflow, 'negative', 'Cashflow should be negative')
  assert.ok(snapshot.risks.some(r => r.id === 'deficit'), 'Should detect deficit risk')
  assert.strictEqual(snapshot.cashflow.projected < 0, true, 'Cashflow should be negative')
  assert.strictEqual(snapshot.priorities[0].id, 'fix_deficit', 'First priority should be fix deficit')
}

// SCÉNARIO C — Revenu absent
function testNoIncomeScenario() {
  const input = {
    metrics: {
      income: 0,
      fixedExpenses: 0,
      variableExpenses: 0,
      plannedExpenses: 0,
      paidExpenses: 0
    },
    history: [],
    goals: [],
    debts: [],
    billSchedules: [],
    dataAvailability: { goals: 'known', debts: 'known' }
  }

  const snapshot = buildIntelligenceSnapshot(input)

  assert.strictEqual(snapshot.health.status, 'no_income', 'Health should be no_income')
  assert.ok(snapshot.risks.some(r => r.id === 'no_income'), 'Should detect no income risk')
  assert.strictEqual(snapshot.dataQuality.hasIncome, false, 'Data quality should flag no income')
  assert.strictEqual(snapshot.priorities[0].id, 'secure_income', 'First priority should be secure income')
}

// SCÉNARIO D — Charges fixes élevées (fragile)
function testLowBufferScenario() {
  const input = {
    metrics: {
      income: 2500,
      fixedExpenses: 1800,
      variableExpenses: 600,
      plannedExpenses: 2400,
      paidExpenses: 1200,
      savingsRate: 4
    },
    history: [],
    goals: [],
    debts: [],
    billSchedules: [],
    dataAvailability: { goals: 'known', debts: 'known' }
  }

  const snapshot = buildIntelligenceSnapshot(input)

  assert.strictEqual(snapshot.health.status, 'fragile', 'Health should be fragile (72% fixed charges)')
  assert.strictEqual(snapshot.cashflow.projected > 0, true, 'Cashflow should be positive but low')
  assert.strictEqual(snapshot.savings.rate < 10, true, 'Savings rate should be low')
}

// SCÉNARIO E — Charges fixes élevées
function testHighFixedChargesScenario() {
  const input = {
    metrics: {
      income: 2000,
      fixedExpenses: 1200,
      variableExpenses: 300,
      plannedExpenses: 1500,
      paidExpenses: 800,
      savingsRate: 25
    },
    history: [],
    goals: [],
    debts: [],
    billSchedules: [],
    dataAvailability: { goals: 'known', debts: 'known' }
  }

  const snapshot = buildIntelligenceSnapshot(input)

  // high_fixed_charges removed to avoid duplication with financialInsightEngine
  assert.strictEqual(snapshot.risks.length, 0, 'No high_fixed_charges risk (removed to avoid duplication)')
}

// SCÉNARIO F — Objectif
function testGoalScenario() {
  const input = {
    metrics: {
      income: 3000,
      fixedExpenses: 1200,
      variableExpenses: 800,
      plannedExpenses: 2000,
      paidExpenses: 1000,
      savingsRate: 33
    },
    history: [],
    goals: [
      {
        id: 'g1',
        target: 10000,
        current: 7500,
        isPrimary: true,
        targetDate: '2026-12-31'
      }
    ],
    debts: [],
    billSchedules: [],
    dataAvailability: { goals: 'known', debts: 'known' }
  }

  const snapshot = buildIntelligenceSnapshot(input, { referenceDate: '2026-08-13' })

  assert.ok(snapshot.goal, 'Should have goal analysis')
  assert.strictEqual(snapshot.goal.progress, 75, 'Goal progress should be 75%')
  assert.strictEqual(snapshot.goal.remaining, 2500, 'Goal remaining should be 2500')
}

// SCÉNARIO G — Dette
function testDebtScenario() {
  const input = {
    metrics: {
      income: 3000,
      fixedExpenses: 1200,
      variableExpenses: 800,
      plannedExpenses: 2000,
      paidExpenses: 1000,
      savingsRate: 33
    },
    history: [],
    goals: [],
    debts: [
      { id: 'd1', balance: 5000, ratePct: 15, minPayment: 150 },
      { id: 'd2', balance: 2000, ratePct: 8, minPayment: 80 }
    ],
    billSchedules: [],
    dataAvailability: { goals: 'known', debts: 'known' }
  }

  const snapshot = buildIntelligenceSnapshot(input)

  assert.ok(snapshot.debt, 'Should have debt analysis')
  assert.strictEqual(snapshot.debt.total, 7000, 'Total debt should be 7000')
  assert.strictEqual(snapshot.debt.monthlyTotal, 230, 'Monthly total should be 230')
  assert.ok(snapshot.debt.payoffMonths > 0, 'Should calculate payoff months')
}

// SCÉNARIO H — Données vides
function testEmptyDataScenario() {
  const input = {
    metrics: {},
    history: [],
    goals: [],
    debts: [],
    billSchedules: [],
    dataAvailability: {}
  }

  const snapshot = buildIntelligenceSnapshot(input)

  assert.ok(!isNaN(snapshot.cashflow.income), 'Income should not be NaN')
  assert.ok(!isNaN(snapshot.cashflow.expenses), 'Expenses should not be NaN')
  assert.ok(!isNaN(snapshot.cashflow.projected), 'Projected should not be NaN')
  assert.strictEqual(snapshot.dataQuality.level, 'low', 'Data quality should be low')
  assert.strictEqual(snapshot.dataQuality.hasIncome, false, 'Should flag no income')
}

// SCÉNARIO I — Données partielles
function testPartialDataScenario() {
  const input = {
    metrics: {
      income: 2500,
      fixedExpenses: 0,
      variableExpenses: 0,
      plannedExpenses: 0,
      paidExpenses: 0
    },
    history: [],
    goals: [],
    debts: [],
    billSchedules: [],
    dataAvailability: { goals: 'known', debts: 'known' }
  }

  const snapshot = buildIntelligenceSnapshot(input)

  assert.strictEqual(snapshot.dataQuality.hasIncome, true, 'Should have income')
  assert.strictEqual(snapshot.dataQuality.hasExpenses, false, 'Should not have expenses')
  assert.ok(snapshot.trends.available === false, 'Trends should not be available')
}

// SCÉNARIO J — Historique insuffisant
function testInsufficientHistoryScenario() {
  const input = {
    metrics: {
      income: 3000,
      fixedExpenses: 1200,
      variableExpenses: 800,
      plannedExpenses: 2000,
      paidExpenses: 1000,
      savingsRate: 33
    },
    history: [{ income: 2900, expenses: 1950 }],
    goals: [],
    debts: [],
    billSchedules: [],
    dataAvailability: { goals: 'known', debts: 'known' }
  }

  const snapshot = buildIntelligenceSnapshot(input)

  assert.strictEqual(snapshot.trends.available, false, 'Trends should not be available')
  assert.strictEqual(snapshot.trends.reason, 'insufficient_history', 'Reason should be insufficient history')
}

// TEST D'INVARIANTS
function testInvariants() {
  const input = {
    metrics: {
      income: 3000,
      fixedExpenses: 1200,
      variableExpenses: 800,
      plannedExpenses: 2000,
      paidExpenses: 1000,
      savingsRate: 33
    },
    history: [],
    goals: [],
    debts: [],
    billSchedules: [],
    dataAvailability: { goals: 'known', debts: 'known' }
  }

  const snapshot = buildIntelligenceSnapshot(input)

  // Recursive check for NaN
  function checkNoNaN(obj, path = '') {
    for (const key in obj) {
      const value = obj[key]
      const currentPath = path ? `${path}.${key}` : key
      if (typeof value === 'number') {
        assert.ok(!isNaN(value), `${currentPath} should not be NaN`)
      } else if (typeof value === 'object' && value !== null) {
        checkNoNaN(value, currentPath)
      }
    }
  }
  checkNoNaN(snapshot)

  // Recursive check for Infinity
  function checkNoInfinity(obj, path = '') {
    for (const key in obj) {
      const value = obj[key]
      const currentPath = path ? `${path}.${key}` : key
      if (typeof value === 'number') {
        assert.ok(value !== Infinity && value !== -Infinity, `${currentPath} should not be Infinity`)
      } else if (typeof value === 'object' && value !== null) {
        checkNoInfinity(value, currentPath)
      }
    }
  }
  checkNoInfinity(snapshot)

  // Unique risk IDs
  const riskIds = snapshot.risks.map(r => r.id)
  assert.strictEqual(riskIds.length, new Set(riskIds).size, 'Risk IDs should be unique')

  // Unique priority IDs
  const priorityIds = snapshot.priorities.map(p => p.id)
  assert.strictEqual(priorityIds.length, new Set(priorityIds).size, 'Priority IDs should be unique')

  // Valid severity
  const validSeverities = ['low', 'medium', 'high', 'critical']
  snapshot.risks.forEach(r => {
    assert.ok(validSeverities.includes(r.severity), `Risk severity ${r.severity} should be valid`)
  })

  // Valid trend values
  const validTrends = ['up', 'down', 'stable', 'unavailable']
  if (snapshot.trends.available) {
    assert.ok(validTrends.includes(snapshot.trends.income), `Income trend ${snapshot.trends.income} should be valid`)
    assert.ok(validTrends.includes(snapshot.trends.expenses), `Expense trend ${snapshot.trends.expenses} should be valid`)
    assert.ok(validTrends.includes(snapshot.trends.savings), `Savings trend ${snapshot.trends.savings} should be valid`)
  }
}

// TEST D'IMMUTABILITÉ
function testImmutability() {
  const input = {
    metrics: {
      income: 3000,
      fixedExpenses: 1200,
      variableExpenses: 800,
      plannedExpenses: 2000,
      paidExpenses: 1000,
      savingsRate: 33
    },
    history: [],
    goals: [],
    debts: [],
    billSchedules: [],
    dataAvailability: { goals: 'known', debts: 'known' }
  }

  const inputCopy = JSON.parse(JSON.stringify(input))

  buildIntelligenceSnapshot(input)

  assert.deepStrictEqual(input, inputCopy, 'Input should not be mutated')
}

// TEST DÉTERMINISME
function testDeterminism() {
  const input = {
    metrics: {
      income: 3000,
      fixedExpenses: 1200,
      variableExpenses: 800,
      plannedExpenses: 2000,
      paidExpenses: 1000,
      savingsRate: 33
    },
    history: [],
    goals: [],
    debts: [],
    billSchedules: [],
    dataAvailability: { goals: 'known', debts: 'known' }
  }

  const options = { referenceDate: '2026-08-13' }

  const snapshot1 = buildIntelligenceSnapshot(input, options)
  const snapshot2 = buildIntelligenceSnapshot(input, options)

  assert.deepStrictEqual(snapshot1, snapshot2, 'Same input should produce same output')
}

// TEST CONTRADICTION GUARDS
function testContradictionGuards() {
  const input = {
    metrics: {
      income: 2000,
      fixedExpenses: 1500,
      variableExpenses: 800,
      plannedExpenses: 2300,
      paidExpenses: 1200,
      savingsRate: -15
    },
    history: [],
    goals: [],
    debts: [],
    billSchedules: [],
    dataAvailability: { goals: 'known', debts: 'known' }
  }

  const snapshot = buildIntelligenceSnapshot(input)

  // En cas de déficit, ne pas recommander d'augmenter l'épargne
  assert.strictEqual(snapshot.priorities[0].id, 'fix_deficit', 'First priority should be fix deficit')
  assert.notStrictEqual(snapshot.priorities[0].id, 'capture_opportunity', 'Should not prioritize opportunity when in deficit')
}

// TEST TRENDS AVEC HISTORIQUE VALIDE
function testTrendsScenario() {
  const input = {
    metrics: {
      income: 3000,
      plannedExpenses: 2000
    },
    history: [
      { income: 2800, expenses: 2200 },
      { income: 2900, expenses: 2100 }
    ],
    goals: [],
    debts: [],
    billSchedules: [],
    dataAvailability: { goals: 'known', debts: 'known' }
  }

  const snapshot = buildIntelligenceSnapshot(input)

  assert.strictEqual(snapshot.trends.available, true, 'Trends should be available')
  assert.strictEqual(snapshot.trends.income, 'up', 'Income should be up')
  assert.strictEqual(snapshot.trends.expenses, 'down', 'Expenses should be down')
  assert.strictEqual(snapshot.trends.savings, 'unavailable', 'Savings trend should be unavailable with current contract')
  assert.strictEqual(snapshot.trends.comparison.income.current, 3000, 'Current income should match')
  assert.strictEqual(snapshot.trends.comparison.income.previous, 2900, 'Previous income should match')
}

// TEST DATA QUALITY MATRIX - KNOWN EMPTY DEBTS
function testKnownEmptyDebts() {
  const input = {
    metrics: {
      income: 3000,
      fixedExpenses: 1200,
      variableExpenses: 800,
      plannedExpenses: 2000,
      paidExpenses: 1500,
      savingsRate: 33
    },
    history: [],
    goals: [],
    debts: [], // KNOWN EMPTY - no debts, this is GOOD
    billSchedules: [],
    dataAvailability: { goals: 'known', debts: 'known' }
  }

  const snapshot = buildIntelligenceSnapshot(input)

  assert.strictEqual(snapshot.dataQuality.hasDebt, false, 'Should have no debt')
  assert.strictEqual(snapshot.dataQuality.dataAvailability.debts, 'known', 'Debts should be known')
  const noDebtIssue = snapshot.dataQuality.issues.find(i => i.code === 'NO_DEBT_DATA')
  assert.strictEqual(noDebtIssue, undefined, 'Should NOT have NO_DEBT_DATA issue for known empty debts')
}

// TEST DATA QUALITY MATRIX - UNKNOWN DEBTS
function testUnknownDebts() {
  const input = {
    metrics: {
      income: 3000,
      fixedExpenses: 1200,
      variableExpenses: 800,
      plannedExpenses: 2000,
      paidExpenses: 1500,
      savingsRate: 33
    },
    history: [],
    goals: [],
    debts: [],
    billSchedules: [],
    dataAvailability: { goals: 'known', debts: 'unknown' } // UNKNOWN
  }

  const snapshot = buildIntelligenceSnapshot(input)

  const noDebtIssue = snapshot.dataQuality.issues.find(i => i.code === 'NO_DEBT_DATA')
  assert.ok(noDebtIssue, 'Should have NO_DEBT_DATA issue for unknown debts')
  assert.strictEqual(snapshot.dataQuality.dataAvailability.debts, 'unknown', 'Debts should be unknown')
}

// TEST DATA QUALITY MATRIX - DEBTS EXISTING
function testExistingDebts() {
  const input = {
    metrics: {
      income: 3000,
      fixedExpenses: 1200,
      variableExpenses: 800,
      plannedExpenses: 2000,
      paidExpenses: 1500,
      savingsRate: 33
    },
    history: [],
    goals: [],
    debts: [
      { id: 'd1', balance: 5000, ratePct: 15, minPayment: 150 }
    ],
    billSchedules: [],
    dataAvailability: { goals: 'known', debts: 'known' }
  }

  const snapshot = buildIntelligenceSnapshot(input)

  assert.strictEqual(snapshot.dataQuality.hasDebt, true, 'Should have debt')
  assert.strictEqual(snapshot.dataQuality.dataAvailability.debts, 'known', 'Debts should be known')
  const noDebtIssue = snapshot.dataQuality.issues.find(i => i.code === 'NO_DEBT_DATA')
  assert.strictEqual(noDebtIssue, undefined, 'Should NOT have NO_DEBT_DATA issue when debts exist')
}

// TEST HEALTH MATRIX - NO INCOME
function testHealthNoIncome() {
  const input = {
    metrics: {
      income: 0,
      fixedExpenses: 0,
      variableExpenses: 0,
      plannedExpenses: 0,
      paidExpenses: 0
    },
    history: [],
    goals: [],
    debts: [],
    billSchedules: [],
    dataAvailability: { goals: 'known', debts: 'known' }
  }

  const snapshot = buildIntelligenceSnapshot(input)

  assert.strictEqual(snapshot.health.status, 'no_income', 'Health should be no_income')
}

// TEST HEALTH MATRIX - CRITICAL
function testHealthCritical() {
  const input = {
    metrics: {
      income: 2000,
      fixedExpenses: 1500,
      variableExpenses: 800,
      plannedExpenses: 2300,
      paidExpenses: 1200,
      savingsRate: -15
    },
    history: [],
    goals: [],
    debts: [],
    billSchedules: [],
    dataAvailability: { goals: 'known', debts: 'known' }
  }

  const snapshot = buildIntelligenceSnapshot(input)

  assert.strictEqual(snapshot.health.status, 'critical', 'Health should be critical')
  assert.strictEqual(snapshot.health.cashflow, 'negative', 'Cashflow should be negative')
}

// TEST EXTENDED CONTRADICTION GUARDS - NO INCOME
function testNoIncomeContradictionGuard() {
  const input = {
    metrics: {
      income: 0,
      fixedExpenses: 0,
      variableExpenses: 0,
      plannedExpenses: 0,
      paidExpenses: 0
    },
    history: [],
    goals: [],
    debts: [],
    billSchedules: [],
    dataAvailability: { goals: 'known', debts: 'known' }
  }

  const snapshot = buildIntelligenceSnapshot(input)

  // No income - should not present opportunity as first priority
  assert.strictEqual(snapshot.priorities[0].id, 'secure_income', 'First priority should be secure income')
  assert.notStrictEqual(snapshot.priorities[0].id, 'capture_opportunity', 'Should not prioritize opportunity with no income')
}

// TEST EXTENDED CONTRADICTION GUARDS - HEALTHY SCENARIO
function testHealthyContradictionGuard() {
  const input = {
    metrics: {
      income: 3000,
      fixedExpenses: 1200,
      variableExpenses: 800,
      plannedExpenses: 2000,
      paidExpenses: 1500,
      savingsRate: 33
    },
    history: [],
    goals: [],
    debts: [],
    billSchedules: [],
    dataAvailability: { goals: 'known', debts: 'known' }
  }

  const snapshot = buildIntelligenceSnapshot(input)

  // Healthy scenario - should not have critical risk + positive opportunity contradiction
  const criticalRisk = snapshot.risks.find(r => r.severity === 'critical')
  assert.strictEqual(criticalRisk, undefined, 'Should not have critical risk in healthy scenario')
}

// Exécuter tous les tests avec compteur dynamique
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

runTest(testHealthyScenario, 'SCÉNARIO A — Situation saine')
runTest(testDeficitScenario, 'SCÉNARIO B — Déficit')
runTest(testNoIncomeScenario, 'SCÉNARIO C — Revenu absent')
runTest(testLowBufferScenario, 'SCÉNARIO D — Charges fixes élevées (fragile)')
runTest(testHighFixedChargesScenario, 'SCÉNARIO E — Charges fixes élevées')
runTest(testGoalScenario, 'SCÉNARIO F — Objectif')
runTest(testDebtScenario, 'SCÉNARIO G — Dette')
runTest(testEmptyDataScenario, 'SCÉNARIO H — Données vides')
runTest(testPartialDataScenario, 'SCÉNARIO I — Données partielles')
runTest(testInsufficientHistoryScenario, 'SCÉNARIO J — Historique insuffisant')
runTest(testInvariants, 'Invariants')
runTest(testImmutability, 'Immutability')
runTest(testDeterminism, 'Determinism')
runTest(testContradictionGuards, 'Contradiction guards')
runTest(testTrendsScenario, 'SCÉNARIO TRENDS')
runTest(testKnownEmptyDebts, 'DATA QUALITY KNOWN EMPTY DEBTS')
runTest(testUnknownDebts, 'DATA QUALITY UNKNOWN DEBTS')
runTest(testExistingDebts, 'DATA QUALITY EXISTING DEBTS')
runTest(testHealthNoIncome, 'HEALTH NO INCOME')
runTest(testHealthCritical, 'HEALTH CRITICAL')
runTest(testNoIncomeContradictionGuard, 'NO INCOME CONTRADICTION GUARD')
runTest(testHealthyContradictionGuard, 'HEALTHY CONTRADICTION GUARD')

console.log(`\n📊 Intelligence Engine Tests: ${passed}/${total} PASS`)
