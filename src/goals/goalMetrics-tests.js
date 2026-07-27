#!/usr/bin/env node
import assert from 'node:assert/strict'
import { calculateGoalMetrics, selectPrimaryGoal } from './goalMetrics.js'

const metrics = calculateGoalMetrics({
  id: 'home',
  name: 'Maison',
  target: 10000,
  current: 8200,
  targetDate: '2026-10-25'
}, {
  asOf: '2026-07-27'
})

assert.equal(metrics.remaining, 1800)
assert.equal(metrics.daysRemaining, 90)
assert.equal(metrics.monthsRemaining, 3)
assert.equal(metrics.requiredDaily, 20)
assert.equal(metrics.requiredMonthly, 600)
assert.equal(metrics.monthlyEffort, 600)
assert.equal(metrics.status, 'future')

const withoutDeadline = calculateGoalMetrics(
  { target: 1000, current: 250 },
  { asOf: '2026-07-27' }
)
assert.equal(withoutDeadline.targetDate, null)
assert.equal(withoutDeadline.requiredDaily, null)
assert.equal(withoutDeadline.status, 'none')

const reached = calculateGoalMetrics(
  { target: 1000, current: 1000, targetDate: '2026-12-01' },
  { asOf: '2026-07-27' }
)
assert.equal(reached.isReached, true)
assert.equal(reached.remaining, 0)
assert.equal(reached.requiredDaily, null)

const dueToday = calculateGoalMetrics(
  { target: 1000, current: 900, targetDate: '2026-07-27' },
  { asOf: '2026-07-27' }
)
assert.equal(dueToday.daysRemaining, 0)
assert.equal(dueToday.requiredDaily, null)

assert.equal(
  selectPrimaryGoal([{ id: 'secondary' }, { id: 'primary', isPrimary: true }]).id,
  'primary'
)
assert.equal(selectPrimaryGoal([{ id: 'first' }]).id, 'first')
assert.throws(() => calculateGoalMetrics({}, {}), /asOf/)

console.log('goalMetrics-tests: OK')
