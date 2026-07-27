export const COACH_THRESHOLDS = Object.freeze({
  expenseRateWarning: 80,
  expenseRateCritical: 100,
  dailyRemainderWarning: 30,
  dailyRemainderCritical: 15,
  minimumSecurityMargin: 150,
  securityMarginIncomeRate: 0.1,
  surplusAllocationRate: 0.6,
  minimumAllocatableAmount: 10
})

export const clamp = (value, min = 0, max = 100) => {
  const number = Number(value)
  return Number.isFinite(number) ? Math.max(min, Math.min(max, number)) : min
}

export const clampScore = value => clamp(value, 0, 100)

export const linearScore = ({
  value,
  inputMin,
  inputMax,
  scoreMin,
  scoreMax
}) => {
  if (inputMax <= inputMin) return clampScore(scoreMax)
  const ratio = clamp((value - inputMin) / (inputMax - inputMin), 0, 1)
  return clampScore(scoreMin + ratio * (scoreMax - scoreMin))
}

export const calculateSecurityMargin = (monthly = {}, options = {}) => {
  const minimum = Math.max(0, Number(options.minimumSecurityMargin ?? COACH_THRESHOLDS.minimumSecurityMargin) || 0)
  const incomeRate = clamp(
    options.securityMarginIncomeRate ?? COACH_THRESHOLDS.securityMarginIncomeRate,
    0,
    1
  )
  const income = Math.max(0, Number(monthly?.income) || 0)
  return Math.max(minimum, income * incomeRate)
}

export const calculateDailyRemainder = (context) => {
  const remainingDays = Number(context?.cycle?.remainingDays)
  const projectedBalance = Number(context?.monthly?.projectedBalance)
  if (!Number.isFinite(remainingDays) || remainingDays <= 0 || !Number.isFinite(projectedBalance)) return null
  return Math.max(0, projectedBalance) / remainingDays
}

export const hasCriticalFinancialRisk = (context, thresholds = COACH_THRESHOLDS) => {
  const projectedBalance = Number(context?.monthly?.projectedBalance)
  if (Number.isFinite(projectedBalance) && projectedBalance < 0) return true

  const expenseRate = Number(context?.monthly?.expenseRate)
  if (Number.isFinite(expenseRate) && expenseRate >= thresholds.expenseRateCritical) return true

  const dailyRemainder = calculateDailyRemainder(context)
  return dailyRemainder !== null && dailyRemainder <= thresholds.dailyRemainderCritical
}

export default {
  COACH_THRESHOLDS,
  clamp,
  clampScore,
  linearScore,
  calculateSecurityMargin,
  calculateDailyRemainder,
  hasCriticalFinancialRisk
}
