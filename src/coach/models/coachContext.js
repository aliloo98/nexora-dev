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

const finite = (value, fallback = 0) => {
  const number = Number(value)
  return Number.isFinite(number) ? number : fallback
}

const nullableFinite = (value) => {
  if (value === null || value === undefined) return null
  const number = Number(value)
  return Number.isFinite(number) ? number : null
}

const normalizeAsOf = (asOf) => {
  const raw = asOf instanceof Date ? asOf.toISOString() : String(asOf || '')
  if (!raw || !Number.isFinite(Date.parse(raw))) throw new TypeError('CoachContext.asOf must be a valid date')
  return raw
}

export function createCoachContext(input = {}) {
  const missingFields = [...new Set(
    (Array.isArray(input?.dataQuality?.missingFields) ? input.dataQuality.missingFields : [])
      .map(value => String(value || '').trim())
      .filter(Boolean)
  )]
  const completeness = Math.max(0, Math.min(1, finite(input?.dataQuality?.completeness)))

  const context = {
    asOf: normalizeAsOf(input.asOf),
    monthKey: String(input.monthKey || ''),
    cycle: {
      start: String(input?.cycle?.start || ''),
      end: String(input?.cycle?.end || ''),
      elapsedDays: Math.max(0, finite(input?.cycle?.elapsedDays)),
      remainingDays: Math.max(0, finite(input?.cycle?.remainingDays)),
      totalDays: Math.max(0, finite(input?.cycle?.totalDays)),
      progress: Math.max(0, Math.min(100, finite(input?.cycle?.progress)))
    },
    monthly: {
      income: finite(input?.monthly?.income),
      plannedExpenses: finite(input?.monthly?.plannedExpenses),
      paidExpenses: finite(input?.monthly?.paidExpenses),
      currentBalance: finite(input?.monthly?.currentBalance),
      projectedBalance: finite(input?.monthly?.projectedBalance),
      remainingExpenses: Math.max(0, finite(input?.monthly?.remainingExpenses)),
      expenseRate: nullableFinite(input?.monthly?.expenseRate)
    },
    categories: cloneValue(Array.isArray(input.categories) ? input.categories : []),
    upcomingCharges: cloneValue(Array.isArray(input.upcomingCharges) ? input.upcomingCharges : []),
    goals: cloneValue(Array.isArray(input.goals) ? input.goals : []),
    history: cloneValue(Array.isArray(input.history) ? input.history : []),
    dataQuality: {
      completeness,
      missingFields,
      historyDepth: Math.max(0, Math.trunc(finite(input?.dataQuality?.historyDepth))),
      isReliable: Boolean(input?.dataQuality?.isReliable)
    }
  }

  return deepFreeze(context)
}

export const isCoachContext = context => Boolean(
  context
  && typeof context === 'object'
  && context.monthly
  && context.cycle
  && context.dataQuality
)

export default { createCoachContext, isCoachContext }
