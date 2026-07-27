const compareRuleIds = (left, right) => {
  const a = String(left || '')
  const b = String(right || '')
  if (a === b) return 0
  return a < b ? -1 : 1
}

export function compareRecommendations(left, right) {
  if (left.priority !== right.priority) return right.priority - left.priority
  if (left.recommendationScore !== right.recommendationScore) {
    return right.recommendationScore - left.recommendationScore
  }
  if (left.confidence !== right.confidence) return right.confidence - left.confidence
  return compareRuleIds(left.ruleId, right.ruleId)
}

export const rankRecommendations = (candidates = []) => (
  [...(Array.isArray(candidates) ? candidates : [])].sort(compareRecommendations)
)

export default { compareRecommendations, rankRecommendations }
