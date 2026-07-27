#!/usr/bin/env node
import assert from 'node:assert/strict'
import { resolveDashboardRecommendation, normalizePriorityLevel } from './DashboardMaster.js'
import { presentRecommendation } from '../coach/presenters/recommendationPresenter.js'
import { createRecommendation } from '../coach/models/recommendation.js'
import { createCoachFixture } from '../coach/tests/coachFixtures.js'

const context = createCoachFixture()
const primary = createRecommendation({
  ruleId: 'stableForecast',
  recommendationScore: 50,
  priority: 0,
  level: 'success',
  messageKey: 'coach.stableForecast',
  messageParams: { projectedBalance: 900 },
  evidence: { projectedBalance: 900 },
  action: { labelKey: 'coach.action.keepCourse', target: 'plan' },
  confidence: 1,
  dataQuality: context.dataQuality
})
let legacyCalls = 0

const coachSuccess = await resolveDashboardRecommendation({
  coachService: {
    analyze: async () => ({
      primary,
      presentation: presentRecommendation(primary),
      context
    })
  },
  monthKey: '2026-07',
  asOf: context.asOf,
  legacyFactory: async () => {
    legacyCalls += 1
    return { source: 'legacy' }
  }
})

assert.equal(coachSuccess.decision.source, 'coach')
assert.equal(coachSuccess.decision.title, 'Garde le cap')
assert.equal(coachSuccess.coachError, null)
assert.equal(legacyCalls, 0, 'legacy selection must not run when Coach succeeds')

const fallback = await resolveDashboardRecommendation({
  coachService: {
    analyze: async () => {
      throw new Error('Coach unavailable')
    }
  },
  monthKey: '2026-07',
  asOf: context.asOf,
  legacyFactory: async () => {
    legacyCalls += 1
    return {
      source: 'legacy',
      title: 'Ancienne priorité',
      situation: 'Diagnostic existant',
      impact: 'Impact existant',
      action: 'Action existante'
    }
  }
})

assert.equal(fallback.decision.source, 'legacy')
assert.equal(fallback.decision.title, 'Ancienne priorité')
assert.match(fallback.coachError.message, /unavailable/)
assert.equal(legacyCalls, 1)

// Test normalizePriorityLevel
assert.equal(normalizePriorityLevel(0), 'critical', 'numeric 0 should be critical')
assert.equal(normalizePriorityLevel(1), 'vigilance', 'numeric 1 should be vigilance')
assert.equal(normalizePriorityLevel(2), 'opportunity', 'numeric 2 should be opportunity')
assert.equal(normalizePriorityLevel('0'), 'critical', 'string "0" should be critical')
assert.equal(normalizePriorityLevel('1'), 'vigilance', 'string "1" should be vigilance')
assert.equal(normalizePriorityLevel('2'), 'opportunity', 'string "2" should be opportunity')
assert.equal(normalizePriorityLevel('critical'), 'critical', 'critical should be critical')
assert.equal(normalizePriorityLevel('CRITICAL'), 'critical', 'CRITICAL should be critical (case insensitive)')
assert.equal(normalizePriorityLevel('  critical  '), 'critical', '  critical  should be critical (whitespace tolerant)')
assert.equal(normalizePriorityLevel('critique'), 'critical', 'critique should be critical')
assert.equal(normalizePriorityLevel('high'), 'critical', 'high should be critical')
assert.equal(normalizePriorityLevel('importante'), 'critical', 'importante should be critical')
assert.equal(normalizePriorityLevel('medium'), 'vigilance', 'medium should be vigilance')
assert.equal(normalizePriorityLevel('low'), 'opportunity', 'low should be opportunity')
assert.equal(normalizePriorityLevel('informational'), 'neutral', 'informational should be neutral')
assert.equal(normalizePriorityLevel('standard'), 'neutral', 'standard should be neutral')
assert.equal(normalizePriorityLevel('unknown'), 'neutral', 'unknown should be neutral')
assert.equal(normalizePriorityLevel(null), 'neutral', 'null should be neutral')
assert.equal(normalizePriorityLevel(undefined), 'neutral', 'undefined should be neutral')
assert.equal(normalizePriorityLevel(999), 'neutral', 'unknown numeric should be neutral')

console.log('DashboardMaster-tests: OK')
