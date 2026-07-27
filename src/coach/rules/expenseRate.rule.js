import { COACH_THRESHOLDS, linearScore } from '../engine/scoring.js'
import { createRecommendation } from '../models/recommendation.js'

export const expenseRateRule = Object.freeze({
  id: 'expenseRate',

  evaluate(context) {
    const { income, plannedExpenses, expenseRate } = context.monthly
    if (!context.dataQuality.isReliable || income <= 0 || expenseRate === null) return null
    if (expenseRate < COACH_THRESHOLDS.expenseRateWarning) return null

    const isCritical = expenseRate >= COACH_THRESHOLDS.expenseRateCritical
    const recommendationScore = isCritical
      ? linearScore({
          value: expenseRate,
          inputMin: COACH_THRESHOLDS.expenseRateCritical,
          inputMax: 150,
          scoreMin: 90,
          scoreMax: 100
        })
      : linearScore({
          value: expenseRate,
          inputMin: COACH_THRESHOLDS.expenseRateWarning,
          inputMax: COACH_THRESHOLDS.expenseRateCritical,
          scoreMin: 65,
          scoreMax: 90
        })

    return createRecommendation({
      ruleId: this.id,
      recommendationScore,
      priority: 3,
      level: isCritical ? 'critical' : 'warning',
      messageKey: 'coach.expenseRate',
      messageParams: { expenseRate, plannedExpenses, income },
      evidence: { expenseRate, plannedExpenses, income },
      action: {
        labelKey: 'coach.action.reviewExpenses',
        target: 'saisie'
      },
      confidence: 1,
      dataQuality: context.dataQuality
    })
  }
})

export default expenseRateRule
