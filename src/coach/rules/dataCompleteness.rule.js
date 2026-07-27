import { createRecommendation } from '../models/recommendation.js'

export const dataCompletenessRule = Object.freeze({
  id: 'dataCompleteness',

  evaluate(context) {
    const missingFields = context.dataQuality.missingFields
    if (missingFields.length === 0) return null

    return createRecommendation({
      ruleId: this.id,
      recommendationScore: 100,
      priority: 5,
      level: 'info',
      messageKey: 'coach.dataCompleteness',
      messageParams: { missingFields },
      evidence: {
        completeness: context.dataQuality.completeness,
        missingFields
      },
      action: {
        labelKey: 'coach.action.completeBudget',
        target: 'saisie'
      },
      confidence: 1,
      dataQuality: context.dataQuality
    })
  }
})

export default dataCompletenessRule
