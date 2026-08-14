/**
 * Jarvis Data Adapter
 *
 * Collects and normalizes domain state for J4 Intelligence Engine.
 * No DOM rendering. Pure data transformation.
 * Uses canonical domain services without DOM dependencies.
 */

import { computeMonthlyMetrics } from '../finance/monthlyMetrics.js'
import { STORAGE_KEYS } from '../constants/storageKeys.js'

const MONTH_KEY_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/

/**
 * Normalizes history from stored snapshots for J4 contract
 * J4 expects: [{ income, expenses }]
 */
function normalizeHistory(snapshots) {
  if (!Array.isArray(snapshots)) return []

  return snapshots
    .filter(snapshot => snapshot && typeof snapshot === 'object')
    .map(snapshot => ({
      income: snapshot.metrics?.income || 0,
      expenses: snapshot.metrics?.expenses || 0
    }))
    .filter(h => h.income > 0 || h.expenses > 0)
    .slice(0, 6) // Keep max 6 months
}

/**
 * Normalizes goals for J4 contract
 * Uses only fields present in actual J4 output
 */
function normalizeGoals(goals) {
  if (!Array.isArray(goals)) return []

  return goals
    .filter(g => g && (g.target || g.targetAmount))
    .map(g => ({
      target: g.target || g.targetAmount,
      current: g.current || g.amount || 0,
      targetDate: g.targetDate || null
    }))
}

/**
 * Normalizes debts for J4 contract
 */
function normalizeDebts(debts) {
  if (!Array.isArray(debts)) return []

  return debts
    .filter(d => d && (d.balance || d.amount || d.remaining))
    .map(d => ({
      balance: d.balance || d.amount || d.remaining,
      ratePct: d.ratePct || d.rate || 0,
      minPayment: d.minPayment || d.monthly || 0
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
      amount: b.amount,
      dayOfMonth: b.dayOfMonth || b.dueDay || 1,
      recurrence: b.recurrence || 'monthly'
    }))
}

/**
 * Lazy default services. These mirror the coach context pattern so Node can
 * import this adapter without pulling browser storage modules at top level.
 */
const defaultMonthlyBudgetStateService = {
  async getMonthlyBudgetState(monthKey) {
    const { MonthlyBudgetStateService } = await import('../../js/monthlyBudgetStateService.js')
    return MonthlyBudgetStateService.getMonthlyBudgetState(monthKey)
  }
}

const defaultCategoriesService = {
  async getBudgetCategories(options) {
    const { BudgetCategoriesService } = await import('../../js/budgetCategoriesService.js')
    return BudgetCategoriesService.getBudgetCategories(options)
  }
}

const defaultGoalsService = {
  async listUserFacingGoals() {
    const { GoalsService } = await import('../goals/goalsService.js')
    return GoalsService.listUserFacingGoals()
  }
}

const defaultSettingsService = {
  async loadRecurringIncomes() {
    const { SettingsService } = await import('../settings/settingsService.js')
    return SettingsService.loadRecurringIncomes()
  },
  async loadBillSchedules() {
    const { SettingsService } = await import('../settings/settingsService.js')
    return SettingsService.loadBillSchedules()
  }
}

const defaultUserAppSettingsService = {
  async getSetting(key) {
    const { UserAppSettingsService } = await import('../../js/userAppSettingsService.js')
    return UserAppSettingsService.getSetting(key)
  }
}

const readSettingValue = async (service, key, defaultValue) => {
  const result = await service.getSetting(key)
  return result?.value ?? defaultValue
}

/**
 * Default debt reader.
 * Node gets an empty fallback; browser production imports the real debt reader.
 */
const defaultReadDebtsFn = async () => {
  if (typeof window === 'undefined') return []
  const { readDebts } = await import('../plan/planDataBuilder.js')
  if (typeof readDebts !== 'function') {
    throw new TypeError('Jarvis adapter debt reader is unavailable')
  }
  return readDebts()
}

/**
 * Builds the intelligence input for J4 from Nexora domain state
 * 
 * IMPORTANT: This function MUST distinguish between:
 * - API failure (dataAvailability = 'unknown')
 * - Known empty data (dataAvailability = 'known' + empty array)
 * 
 * This is critical for J4 to properly assess data quality.
 */
export async function buildJarvisIntelligenceInput(monthKey, dependencies = {}) {
  const monthlyBudgetStateService = dependencies.monthlyBudgetStateService || defaultMonthlyBudgetStateService
  const budgetCategoriesService = dependencies.budgetCategoriesService || defaultCategoriesService
  const goalsService = dependencies.goalsService || defaultGoalsService
  const settingsService = dependencies.settingsService || defaultSettingsService
  const userAppSettingsService = dependencies.userAppSettingsService || defaultUserAppSettingsService
  const readDebtsFn = dependencies.readDebtsFn || defaultReadDebtsFn
  const historyReader = dependencies.historyReader || ((key, defaultValue) => (
    readSettingValue(userAppSettingsService, key, defaultValue)
  ))

  let metrics = {}
  let history = []
  let goals = []
  let debts = []
  let billSchedules = []
  let recurringIncomes = []
  
  let goalsAvailability = 'unknown'
  let debtsAvailability = 'unknown'
  let historyAvailability = 'unknown'

  try {
    if (!MONTH_KEY_PATTERN.test(String(monthKey || ''))) {
      throw new TypeError('Jarvis adapter requires a YYYY-MM monthKey')
    }

    // 1. Collect current month budget state and categories
    const [monthlyState, categories] = await Promise.all([
      monthlyBudgetStateService.getMonthlyBudgetState(monthKey),
      budgetCategoriesService.getBudgetCategories({ includeInactive: false })
    ])

    // 2. Collect recurring incomes and bill schedules
    const [recurringIncomesData, billSchedulesData] = await Promise.all([
      settingsService.loadRecurringIncomes(),
      settingsService.loadBillSchedules()
    ])
    recurringIncomes = recurringIncomesData || []
    billSchedules = billSchedulesData || []

    // 3. Compute metrics using canonical domain function
    metrics = computeMonthlyMetrics({
      monthKey,
      budgetData: monthlyState?.data || {},
      categories: categories || [],
      recurringIncomes,
      billSchedules
    })

    // 4. Collect history from stored snapshots
    try {
      const historyValue = await historyReader(STORAGE_KEYS.monthlyHistorySnapshots, [])
      history = normalizeHistory(historyValue)
      historyAvailability = 'known'
    } catch (error) {
      console.warn('[Jarvis Data Adapter] History read failed:', error)
      history = []
      historyAvailability = 'unknown'
    }

    // 5. Collect goals with proper availability tracking
    try {
      goals = await goalsService.listUserFacingGoals()
      goalsAvailability = 'known'
    } catch (error) {
      console.warn('[Jarvis Data Adapter] Goals API failed:', error)
      goals = []
      goalsAvailability = 'unknown'
    }

    // 6. Collect debts using canonical ES module
    try {
      debts = await readDebtsFn()
      debtsAvailability = 'known'
    } catch (error) {
      console.warn('[Jarvis Data Adapter] Debts API failed:', error)
      debts = []
      debtsAvailability = 'unknown'
    }

    return {
      metrics: {
        income: metrics.income || 0,
        fixedExpenses: metrics.fixedExpenses || 0,
        variableExpenses: metrics.variableExpenses || 0,
        plannedExpenses: metrics.plannedExpenses || 0,
        paidExpenses: metrics.paidExpenses || 0
      },
      history,
      goals: normalizeGoals(goals),
      debts: normalizeDebts(debts),
      billSchedules: normalizeBillSchedules(billSchedules),
      dataAvailability: {
        goals: goalsAvailability,
        debts: debtsAvailability,
        history: historyAvailability
      }
    }
  } catch (error) {
    console.warn('[Jarvis Data Adapter] Error building intelligence input:', error)
    // Fallback with empty data to avoid crash
    return {
      metrics: {
        income: 0,
        fixedExpenses: 0,
        variableExpenses: 0,
        plannedExpenses: 0,
        paidExpenses: 0
      },
      history: [],
      goals: [],
      debts: [],
      billSchedules: [],
      dataAvailability: {
        goals: 'unknown',
        debts: 'unknown',
        history: 'unknown'
      }
    }
  }
}
