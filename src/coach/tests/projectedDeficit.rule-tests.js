#!/usr/bin/env node
import assert from 'node:assert/strict'
import { projectedDeficitRule } from '../rules/projectedDeficit.rule.js'
import { createCoachFixture } from './coachFixtures.js'

const atThreshold = createCoachFixture({ monthly: { projectedBalance: 0 } })
const justBelow = createCoachFixture({ monthly: { projectedBalance: -0.01 } })
const justAbove = createCoachFixture({ monthly: { projectedBalance: 0.01 } })

assert.equal(projectedDeficitRule.evaluate(atThreshold), null)
assert.equal(projectedDeficitRule.evaluate(justAbove), null)
assert.equal(projectedDeficitRule.evaluate(justBelow).level, 'critical')

const zeroIncome = projectedDeficitRule.evaluate(createCoachFixture({
  monthly: {
    income: 0,
    plannedExpenses: 100,
    projectedBalance: -100,
    expenseRate: null
  }
}))
assert.equal(zeroIncome.recommendationScore, 100)
assert.equal(Number.isFinite(zeroIncome.evidence.deficitRate), true)

const mild = projectedDeficitRule.evaluate(createCoachFixture({ monthly: { projectedBalance: -10 } }))
const severe = projectedDeficitRule.evaluate(createCoachFixture({ monthly: { projectedBalance: -1500 } }))
assert.equal(severe.recommendationScore > mild.recommendationScore, true)

console.log('projectedDeficit.rule-tests: OK')
