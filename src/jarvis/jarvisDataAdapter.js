/**
 * Jarvis Data Adapter
 *
 * Collects and normalizes domain state for J4 Intelligence Engine.
 * No DOM rendering. Pure data transformation.
 */

import { GoalsService } from '../goals/goalsService.js'
import { SettingsService } from '../settings/settingsService.js'

/**
 * Builds the intelligence input for J4 from Nexora domain state
 * 
 * IMPORTANT: This function MUST distinguish between:
 * - API failure (dataAvailability = 'unknown')
 * - Known empty data (dataAvailability = 'known' + empty array)
 * 
 * This is critical for J4 to properly assess data quality.
 */
export async function buildJarvisIntelligenceInput(monthKey) {
  let metrics = {}
  let goals = []
  let debts = []
  let billSchedules = []
  
  let goalsAvailability = 'unknown'
  let debtsAvailability = 'unknown'

  try {
    // 1. Collect current month metrics
    // AUDIT: window.getMonthMetrics is the canonical application API
    // It orchestrates budget data reading and cycle balance computation
    // No direct ES module API exists that replaces this without major refactor
    // Note: fromDom: true is used because the legacy implementation reads from UI state
    // This is NOT ideal but acceptable for V1 given the scope constraints
    const getMonthMetrics = window.getMonthMetrics
    if (typeof getMonthMetrics === 'function') {
      metrics = getMonthMetrics(monthKey, { fromDom: true }) || {}
    }

    // 2. Collect history (currently not implemented as separate service)
    // Use empty array - this will cause INSUFFICIENT_HISTORY issue but NOT block full cockpit
    const history = []

    // 3. Collect goals with proper availability tracking
    try {
      goals = await GoalsService.getGoals()
      goalsAvailability = 'known'
    } catch (error) {
      console.warn('[Jarvis Data Adapter] Goals API failed:', error)
      goals = []
      goalsAvailability = 'unknown'
    }

    // 4. Collect debts with proper availability tracking
    // AUDIT: window.readDebts may be synchronous or Promise
    const readDebts = window.readDebts
    if (typeof readDebts === 'function') {
      const debtsResult = readDebts()
      if (debtsResult instanceof Promise) {
        try {
          debts = await debtsResult
          debtsAvailability = 'known'
        } catch (error) {
          console.warn('[Jarvis Data Adapter] Debts API failed:', error)
          debts = []
          debtsAvailability = 'unknown'
        }
      } else {
        // Synchronous result
        debts = debtsResult || []
        debtsAvailability = 'known'
      }
    }

    // 5. Collect bill schedules
    try {
      billSchedules = await SettingsService.getBillSchedules()
    } catch (error) {
      console.warn('[Jarvis Data Adapter] Bill schedules API failed:', error)
      billSchedules = []
    }

    return {
      metrics: normalizeMetrics(metrics),
      history: normalizeHistory(history),
      goals: normalizeGoals(goals),
      debts: normalizeDebts(debts),
      billSchedules: normalizeBillSchedules(billSchedules),
      dataAvailability: {
        goals: goalsAvailability,
        debts: debtsAvailability
      }
    }
  } catch (error) {
    console.warn('[Jarvis Data Adapter] Error building intelligence input:', error)
    // Fallback with empty data to avoid crash
    return {
      metrics: {},
      history: [],
      goals: [],
      debts: [],
      billSchedules: [],
      dataAvailability: {
        goals: 'unknown',
        debts: 'unknown'
      }
    }
  }
}

/**
 * Normalizes metrics for J4 contract
 * window.getMonthMetrics returns: { income, fixed, variable, expenses, paidExpenses, savings, savingsRate, ... }
 * J4 expects: { income, fixedExpenses, variableExpenses, plannedExpenses, paidExpenses, savingsRate }
 */
function normalizeMetrics(metrics) {
  return {
    income: metrics.income || 0,
    fixedExpenses: metrics.fixed || 0,
    variableExpenses: metrics.variable || 0,
    plannedExpenses: metrics.expenses || 0,
    paidExpenses: metrics.paidExpenses || 0,
    savingsRate: metrics.savingsRate || 0
  }
}

/**
 * Normalizes history for J4 contract
 * Contract: [{ income, expenses }]
 */
function normalizeHistory(history) {
  if (!Array.isArray(history)) return []

  return history
    .slice(0, 6) // Keep max 6 months
    .map(month => ({
      income: month.income || 0,
      expenses: month.expenses || 0
    }))
    .filter(h => h.income > 0 || h.expenses > 0) // Filter empty months
}

/**
 * Normalizes goals for J4 contract
 */
function normalizeGoals(goals) {
  if (!Array.isArray(goals)) return []

  return goals
    .filter(g => g && (g.target || g.targetAmount))
    .map(g => ({
      id: g.id,
      target: g.target || g.targetAmount,
      current: g.current || g.amount || 0,
      isPrimary: g.isPrimary === true,
      targetDate: g.targetDate || null
    }))
}

/**
 * Normalizes debts for J4 contract
 */
function normalizeDebts(debts) {
  if (!Array.isArray(debts)) return []

  return debts
    .filter(d => d && (d.balance || d.amount))
    .map(d => ({
      id: d.id,
      balance: d.balance || d.amount,
      ratePct: d.ratePct || d.rate || 0,
      minPayment: d.minPayment || 0
    }))
}

/**
 * Normalizes bill schedules for J4 contract
 */
function normalizeBillSchedules(billSchedules) {
  if (!Array.isArray(billSchedules)) return []

  return billSchedules
    .filter(b => b && b.amount)
    .map(b => ({
      id: b.id,
      amount: b.amount,
      dayOfMonth: b.dayOfMonth,
      recurrence: b.recurrence || 'monthly'
    }))
}
