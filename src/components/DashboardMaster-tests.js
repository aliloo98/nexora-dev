#!/usr/bin/env node
import assert from 'node:assert/strict'
import { resolveDashboardRecommendation } from './DashboardMaster.js'
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

console.log('DashboardMaster-tests: OK')
