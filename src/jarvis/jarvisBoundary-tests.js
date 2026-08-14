/**
 * J4 → Jarvis Boundary Tests
 *
 * Tests that actual J4 Intelligence Engine output can be consumed by Jarvis View Model.
 * Uses real buildIntelligenceSnapshot with deterministic inputs.
 */

import assert from 'node:assert/strict'
import { buildIntelligenceSnapshot } from '../intelligence/IntelligenceEngine.js'
import { createJarvisViewModel } from './jarvisViewModel.js'

console.log('🧪 Running J4 → Jarvis Boundary Tests')

// Deterministic inputs for J4
const INPUTS = {
  strong: {
    metrics: {
      income: 5000,
      fixedExpenses: 1500,
      variableExpenses: 1000,
      paidExpenses: 2000,
      plannedExpenses: 2500
    },
    goals: [
      { target: 10000, current: 6000, targetDate: '2026-12-31' }
    ],
    debts: [],
    billSchedules: [
      { amount: 95, dayOfMonth: 15, recurrence: 'monthly' }
    ],
    history: [
      { income: 4800, expenses: 2100 },
      { income: 4900, expenses: 2200 }
    ],
    dataAvailability: {
      goals: 'known',
      debts: 'known'
    }
  },
  critical: {
    metrics: {
      income: 2000,
      fixedExpenses: 1800,
      variableExpenses: 800,
      paidExpenses: 2000,
      plannedExpenses: 2600
    },
    goals: [],
    debts: [],
    billSchedules: [
      { amount: 95, dayOfMonth: 15, recurrence: 'monthly' }
    ],
    history: [
      { income: 1800, expenses: 2200 },
      { income: 1900, expenses: 2300 }
    ],
    dataAvailability: {
      goals: 'known',
      debts: 'known'
    }
  },
  noIncome: {
    metrics: {
      income: 0,
      fixedExpenses: 500,
      variableExpenses: 300,
      paidExpenses: 400,
      plannedExpenses: 800
    },
    goals: [],
    debts: [],
    billSchedules: [],
    history: [
      { income: 0, expenses: 800 },
      { income: 0, expenses: 750 }
    ],
    dataAvailability: {
      goals: 'known',
      debts: 'known'
    }
  },
  insufficientHistory: {
    metrics: {
      income: 3000,
      fixedExpenses: 1200,
      variableExpenses: 500,
      paidExpenses: 1500,
      plannedExpenses: 1700
    },
    goals: [],
    debts: [],
    billSchedules: [],
    history: [], // Insufficient history
    dataAvailability: {
      goals: 'known',
      debts: 'known'
    }
  },
  incompleteCore: {
    metrics: {
      income: 0,
      fixedExpenses: 0,
      variableExpenses: 0,
      paidExpenses: 0,
      plannedExpenses: 0
    },
    goals: [],
    debts: [],
    billSchedules: [],
    history: [],
    dataAvailability: {
      goals: 'known',
      debts: 'known'
    }
  }
}

const REFERENCE_DATE = new Date('2026-06-15T00:00:00.000Z')

function testStrongBoundary() {
  const snapshot = buildIntelligenceSnapshot(INPUTS.strong, { referenceDate: REFERENCE_DATE })
  const vm = createJarvisViewModel(snapshot)

  assert.ok(vm, 'View Model should exist')
  assert.ok(vm.visualState, 'Visual state should exist')
  assert.ok(vm.statusLabel, 'Status label should exist')
  assert.ok(vm.trajectory, 'Trajectory should exist')
  
  // Verify no undefined/NaN/Infinity in critical fields
  assert.ok(vm.visualState !== undefined, 'Visual state should not be undefined')
  assert.ok(!isNaN(vm.trajectory.finalBalance), 'Final balance should not be NaN')
  assert.ok(vm.trajectory.finalBalance !== Infinity, 'Final balance should not be Infinity')
  assert.ok(vm.trajectory.finalBalance !== -Infinity, 'Final balance should not be -Infinity')
  
  // Strong state should have a positive visual state (strong, balanced, or stable)
  assert.ok(['strong', 'balanced', 'stable'].includes(vm.visualState), 'Strong state should produce strong, balanced, or stable visual state')
}

function testCriticalBoundary() {
  const snapshot = buildIntelligenceSnapshot(INPUTS.critical, { referenceDate: REFERENCE_DATE })
  const vm = createJarvisViewModel(snapshot)

  assert.ok(vm, 'View Model should exist')
  assert.ok(vm.visualState, 'Visual state should exist')
  assert.ok(vm.statusLabel, 'Status label should exist')
  
  // Verify no undefined/NaN/Infinity
  assert.ok(vm.visualState !== undefined, 'Visual state should not be undefined')
  assert.ok(!isNaN(vm.trajectory.finalBalance), 'Final balance should not be NaN')
  assert.ok(vm.trajectory.finalBalance !== Infinity, 'Final balance should not be Infinity')
  assert.ok(vm.trajectory.finalBalance !== -Infinity, 'Final balance should not be -Infinity')
  
  // Critical state should have negative or zero trajectory
  assert.ok(vm.trajectory.finalBalance <= 0, 'Critical state should have non-positive final balance')
}

function testNoIncomeBoundary() {
  const snapshot = buildIntelligenceSnapshot(INPUTS.noIncome, { referenceDate: REFERENCE_DATE })
  const vm = createJarvisViewModel(snapshot)

  assert.ok(vm, 'View Model should exist')
  assert.ok(vm.visualState, 'Visual state should exist')
  assert.ok(vm.statusLabel, 'Status label should exist')
  
  // Verify no undefined/NaN/Infinity
  assert.ok(vm.visualState !== undefined, 'Visual state should not be undefined')
  assert.ok(!isNaN(vm.trajectory.finalBalance), 'Final balance should not be NaN')
  assert.ok(vm.trajectory.finalBalance !== Infinity, 'Final balance should not be Infinity')
  assert.ok(vm.trajectory.finalBalance !== -Infinity, 'Final balance should not be -Infinity')
  
  // No income state should have specific visual state
  assert.ok(['no_income', 'critical', 'unknown'].includes(vm.visualState), 'No income should produce no_income, critical, or unknown state')
}

function testInsufficientHistoryBoundary() {
  const snapshot = buildIntelligenceSnapshot(INPUTS.insufficientHistory, { referenceDate: REFERENCE_DATE })
  const vm = createJarvisViewModel(snapshot)

  assert.ok(vm, 'View Model should exist')
  assert.ok(vm.trajectory, 'Trajectory should exist')
  assert.ok(vm.capabilities, 'Capabilities should exist')
  
  // Verify no undefined/NaN/Infinity
  assert.ok(vm.trajectory.finalBalance !== undefined, 'Final balance should not be undefined')
  assert.ok(!isNaN(vm.trajectory.finalBalance), 'Final balance should not be NaN')
  assert.ok(vm.trajectory.finalBalance !== Infinity, 'Final balance should not be Infinity')
  assert.ok(vm.trajectory.finalBalance !== -Infinity, 'Final balance should not be -Infinity')
  
  // Insufficient history should disable trends capability
  assert.strictEqual(vm.capabilities.trends, false, 'Trends capability should be unavailable with insufficient history')
}

function testIncompleteCoreBoundary() {
  const snapshot = buildIntelligenceSnapshot(INPUTS.incompleteCore, { referenceDate: REFERENCE_DATE })
  const vm = createJarvisViewModel(snapshot)

  assert.ok(vm, 'View Model should exist')
  assert.ok(vm.dataQuality, 'Data quality should exist')
  assert.ok(vm.capabilities, 'Capabilities should exist')
  
  // Verify no undefined/NaN/Infinity
  assert.ok(vm.dataQuality !== undefined, 'Data quality should not be undefined')
  assert.ok(vm.capabilities.core !== undefined, 'Core capability should not be undefined')
  
  // Incomplete core should not have core capability
  assert.strictEqual(vm.capabilities.core, false, 'Incomplete core should not have core capability')
}

function testGoalBoundary() {
  const snapshot = buildIntelligenceSnapshot(INPUTS.strong, { referenceDate: REFERENCE_DATE })
  const vm = createJarvisViewModel(snapshot)

  assert.ok(vm.goal, 'Goal should exist')
  
  // Verify no undefined/NaN/Infinity in goal fields
  assert.ok(vm.goal.target !== undefined, 'Goal target should not be undefined')
  assert.ok(vm.goal.current !== undefined, 'Goal current should not be undefined')
  assert.ok(vm.goal.remaining !== undefined, 'Goal remaining should not be undefined')
  assert.ok(!isNaN(vm.goal.progress), 'Goal progress should not be NaN')
  assert.ok(vm.goal.progress !== Infinity, 'Goal progress should not be Infinity')
  assert.ok(vm.goal.progress !== -Infinity, 'Goal progress should not be -Infinity')
  
  // Progress should be clamped to valid range in View Model
  assert.ok(vm.goal.progress >= 0 && vm.goal.progress <= 100, 'Goal progress should be in valid range')
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

runTest(testStrongBoundary, 'Strong boundary')
runTest(testCriticalBoundary, 'Critical boundary')
runTest(testNoIncomeBoundary, 'No-income boundary')
runTest(testInsufficientHistoryBoundary, 'Insufficient-history boundary')
runTest(testIncompleteCoreBoundary, 'Incomplete-core boundary')
runTest(testGoalBoundary, 'Goal boundary')

console.log(`\nJ4 → Jarvis Boundary Tests: ${passed}/${total} passed`)
