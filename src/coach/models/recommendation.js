export const RECOMMENDATION_LEVELS = Object.freeze([
  'critical',
  'warning',
  'opportunity',
  'success',
  'info'
])

const LEVEL_SET = new Set(RECOMMENDATION_LEVELS)

const deepFreeze = (value, seen = new WeakSet()) => {
  if (!value || typeof value !== 'object' || seen.has(value)) return value
  seen.add(value)
  Object.values(value).forEach(item => deepFreeze(item, seen))
  return Object.freeze(value)
}

const cloneValue = (value) => {
  if (Array.isArray(value)) return value.map(cloneValue)
  if (!value || typeof value !== 'object') return value
  return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, cloneValue(item)]))
}

export function validateRecommendation(candidate) {
  if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) {
    throw new TypeError('Recommendation must be an object')
  }
  if (!String(candidate.ruleId || '').trim()) throw new TypeError('Recommendation.ruleId is required')
  if (!Number.isFinite(candidate.recommendationScore)
    || candidate.recommendationScore < 0
    || candidate.recommendationScore > 100) {
    throw new RangeError('Recommendation.recommendationScore must be between 0 and 100')
  }
  if (!Number.isInteger(candidate.priority) || candidate.priority < 0 || candidate.priority > 5) {
    throw new RangeError('Recommendation.priority must be an integer between 0 and 5')
  }
  if (!LEVEL_SET.has(candidate.level)) throw new TypeError(`Unsupported recommendation level: ${candidate.level}`)
  if (!String(candidate.messageKey || '').trim()) throw new TypeError('Recommendation.messageKey is required')
  if (!Number.isFinite(candidate.confidence) || candidate.confidence < 0 || candidate.confidence > 1) {
    throw new RangeError('Recommendation.confidence must be between 0 and 1')
  }
  if (!candidate.action || typeof candidate.action !== 'object') {
    throw new TypeError('Recommendation.action is required')
  }
  return true
}

export function createRecommendation(input) {
  const candidate = {
    ruleId: String(input?.ruleId || '').trim(),
    recommendationScore: Number(input?.recommendationScore),
    priority: Number(input?.priority),
    level: input?.level,
    messageKey: String(input?.messageKey || '').trim(),
    messageParams: cloneValue(input?.messageParams || {}),
    evidence: cloneValue(input?.evidence || {}),
    action: cloneValue(input?.action || {}),
    confidence: Number(input?.confidence),
    dataQuality: cloneValue(input?.dataQuality || {})
  }
  validateRecommendation(candidate)
  return deepFreeze(candidate)
}

export default { RECOMMENDATION_LEVELS, createRecommendation, validateRecommendation }
