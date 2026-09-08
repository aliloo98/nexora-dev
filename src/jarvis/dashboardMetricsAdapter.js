/**
 * Dashboard Metrics Adapter for Jarvis V2.1
 *
 * Transforms Dashboard metrics (from renderDashboardHero) into a V2.1 snapshot
 * compatible with the Intelligence Engine and Jarvis Decision Context.
 *
 * This ensures North Star and Jarvis use the EXACT SAME financial data.
 */

const toFiniteNumber = (value, fallback = 0) => {
  const number = Number(value)
  return Number.isFinite(number) ? number : fallback
}

/**
 * Determines the financial situation from Dashboard metrics
 * Mirrors the logic from buildSituationCopy in renderDashboardHero.js
 */
function determineSituation(metrics = {}) {
  const revReel = toFiniteNumber(metrics.revReel)
  const solde = toFiniteNumber(metrics.solde)
  const soldeEstime = toFiniteNumber(metrics.soldeEstime, solde)
  const tauxCh = toFiniteNumber(metrics.tauxCh)
  const variablesPct = toFiniteNumber(metrics.variablesPct)
  const totalDepRestant = toFiniteNumber(metrics.totalDepRestant ?? metrics.remainingToSpend)
  const hasBudgetData = Boolean(metrics.hasBudgetData || metrics.hasData || revReel > 0 || metrics.fixReel > 0 || metrics.varReel > 0 || totalDepRestant > 0)

  // Check if hydrating
  const isHydrating = metrics.loading === true || metrics.hydrating === true || metrics.isHydrating === true || metrics.hydrationComplete === false

  if (isHydrating || !hasBudgetData) {
    return 'incomplete'
  }

  // Deficit (danger)
  if (solde < 0) {
    return 'deficit'
  }

  // Low margin (warning)
  const marginFloor = revReel > 0 ? revReel * 0.1 : 0
  const safetyMargin = toFiniteNumber(metrics.safetyMargin, Math.max(0, soldeEstime))
  if (safetyMargin < marginFloor || solde < marginFloor) {
    return 'fragile'
  }

  // High variable expenses (warning)
  if (variablesPct > 40) {
    return 'fragile'
  }

  // Stable/healthy
  return 'stable'
}

/**
 * Builds a V2.1 snapshot from Dashboard metrics
 *
 * Mapping:
 * - income ← metrics.revReel
 * - balance ← metrics.soldeEstime (current balance)
 * - projectedBalance ← metrics.solde (projected end of cycle)
 * - available ← metrics.safetyMargin (with fallback to soldeEstime)
 * - remainingExpenses ← metrics.totalDepRestant or metrics.remainingToSpend
 * - fixedCharges ← metrics.fixReel
 * - variableCharges ← metrics.varReel
 * - expenses ← metrics.fixReel + metrics.varReel
 * - paidExpenses ← metrics.totalDepPayee
 * - situation ← derived from metrics (stable/fragile/deficit/incomplete)
 *
 * @param {Object} metrics - Dashboard metrics from renderDashboardHero
 * @param {Object} extraData - Additional data (goals, debts, history, trajectory)
 * @returns {Object} V2.1 snapshot compatible with Intelligence Engine
 */
export function buildSnapshotFromDashboardMetrics(metrics = {}, extraData = {}) {
  const {
    goals = [],
    debts = [],
    history = [],
    trajectory = null,
    monthKey = null
  } = extraData

  const revReel = toFiniteNumber(metrics.revReel)
  const solde = toFiniteNumber(metrics.solde)
  const soldeEstime = toFiniteNumber(metrics.soldeEstime, solde)
  const safetyMargin = toFiniteNumber(metrics.safetyMargin, Math.max(0, soldeEstime))
  const fixReel = toFiniteNumber(metrics.fixReel)
  const varReel = toFiniteNumber(metrics.varReel)
  const totalDepRestant = toFiniteNumber(metrics.totalDepRestant ?? metrics.remainingToSpend)
  const totalDepPayee = toFiniteNumber(metrics.totalDepPayee)
  const totalDepReel = toFiniteNumber(metrics.totalDepReel ?? (fixReel + varReel))
  const tauxCh = toFiniteNumber(metrics.tauxCh)
  const variablesPct = toFiniteNumber(metrics.variablesPct)
  const lowestBalance = toFiniteNumber(metrics.lowestBalance)

  // Use real metrics from updateAll() - these are now included in the dashboardMetrics object
  const income = revReel
  const fixedCharges = fixReel
  const variableCharges = varReel
  const expenses = totalDepReel
  const paidExpenses = totalDepPayee
  const currentBalance = soldeEstime
  const projectedBalance = solde
  const remainingExpenses = totalDepRestant
  const available = safetyMargin

  const situation = determineSituation(metrics)

  // Build cashflow object with real detailed metrics
  const cashflow = {
    income,
    expenses,
    fixed: fixedCharges,
    variable: variableCharges,
    paid: paidExpenses,
    projected: projectedBalance,
    remaining: remainingExpenses,
    available
  }

  // Build data quality assessment with real values
  const hasIncome = income > 0
  const hasExpenses = expenses > 0
  const hasBudgetData = hasIncome || hasExpenses

  const dataQuality = {
    isComplete: hasIncome && hasExpenses,
    hasIncome,
    hasExpenses,
    hasGoal: Array.isArray(goals) && goals.length > 0,
    hasDebt: Array.isArray(debts) && debts.length > 0,
    confidence: hasIncome && hasExpenses ? 'HIGH' : hasIncome || hasExpenses ? 'MEDIUM' : 'LOW',
    issues: []
  }

  if (!hasIncome) {
    dataQuality.issues.push({ code: 'NO_INCOME', severity: 'high' })
  }
  if (!hasExpenses) {
    dataQuality.issues.push({ code: 'NO_EXPENSES', severity: 'medium' })
  }

  // Build snapshot with real detailed metrics
  const snapshot = {
    // Core financial metrics
    income,
    balance: currentBalance,
    projectedBalance,
    available,
    remainingExpenses,
    fixedCharges,
    variableCharges,
    expenses,
    paidExpenses,

    // Cashflow structure
    cashflow,

    // Situation and health
    situation,
    health: {
      status: situation,
      pressure: tauxCh,
      savingsRate: metrics.savingsRate ?? (income > 0 ? ((projectedBalance / income) * 100) : 0)
    },

    // Data quality
    dataQuality,

    // Additional data
    goals,
    debts,
    history,
    trajectory: trajectory || {
      finalBalance: projectedBalance,
      lowestBalance: lowestBalance,
      lowestBalanceDay: null,
      overdraftRisk: projectedBalance < 0 ? 'HIGH' : 'NONE',
      trendsAvailable: false
    },

    // Metadata
    monthKey,
    confidence: dataQuality.confidence,

    // Empty arrays/objects for V2.1 contract compatibility
    risks: [],
    opportunities: [],
    priority: null,
    events: []
  }

  return snapshot
}
