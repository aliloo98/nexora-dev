#!/usr/bin/env node
import assert from 'node:assert/strict'
import { criticalRemainderRule } from '../rules/criticalRemainder.rule.js'
import { createCoachFixture } from './coachFixtures.js'

const withDailyRemainder = value => createCoachFixture({
  cycle: { remainingDays: 10 },
  monthly: { projectedBalance: value * 10 }
})

assert.equal(criticalRemainderRule.evaluate(withDailyRemainder(30.01)), null)
assert.equal(criticalRemainderRule.evaluate(withDailyRemainder(30)).level, 'warning')
assert.equal(criticalRemainderRule.evaluate(withDailyRemainder(29.99)).level, 'warning')
assert.equal(criticalRemainderRule.evaluate(withDailyRemainder(15.01)).level, 'warning')
assert.equal(criticalRemainderRule.evaluate(withDailyRemainder(15)).level, 'critical')
assert.equal(criticalRemainderRule.evaluate(withDailyRemainder(14.99)).level, 'critical')

assert.equal(criticalRemainderRule.evaluate(createCoachFixture({
  cycle: { remainingDays: 0 },
  monthly: { projectedBalance: 0 }
})), null)
assert.equal(criticalRemainderRule.evaluate(createCoachFixture({
  monthly: { projectedBalance: 10 },
  dataQuality: { isReliable: false }
})), null)
assert.equal(criticalRemainderRule.evaluate(createCoachFixture({
  monthly: { projectedBalance: -1 }
})), null, 'deficits are owned by projectedDeficit')

console.log('criticalRemainder.rule-tests: OK')
