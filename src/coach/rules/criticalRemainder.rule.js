import {
  COACH_THRESHOLDS,
  calculateDailyRemainder,
  linearScore
} from '../engine/scoring.js'
import { createRecommendation } from '../models/recommendation.js'

export const criticalRemainderRule = Object.freeze({
  id: 'criticalRemainder',

  evaluate(context) {
    if (!context.dataQuality.isReliable || context.cycle.remainingDays <= 0) return null
    if (context.monthly.projectedBalance < 0) return null

    const dailyRemainder = calculateDailyRemainder(context)
    if (dailyRemainder === null || dailyRemainder > COACH_THRESHOLDS.dailyRemainderWarning) return null
    const isCritical = dailyRemainder <= COACH_THRESHOLDS.dailyRemainderCritical
    const recommendationScore = isCritical
      ? linearScore({
          value: COACH_THRESHOLDS.dailyRemainderCritical - dailyRemainder,
          inputMin: 0,
          inputMax: COACH_THRESHOLDS.dailyRemainderCritical,
          scoreMin: 90,
          scoreMax: 100
        })
      : linearScore({
          value: COACH_THRESHOLDS.dailyRemainderWarning - dailyRemainder,
          inputMin: 0,
          inputMax: COACH_THRESHOLDS.dailyRemainderWarning - COACH_THRESHOLDS.dailyRemainderCritical,
          scoreMin: 75,
          scoreMax: 90
        })

    return createRecommendation({
      ruleId: this.id,
      recommendationScore,
      priority: 4,
      level: isCritical ? 'critical' : 'warning',
      messageKey: 'coach.criticalRemainder',
      messageParams: {
        dailyRemainder,
        remainingDays: context.cycle.remainingDays
      },
      evidence: {
        projectedBalance: context.monthly.projectedBalance,
        dailyRemainder,
        remainingDays: context.cycle.remainingDays
      },
      action: {
        labelKey: 'coach.action.protectRemainder',
        target: 'saisie'
      },
      confidence: 1,
      dataQuality: context.dataQuality
    })
  }
})

export default criticalRemainderRule
