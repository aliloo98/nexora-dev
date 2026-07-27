#!/usr/bin/env node
import assert from 'node:assert/strict'
import { expenseRateRule } from '../rules/expenseRate.rule.js'
import { createCoachFixture } from './coachFixtures.js'

const withRate = expenseRate => createCoachFixture({ monthly: { expenseRate } })

assert.equal(expenseRateRule.evaluate(withRate(79.99)), null)
assert.equal(expenseRateRule.evaluate(withRate(80)).level, 'warning')
assert.equal(expenseRateRule.evaluate(withRate(80.01)).level, 'warning')
assert.equal(expenseRateRule.evaluate(withRate(99.99)).level, 'warning')
assert.equal(expenseRateRule.evaluate(withRate(100)).level, 'critical')
assert.equal(expenseRateRule.evaluate(withRate(100.01)).level, 'critical')

assert.equal(expenseRateRule.evaluate(createCoachFixture({
  monthly: { income: 0, expenseRate: null }
})), null)
assert.equal(expenseRateRule.evaluate(createCoachFixture({
  monthly: { expenseRate: 120 },
  dataQuality: { isReliable: false }
})), null)

console.log('expenseRate.rule-tests: OK')
