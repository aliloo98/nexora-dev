#!/usr/bin/env node
import assert from 'node:assert/strict'
import { computeCycleBalances, computeCycleBalancesFromMetrics } from './cycleBalance.js'

const snapshot = computeCycleBalances({
  income: 3000,
  totalExpenses: 2503,
  paidExpenses: 1800
})

assert.equal(snapshot.projectedEndOfCycle, 497)
assert.equal(snapshot.savings, 497)
assert.equal(snapshot.currentBalance, 1200)
assert.equal(snapshot.remainingToSpend, 703)

const fromMetrics = computeCycleBalancesFromMetrics({
  income: 3000,
  expenses: 2503,
  paidExpenses: 1800
})

assert.equal(fromMetrics.projectedEndOfCycle, 497)

console.log('cycleBalance-tests: OK')
