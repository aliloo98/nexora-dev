import { COACH_THRESHOLDS, clampScore, hasCriticalFinancialRisk } from '../engine/scoring.js'
import { createRecommendation } from '../models/recommendation.js'

export const stableForecastRule = Object.freeze({
  id: 'stableForecast',

  evaluate(context) {
    const { income, projectedBalance, expenseRate } = context.monthly
    if (!context.dataQuality.isReliable || income <= 0 || projectedBalance < 0) return null
    if (hasCriticalFinancialRisk(context)) return null
    if (expenseRate !== null && expenseRate >= COACH_THRESHOLDS.expenseRateWarning) return null

    return createRecommendation({
      ruleId: this.id,
      recommendationScore: clampScore(45 + Math.min(1, projectedBalance / Math.max(1, income)) * 20),
      priority: 0,
      level: 'success',
      messageKey: 'coach.stableForecast',
      messageParams: { projectedBalance },
      evidence: {
        projectedBalance,
        expenseRate
      },
      action: {
        labelKey: 'coach.action.keepCourse',
        target: 'plan'
      },
      confidence: 0.9,
      dataQuality: context.dataQuality
    })
  }
})

export default stableForecastRule
