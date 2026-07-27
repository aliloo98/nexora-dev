#!/usr/bin/env node
import assert from 'node:assert/strict'
import { stableForecastRule } from '../rules/stableForecast.rule.js'
import { createCoachFixture } from './coachFixtures.js'

assert.equal(stableForecastRule.evaluate(createCoachFixture()).level, 'success')
assert.equal(stableForecastRule.evaluate(createCoachFixture({
  monthly: { expenseRate: 79.99 }
})).level, 'success')
assert.equal(stableForecastRule.evaluate(createCoachFixture({
  monthly: { expenseRate: 80 }
})), null)
assert.equal(stableForecastRule.evaluate(createCoachFixture({
  monthly: { projectedBalance: -0.01 }
})), null)
assert.equal(stableForecastRule.evaluate(createCoachFixture({
  dataQuality: { isReliable: false }
})), null)

console.log('stableForecast.rule-tests: OK')
