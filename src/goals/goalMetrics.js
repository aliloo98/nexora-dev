const DAY_MS = 24 * 60 * 60 * 1000

const finiteNumber = (value) => {
  const number = Number(value)
  return Number.isFinite(number) ? number : 0
}

const dateOnlyTimestamp = (value) => {
  const raw = value instanceof Date ? value.toISOString() : String(value || '')
  const dateKey = raw.slice(0, 10)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) return null
  const timestamp = Date.parse(`${dateKey}T00:00:00.000Z`)
  return Number.isFinite(timestamp) ? { dateKey, timestamp } : null
}

export const normalizeGoalTargetDate = (targetDate) => dateOnlyTimestamp(targetDate)?.dateKey || null

export const selectPrimaryGoal = (goals = []) => {
  const list = Array.isArray(goals) ? goals : []
  return list.find(goal => goal?.isPrimary === true) || list[0] || null
}

export function calculateGoalMetrics(goal = {}, { asOf, monthlyContribution = 0 } = {}) {
  const reference = dateOnlyTimestamp(asOf)
  if (!reference) throw new TypeError('asOf must be a valid date')

  const target = finiteNumber(goal?.target)
  const current = finiteNumber(goal?.current)
  const remaining = Math.max(0, target - current)
  const targetDate = dateOnlyTimestamp(goal?.targetDate)
  const daysRemaining = targetDate
    ? Math.ceil((targetDate.timestamp - reference.timestamp) / DAY_MS)
    : null
  const monthsRemaining = daysRemaining !== null && daysRemaining > 0
    ? Math.max(1, Math.ceil(daysRemaining / 30))
    : daysRemaining === null ? null : 0
  const requiredDaily = daysRemaining !== null && daysRemaining > 0 && remaining > 0
    ? remaining / daysRemaining
    : null
  const requiredMonthly = monthsRemaining !== null && monthsRemaining > 0 && remaining > 0
    ? remaining / monthsRemaining
    : null
  const contribution = Math.max(0, finiteNumber(monthlyContribution))
  const projectedMonths = contribution > 0 ? Math.ceil(remaining / contribution) : null

  return {
    target,
    current,
    remaining,
    targetDate: targetDate?.dateKey || null,
    daysRemaining,
    monthsRemaining,
    requiredDaily,
    requiredMonthly,
    // Valeur historique de GoalsService, arrondie au supérieur.
    monthlyEffort: requiredMonthly === null ? null : Math.ceil(requiredMonthly),
    projectedMonths,
    progress: target > 0 ? Math.max(0, Math.min(100, (current / target) * 100)) : 0,
    isTargetValid: target > 0,
    isReached: target > 0 && current >= target,
    isDeadlineValid: Boolean(targetDate),
    status: target > 0 && current >= target
      ? 'reached'
      : !targetDate
        ? 'none'
        : daysRemaining < 0
          ? 'past'
          : daysRemaining === 0
            ? 'due'
            : 'future'
  }
}

export default { calculateGoalMetrics, normalizeGoalTargetDate, selectPrimaryGoal }
