import { linearScore } from '../engine/scoring.js'
import { createRecommendation } from '../models/recommendation.js'

export const projectedDeficitRule = Object.freeze({
  id: 'projectedDeficit',

  evaluate(context) {
    const { income, plannedExpenses, projectedBalance } = context.monthly
    if (projectedBalance >= 0) return null

    const deficit = Math.abs(projectedBalance)
    const reference = income > 0 ? income : Math.max(plannedExpenses, 1)
    const deficitRate = deficit / reference

    return createRecommendation({
      ruleId: this.id,
      recommendationScore: linearScore({
        value: deficitRate,
        inputMin: 0,
        inputMax: 0.5,
        scoreMin: 82,
        scoreMax: 100
      }),
      priority: 4,
      level: 'critical',
      messageKey: 'coach.projectedDeficit',
      messageParams: { deficit, projectedBalance },
      evidence: { deficit, deficitRate, income, plannedExpenses },
      action: {
        labelKey: 'coach.action.reviewBudget',
        target: 'saisie'
      },
      confidence: context.dataQuality.isReliable ? 1 : 0.7,
      dataQuality: context.dataQuality
    })
  }
})

export default projectedDeficitRule
