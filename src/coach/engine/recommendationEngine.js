import { isCoachContext } from '../models/coachContext.js'
import { validateRecommendation } from '../models/recommendation.js'
import { rankRecommendations } from './recommendationRanker.js'

const validateRules = (rules) => {
  if (!Array.isArray(rules)) throw new TypeError('Recommendation rules must be an array')
  const seen = new Set()
  return rules.map((rule) => {
    const id = String(rule?.id || '').trim()
    if (!id || typeof rule?.evaluate !== 'function') throw new TypeError('Every recommendation rule needs an id and evaluate(context)')
    if (seen.has(id)) throw new TypeError(`Duplicate recommendation rule: ${id}`)
    seen.add(id)
    return rule
  })
}

export function createRecommendationEngine({ rules = [] } = {}) {
  const registry = Object.freeze([...validateRules(rules)])

  return Object.freeze({
    evaluate(context) {
      if (!isCoachContext(context)) throw new TypeError('A normalized CoachContext is required')

      const candidates = []
      const evaluatedRuleIds = []

      for (const rule of registry) {
        evaluatedRuleIds.push(rule.id)
        const candidate = rule.evaluate(context)
        if (candidate === null || candidate === undefined) continue
        validateRecommendation(candidate)
        if (candidate.ruleId !== rule.id) {
          throw new TypeError(`Rule ${rule.id} returned candidate for ${candidate.ruleId}`)
        }
        candidates.push(candidate)
      }

      const ranked = Object.freeze(rankRecommendations(candidates))
      return Object.freeze({
        primary: ranked[0] || null,
        candidates: ranked,
        evaluatedRuleIds: Object.freeze(evaluatedRuleIds)
      })
    }
  })
}

export default { createRecommendationEngine }
