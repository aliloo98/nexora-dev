#!/usr/bin/env node
import assert from 'node:assert/strict'
import { createRecommendation } from '../models/recommendation.js'
import {
  formatDays,
  formatEuro,
  presentRecommendation
} from '../presenters/recommendationPresenter.js'

const recommendation = createRecommendation({
  ruleId: 'criticalRemainder',
  recommendationScore: 95,
  priority: 4,
  level: 'critical',
  messageKey: 'coach.criticalRemainder',
  messageParams: {
    dailyRemainder: 12.5,
    remainingDays: 1
  },
  evidence: { dailyRemainder: 12.5 },
  action: {
    labelKey: 'coach.action.protectRemainder',
    target: 'saisie'
  },
  confidence: 1,
  dataQuality: { isReliable: true }
})

const before = JSON.stringify(recommendation)
const presented = presentRecommendation(recommendation)

assert.equal(presented.message.includes(formatEuro(12.5)), true)
assert.equal(presented.message.includes('1 jour'), true)
assert.equal(presented.actionLabel, 'Protéger mon reste à vivre')
assert.equal(JSON.stringify(recommendation), before, 'presenter must not mutate source numbers')
assert.equal(Object.isFrozen(presented), true)
assert.equal(formatDays(2), '2 jours')
assert.match(formatEuro(1234.5), /1[\s\u00A0\u202F]234,5[0-9]?\s?€/)

const unknown = presentRecommendation(createRecommendation({
  ruleId: 'futureRule',
  recommendationScore: 50,
  priority: 0,
  level: 'info',
  messageKey: 'coach.unknown',
  messageParams: { amount: 42 },
  evidence: {},
  action: { labelKey: 'coach.action.unknown', target: 'saisie' },
  confidence: 1,
  dataQuality: {}
}))
assert.deepEqual(unknown, {
  title: 'Recommandation Nexora',
  message: 'Une recommandation financière est disponible.',
  actionLabel: 'Voir mon budget',
  formattedEvidence: []
})

console.log('recommendationPresenter-tests: OK')
