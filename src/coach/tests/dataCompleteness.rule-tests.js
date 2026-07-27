#!/usr/bin/env node
import assert from 'node:assert/strict'
import { dataCompletenessRule } from '../rules/dataCompleteness.rule.js'
import { createCoachFixture, incompleteDataFixture } from './coachFixtures.js'

const incomplete = dataCompletenessRule.evaluate(incompleteDataFixture())
assert.equal(incomplete.priority, 5)
assert.equal(incomplete.recommendationScore, 100)
assert.deepEqual(incomplete.messageParams.missingFields, ['income', 'expenses'])

const explicitZeroExpenses = createCoachFixture({
  monthly: {
    plannedExpenses: 0,
    paidExpenses: 0,
    projectedBalance: 3000,
    remainingExpenses: 0,
    expenseRate: 0
  },
  dataQuality: {
    completeness: 1,
    missingFields: [],
    isReliable: true
  }
})
assert.equal(
  dataCompletenessRule.evaluate(explicitZeroExpenses),
  null,
  'real zero expenses must not be treated as missing data'
)

console.log('dataCompleteness.rule-tests: OK')
