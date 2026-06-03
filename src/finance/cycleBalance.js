/**
 * Source de vérité — soldes de cycle budgétaire (V6.4.1).
 *
 * Formules :
 * - soldeFinDeCycle (projectedEndOfCycle) = revenus du mois − dépenses prévues totales
 * - soldeActuel (currentBalance) = revenus du mois − dépenses déjà payées
 * - resteADepenser (remainingToSpend) = max(0, dépenses prévues − dépenses payées)
 */

const toFinite = (value) => {
  const number = Number(value)
  return Number.isFinite(number) ? number : 0
}

export function computeCycleBalances({
  income = 0,
  totalExpenses = 0,
  paidExpenses = 0
} = {}) {
  const rev = toFinite(income)
  const dep = toFinite(totalExpenses)
  const paid = Math.min(dep, Math.max(0, toFinite(paidExpenses)))
  const projectedEndOfCycle = rev - dep
  const currentBalance = rev - paid
  const remainingToSpend = Math.max(0, dep - paid)

  return {
    income: rev,
    totalExpenses: dep,
    paidExpenses: paid,
    projectedEndOfCycle,
    currentBalance,
    remainingToSpend,
    /** Alias historique dashboard / getMonthMetrics */
    savings: projectedEndOfCycle
  }
}

export function computeCycleBalancesFromMetrics(metrics = {}) {
  return computeCycleBalances({
    income: metrics.income,
    totalExpenses: metrics.expenses,
    paidExpenses: metrics.paidExpenses
  })
}

export default { computeCycleBalances, computeCycleBalancesFromMetrics }
