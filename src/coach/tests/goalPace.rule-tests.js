#!/usr/bin/env node
import assert from 'node:assert/strict'
import { goalPaceRule } from '../rules/goalPace.rule.js'
import { createCoachFixture } from './coachFixtures.js'

const withGoal = goal => createCoachFixture({ goals: [{ id: 'goal', name: 'Maison', isPrimary: true, ...goal }] })

assert.equal(goalPaceRule.evaluate(withGoal({ target: 0, current: 0, targetDate: '2026-08-01' })), null)
assert.equal(goalPaceRule.evaluate(withGoal({ target: 1000, current: 1000, targetDate: '2026-08-01' })), null)
assert.equal(goalPaceRule.evaluate(withGoal({ target: 1000, current: 900 })), null)
assert.equal(goalPaceRule.evaluate(withGoal({ target: 1000, current: 900, targetDate: 'invalid' })), null)
assert.equal(goalPaceRule.evaluate(withGoal({ target: 1000, current: 900, targetDate: '2026-07-15' })), null)
assert.equal(goalPaceRule.evaluate(withGoal({ target: 1000, current: 900, targetDate: '2026-07-14' })), null)

const tomorrow = goalPaceRule.evaluate(withGoal({
  target: 1000,
  current: 900,
  targetDate: '2026-07-16'
}))
assert.equal(tomorrow.messageParams.requiredDaily, 100)
assert.equal(tomorrow.messageParams.requiredMonthly, 100)
assert.equal(tomorrow.priority, 2)

const thirtyDays = goalPaceRule.evaluate(withGoal({
  target: 1000,
  current: 400,
  targetDate: '2026-08-14'
}))
assert.equal(thirtyDays.messageParams.requiredDaily, 20)
assert.equal(thirtyDays.messageParams.requiredMonthly, 600)

console.log('goalPace.rule-tests: OK')
