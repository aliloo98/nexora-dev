#!/usr/bin/env node
import assert from 'node:assert/strict'
import { createRecommendation } from '../models/recommendation.js'
import { rankRecommendations } from '../engine/recommendationRanker.js'

const candidate = (ruleId, priority, recommendationScore, confidence) => createRecommendation({
  ruleId,
  priority,
  recommendationScore,
  confidence,
  level: 'info',
  messageKey: `coach.${ruleId}`,
  messageParams: {},
  evidence: {},
  action: { labelKey: 'coach.action.test', target: 'saisie' },
  dataQuality: {}
})

const ranked = rankRecommendations([
  candidate('z-rule', 3, 90, 1),
  candidate('low-priority', 2, 100, 1),
  candidate('low-score', 3, 80, 1),
  candidate('low-confidence', 3, 90, 0.8),
  candidate('a-rule', 3, 90, 1)
])

assert.deepEqual(
  ranked.map(item => item.ruleId),
  ['a-rule', 'z-rule', 'low-confidence', 'low-score', 'low-priority']
)

const original = [candidate('b', 1, 50, 1), candidate('a', 1, 50, 1)]
rankRecommendations(original)
assert.deepEqual(original.map(item => item.ruleId), ['b', 'a'], 'ranking must not mutate the input array')

console.log('recommendationRanker-tests: OK')
