import { calculateGoalMetrics, selectPrimaryGoal } from '../../goals/goalMetrics.js'
import { clampScore } from '../engine/scoring.js'
import { createRecommendation } from '../models/recommendation.js'

export const goalPaceRule = Object.freeze({
  id: 'goalPace',

  evaluate(context) {
    const goal = selectPrimaryGoal(context.goals)
    if (!goal) return null

    const metrics = calculateGoalMetrics(goal, { asOf: context.asOf })
    if (!metrics.isTargetValid
      || metrics.remaining <= 0
      || !metrics.isDeadlineValid
      || metrics.daysRemaining === null
      || metrics.daysRemaining <= 0) {
      return null
    }

    const urgency = Math.max(0, Math.min(1, (180 - metrics.daysRemaining) / 180))
    const remainingShare = metrics.target > 0 ? metrics.remaining / metrics.target : 0
    const recommendationScore = clampScore(50 + urgency * 25 + Math.min(1, remainingShare) * 15)

    return createRecommendation({
      ruleId: this.id,
      recommendationScore,
      priority: 2,
      level: 'opportunity',
      messageKey: 'coach.goalPace',
      messageParams: {
        goalName: String(goal.name || 'ton objectif'),
        remaining: metrics.remaining,
        daysRemaining: metrics.daysRemaining,
        requiredDaily: metrics.requiredDaily,
        requiredMonthly: metrics.requiredMonthly
      },
      evidence: {
        goalId: goal.id || null,
        target: metrics.target,
        current: metrics.current,
        remaining: metrics.remaining,
        targetDate: metrics.targetDate,
        requiredDaily: metrics.requiredDaily,
        requiredMonthly: metrics.requiredMonthly
      },
      action: {
        labelKey: 'coach.action.viewGoal',
        target: 'objectifs'
      },
      confidence: 0.95,
      dataQuality: context.dataQuality
    })
  }
})

export default goalPaceRule
