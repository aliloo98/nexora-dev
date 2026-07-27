import { createRecommendationEngine } from '../engine/recommendationEngine.js'
import { presentRecommendation } from '../presenters/recommendationPresenter.js'
import { COACH_RULES } from '../rules/index.js'

const lazyCoachContextService = Object.freeze({
  async buildContext(options) {
    const { CoachContextService } = await import('./coachContextService.js')
    return CoachContextService.buildContext(options)
  }
})

export function createCoachService({
  contextService = lazyCoachContextService,
  engine = createRecommendationEngine({ rules: COACH_RULES }),
  presenter = presentRecommendation
} = {}) {
  const analyze = async (options = {}) => {
    const context = await contextService.buildContext(options)
    const result = engine.evaluate(context)
    const presentation = result.primary ? presenter(result.primary) : null

    return Object.freeze({
      primary: result.primary,
      candidates: result.candidates,
      evaluatedRuleIds: result.evaluatedRuleIds,
      presentation,
      context
    })
  }

  return Object.freeze({
    analyze,
    getPrimaryRecommendation: analyze
  })
}

export const CoachService = createCoachService()

export default CoachService
