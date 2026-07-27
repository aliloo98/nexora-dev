#!/usr/bin/env node
import assert from 'node:assert/strict'
import { createRecommendationEngine } from '../engine/recommendationEngine.js'
import { createRecommendation } from '../models/recommendation.js'
import { COACH_RULES } from '../rules/index.js'
import {
  createCoachFixture,
  deficitFixture,
  incompleteDataFixture
} from './coachFixtures.js'

const engine = createRecommendationEngine({ rules: COACH_RULES })
const deficit = deficitFixture()
const before = JSON.stringify(deficit)
const first = engine.evaluate(deficit)
const second = engine.evaluate(deficit)

assert.equal(first.primary.ruleId, 'projectedDeficit')
assert.deepEqual(first.evaluatedRuleIds, COACH_RULES.map(rule => rule.id))
assert.equal(JSON.stringify(deficit), before, 'the engine and rules must not mutate the context')
assert.deepEqual(first, second, 'same context and same asOf must produce the same result')
assert.equal(Object.isFrozen(deficit), true)
assert.equal(Object.isFrozen(deficit.monthly), true)
assert.equal(Object.isFrozen(first.candidates), true)

assert.equal(engine.evaluate(incompleteDataFixture()).primary.ruleId, 'dataCompleteness')

const alphabeticalTieEngine = createRecommendationEngine({
  rules: ['zeta', 'alpha'].map(id => ({
    id,
    evaluate: context => createRecommendation({
      ruleId: id,
      recommendationScore: 50,
      priority: 1,
      level: 'info',
      messageKey: `coach.${id}`,
      messageParams: {},
      evidence: {},
      action: { labelKey: 'coach.action.test', target: 'saisie' },
      confidence: 1,
      dataQuality: context.dataQuality
    })
  }))
})
assert.equal(alphabeticalTieEngine.evaluate(createCoachFixture()).primary.ruleId, 'alpha')

assert.throws(
  () => createRecommendationEngine({ rules: [{ id: 'same', evaluate: () => null }, { id: 'same', evaluate: () => null }] }),
  /Duplicate/
)

console.log('recommendationEngine-tests: OK')
