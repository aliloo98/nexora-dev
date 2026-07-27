#!/usr/bin/env node
import assert from 'node:assert/strict'
import { createAllocatableSurplusRule } from '../rules/allocatableSurplus.rule.js'
import { createCoachFixture } from './coachFixtures.js'

const rule = createAllocatableSurplusRule()
const margin = 300
const minimumHeadroom = 10 / 0.6

assert.equal(rule.evaluate(createCoachFixture({
  monthly: { projectedBalance: margin + minimumHeadroom - 0.01, expenseRate: 70 }
})), null)

const atMinimum = rule.evaluate(createCoachFixture({
  monthly: { projectedBalance: margin + minimumHeadroom, expenseRate: 70 }
}))
assert.equal(Math.abs(atMinimum.messageParams.allocatableAmount - 10) < 1e-9, true)

const aboveMinimum = rule.evaluate(createCoachFixture({
  monthly: { projectedBalance: margin + minimumHeadroom + 0.01, expenseRate: 70 }
}))
assert.equal(aboveMinimum.messageParams.allocatableAmount > 10, true)

assert.equal(rule.evaluate(createCoachFixture({
  monthly: { projectedBalance: -1 }
})), null)
assert.equal(rule.evaluate(createCoachFixture({
  monthly: { projectedBalance: 1000, expenseRate: 100 }
})), null, 'a critical expense rate must block allocation')
assert.equal(rule.evaluate(createCoachFixture({
  monthly: { projectedBalance: 1000, expenseRate: 60 },
  dataQuality: { isReliable: false, missingFields: ['income'] }
})), null)

const safe = rule.evaluate(createCoachFixture({
  monthly: { projectedBalance: 1000, expenseRate: 60 }
}))
assert.equal(safe.evidence.allocationRate, 0.6)
assert.equal(safe.messageParams.allocatableAmount < 1000, true)
assert.equal(safe.messageParams.retainedAfterAllocation >= safe.messageParams.securityMargin, true)

const cappedConfiguration = createAllocatableSurplusRule({ allocationRate: 1 })
assert.equal(
  cappedConfiguration.evaluate(createCoachFixture({
    monthly: { projectedBalance: 1000, expenseRate: 60 }
  })).evidence.allocationRate,
  0.9,
  'configuration must never allocate 100% of the headroom'
)

console.log('allocatableSurplus.rule-tests: OK')
