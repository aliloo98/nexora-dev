import {
  COACH_THRESHOLDS,
  calculateSecurityMargin,
  clamp,
  clampScore,
  hasCriticalFinancialRisk
} from '../engine/scoring.js'
import { createRecommendation } from '../models/recommendation.js'

export function createAllocatableSurplusRule(options = {}) {
  const allocationRate = clamp(
    options.allocationRate ?? COACH_THRESHOLDS.surplusAllocationRate,
    0.05,
    0.9
  )
  const minimumAllocatableAmount = Math.max(
    0,
    Number(options.minimumAllocatableAmount ?? COACH_THRESHOLDS.minimumAllocatableAmount) || 0
  )

  return Object.freeze({
    id: 'allocatableSurplus',

    evaluate(context) {
      const projectedBalance = context.monthly.projectedBalance
      if (!context.dataQuality.isReliable || projectedBalance < 0) return null
      if (hasCriticalFinancialRisk(context)) return null

      const securityMargin = calculateSecurityMargin(context.monthly, options)
      const headroom = Math.max(0, projectedBalance - securityMargin)
      const allocatableAmount = headroom * allocationRate
      if (allocatableAmount < minimumAllocatableAmount) return null

      const retainedAfterAllocation = projectedBalance - allocatableAmount
      const income = Math.max(1, context.monthly.income)
      const recommendationScore = clampScore(55 + Math.min(1, allocatableAmount / income) * 30)

      return createRecommendation({
        ruleId: this.id,
        recommendationScore,
        priority: 1,
        level: 'opportunity',
        messageKey: 'coach.allocatableSurplus',
        messageParams: {
          allocatableAmount,
          securityMargin,
          retainedAfterAllocation
        },
        evidence: {
          projectedBalance,
          securityMargin,
          headroom,
          allocationRate,
          allocatableAmount,
          retainedAfterAllocation
        },
        action: {
          labelKey: 'coach.action.planSavings',
          target: 'plan'
        },
        confidence: 0.95,
        dataQuality: context.dataQuality
      })
    }
  })
}

export const allocatableSurplusRule = createAllocatableSurplusRule()

export default allocatableSurplusRule
