import { SCENARIO_TYPES } from './jarvisIntentParser.js'

function toFiniteNumber(value, fallback = 0) {
  const number = Number(value)
  return Number.isFinite(number) ? number : fallback
}

function cloneScenarioBase(snapshot = {}) {
  const cashflow = snapshot.cashflow || {}
  const savings = snapshot.savings || {}
  const forecast = snapshot.forecast || {}
  const debt = snapshot.debt || null

  return {
    margin: toFiniteNumber(cashflow.projected),
    remainingSpend: toFiniteNumber(cashflow.remaining),
    savingsAmount: toFiniteNumber(savings.amount),
    forecastFinalBalance: toFiniteNumber(forecast.finalBalance, toFiniteNumber(cashflow.projected)),
    lowestBalance: toFiniteNumber(forecast.lowestBalance, toFiniteNumber(cashflow.projected)),
    debtTotal: debt ? toFiniteNumber(debt.total) : null,
    debtMonthlyTotal: debt ? toFiniteNumber(debt.monthlyTotal) : null
  }
}

function classifyRisk(projectedMargin) {
  if (projectedMargin < 0) return 'critical'
  if (projectedMargin < 100) return 'high'
  if (projectedMargin < 300) return 'medium'
  return 'low'
}

function buildAfter(base, type, amount) {
  if (type === SCENARIO_TYPES.REDUCE_EXPENSE) {
    return {
      ...base,
      margin: base.margin + amount,
      remainingSpend: base.remainingSpend + amount,
      forecastFinalBalance: base.forecastFinalBalance + amount,
      lowestBalance: base.lowestBalance + amount
    }
  }

  if (type === SCENARIO_TYPES.ADD_SAVINGS) {
    return {
      ...base,
      margin: base.margin - amount,
      remainingSpend: base.remainingSpend - amount,
      savingsAmount: base.savingsAmount + amount,
      forecastFinalBalance: base.forecastFinalBalance - amount,
      lowestBalance: base.lowestBalance - amount
    }
  }

  if (type === SCENARIO_TYPES.DEBT_EXTRA_PAYMENT) {
    if (base.debtTotal === null) {
      return null
    }
    return {
      ...base,
      margin: base.margin - amount,
      remainingSpend: base.remainingSpend - amount,
      debtTotal: Math.max(0, base.debtTotal - amount),
      forecastFinalBalance: base.forecastFinalBalance - amount,
      lowestBalance: base.lowestBalance - amount
    }
  }

  return {
    ...base,
    margin: base.margin - amount,
    remainingSpend: base.remainingSpend - amount,
    forecastFinalBalance: base.forecastFinalBalance - amount,
    lowestBalance: base.lowestBalance - amount
  }
}

function simulateJarvisScenario(snapshot = {}, request = {}) {
  const amount = toFiniteNumber(request.amount)
  const type = request.type || SCENARIO_TYPES.ADD_EXPENSE

  if (amount <= 0) {
    return {
      ok: false,
      type,
      reason: 'missing_amount',
      amount: null,
      readonly: true
    }
  }

  const before = cloneScenarioBase(snapshot)
  const after = buildAfter(before, type, amount)

  if (!after) {
    return {
      ok: false,
      type,
      reason: 'unsupported_debt_data',
      amount,
      readonly: true
    }
  }

  return {
    ok: true,
    type,
    amount,
    readonly: true,
    before,
    after,
    diff: {
      margin: after.margin - before.margin,
      remainingSpend: after.remainingSpend - before.remainingSpend,
      savingsAmount: after.savingsAmount - before.savingsAmount,
      forecastFinalBalance: after.forecastFinalBalance - before.forecastFinalBalance,
      lowestBalance: after.lowestBalance - before.lowestBalance,
      debtTotal: before.debtTotal === null || after.debtTotal === null ? null : after.debtTotal - before.debtTotal
    },
    risk: {
      before: classifyRisk(before.margin),
      after: classifyRisk(after.margin)
    }
  }
}

export {
  simulateJarvisScenario
}
