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
    billSchedules: []
  }
  
  const snapshot = buildIntelligenceSnapshot(input)
  
  assert.strictEqual(snapshot.health.status, 'strong', 'Health should be strong')
  assert.strictEqual(snapshot.risks.length, 0, 'No risks in healthy scenario')
  assert.ok(snapshot.opportunities.length > 0, 'Should have opportunities')
  assert.strictEqual(snapshot.dataQuality.level, 'high', 'Data quality should be high')
  console.log('✓ SCÉNARIO A — Situation saine: PASS')
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
    billSchedules: []
  }
  
  const snapshot = buildIntelligenceSnapshot(input)
  
  assert.strictEqual(snapshot.health.cashflow, 'negative', 'Cashflow should be negative')
  assert.ok(snapshot.risks.some(r => r.id === 'deficit'), 'Should detect deficit risk')
  assert.strictEqual(snapshot.cashflow.projected < 0, true, 'Cashflow should be negative')
  assert.strictEqual(snapshot.priorities[0].id, 'fix_deficit', 'First priority should be fix deficit')
  console.log('✓ SCÉNARIO B — Déficit: PASS')
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
    billSchedules: []
  }
  
  const snapshot = buildIntelligenceSnapshot(input)
  
  assert.strictEqual(snapshot.health.status, 'no_income', 'Health should be no_income')
  assert.ok(snapshot.risks.some(r => r.id === 'no_income'), 'Should detect no income risk')
  assert.strictEqual(snapshot.dataQuality.hasIncome, false, 'Data quality should flag no income')
  assert.strictEqual(snapshot.priorities[0].id, 'secure_income', 'First priority should be secure income')
  console.log('✓ SCÉNARIO C — Revenu absent: PASS')
}

// SCÉNARIO D — Réserve faible
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
    billSchedules: []
  }
  
  const snapshot = buildIntelligenceSnapshot(input)
  
  assert.strictEqual(snapshot.health.status, 'balanced', 'Health should be balanced')
  assert.strictEqual(snapshot.cashflow.projected > 0, true, 'Cashflow should be positive but low')
  assert.strictEqual(snapshot.savings.rate < 10, true, 'Savings rate should be low')
  console.log('✓ SCÉNARIO D — Réserve faible: PASS')
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
    billSchedules: []
  }
  
  const snapshot = buildIntelligenceSnapshot(input)
  
  assert.ok(snapshot.risks.some(r => r.id === 'high_fixed_charges'), 'Should detect high fixed charges')
  const highChargesRisk = snapshot.risks.find(r => r.id === 'high_fixed_charges')
  assert.ok(highChargesRisk.evidence.ratio > 50, 'Fixed charges ratio should be > 50%')
  console.log('✓ SCÉNARIO E — Charges fixes élevées: PASS')
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
    billSchedules: []
  }
  
  const snapshot = buildIntelligenceSnapshot(input, { referenceDate: '2026-08-13' })
  
  assert.ok(snapshot.goal, 'Should have goal analysis')
  assert.strictEqual(snapshot.goal.progress, 75, 'Goal progress should be 75%')
  assert.strictEqual(snapshot.goal.remaining, 2500, 'Goal remaining should be 2500')
  console.log('✓ SCÉNARIO F — Objectif: PASS')
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
    billSchedules: []
  }
  
  const snapshot = buildIntelligenceSnapshot(input)
  
  assert.ok(snapshot.debt, 'Should have debt analysis')
  assert.strictEqual(snapshot.debt.total, 7000, 'Total debt should be 7000')
  assert.strictEqual(snapshot.debt.monthlyTotal, 230, 'Monthly total should be 230')
  assert.ok(snapshot.debt.payoffMonths > 0, 'Should calculate payoff months')
  console.log('✓ SCÉNARIO G — Dette: PASS')
}

// SCÉNARIO H — Données vides
function testEmptyDataScenario() {
  const input = {
    metrics: {},
    history: [],
    goals: [],
    debts: [],
    billSchedules: []
  }
  
  const snapshot = buildIntelligenceSnapshot(input)
  
  assert.ok(!isNaN(snapshot.cashflow.income), 'Income should not be NaN')
  assert.ok(!isNaN(snapshot.cashflow.expenses), 'Expenses should not be NaN')
  assert.ok(!isNaN(snapshot.cashflow.projected), 'Projected should not be NaN')
  assert.strictEqual(snapshot.dataQuality.level, 'low', 'Data quality should be low')
  assert.strictEqual(snapshot.dataQuality.hasIncome, false, 'Should flag no income')
  console.log('✓ SCÉNARIO H — Données vides: PASS')
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
    billSchedules: []
  }
  
  const snapshot = buildIntelligenceSnapshot(input)
  
  assert.strictEqual(snapshot.dataQuality.hasIncome, true, 'Should have income')
  assert.strictEqual(snapshot.dataQuality.hasExpenses, false, 'Should not have expenses')
  assert.ok(snapshot.trends.available === false, 'Trends should not be available')
  console.log('✓ SCÉNARIO I — Données partielles: PASS')
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
    billSchedules: []
  }
  
  const snapshot = buildIntelligenceSnapshot(input)
  
  assert.strictEqual(snapshot.trends.available, false, 'Trends should not be available')
  assert.strictEqual(snapshot.trends.reason, 'insufficient_history', 'Reason should be insufficient history')
  console.log('✓ SCÉNARIO J — Historique insuffisant: PASS')
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
    billSchedules: []
  }
  
  const snapshot = buildIntelligenceSnapshot(input)
  
  // No NaN
  assert.ok(!isNaN(snapshot.cashflow.income), 'Income should not be NaN')
  assert.ok(!isNaN(snapshot.cashflow.expenses), 'Expenses should not be NaN')
  assert.ok(!isNaN(snapshot.cashflow.projected), 'Projected should not be NaN')
  
  // No Infinity
  assert.ok(snapshot.cashflow.income !== Infinity, 'Income should not be Infinity')
  assert.ok(snapshot.cashflow.expenses !== Infinity, 'Expenses should not be Infinity')
  
  // Unique risk IDs
  const riskIds = snapshot.risks.map(r => r.id)
  assert.strictEqual(riskIds.length, new Set(riskIds).size, 'Risk IDs should be unique')
  
  // Valid severity
  const validSeverities = ['low', 'medium', 'high', 'critical']
  snapshot.risks.forEach(r => {
    assert.ok(validSeverities.includes(r.severity), `Risk severity ${r.severity} should be valid`)
  })
  
  console.log('✓ Invariants: PASS')
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
    billSchedules: []
  }
  
  const inputCopy = JSON.parse(JSON.stringify(input))
  
  buildIntelligenceSnapshot(input)
  
  assert.deepStrictEqual(input, inputCopy, 'Input should not be mutated')
  console.log('✓ Immutability: PASS')
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
    billSchedules: []
  }
  
  const options = { referenceDate: '2026-08-13' }
  
  const snapshot1 = buildIntelligenceSnapshot(input, options)
  const snapshot2 = buildIntelligenceSnapshot(input, options)
  
  assert.deepStrictEqual(snapshot1, snapshot2, 'Same input should produce same output')
  console.log('✓ Determinism: PASS')
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
    billSchedules: []
  }
  
  const snapshot = buildIntelligenceSnapshot(input)
  
  // En cas de déficit, ne pas recommander d'augmenter l'épargne
  assert.strictEqual(snapshot.priorities[0].id, 'fix_deficit', 'First priority should be fix deficit')
  assert.notStrictEqual(snapshot.priorities[0].id, 'capture_opportunity', 'Should not prioritize opportunity when in deficit')
  console.log('✓ Contradiction guards: PASS')
}

// Exécuter tous les tests
testHealthyScenario()
testDeficitScenario()
testNoIncomeScenario()
testLowBufferScenario()
testHighFixedChargesScenario()
testGoalScenario()
testDebtScenario()
testEmptyDataScenario()
testPartialDataScenario()
testInsufficientHistoryScenario()
testInvariants()
testImmutability()
testDeterminism()
testContradictionGuards()

console.log('\n📊 Intelligence Engine Tests: 13/13 PASS')
