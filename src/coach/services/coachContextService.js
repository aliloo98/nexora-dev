import { STORAGE_KEYS } from '../../constants/storageKeys.js'
import { computeBudgetCycle, daysInMonth } from '../../finance/budgetCycle.js'
import { computeMonthlyMetrics } from '../../finance/monthlyMetrics.js'
import { createCoachContext } from '../models/coachContext.js'

const MONTH_KEY_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/

const previousMonth = (year, month) => month === 1
  ? { year: year - 1, month: 12 }
  : { year, month: month - 1 }

const makeDateKey = (year, month, day) => {
  const safeDay = Math.min(Math.max(1, Number(day) || 1), daysInMonth(year, month))
  return `${year}-${String(month).padStart(2, '0')}-${String(safeDay).padStart(2, '0')}`
}

const normalizeUpcomingCharges = (billSchedules, monthKey, cycle, asOf) => {
  const [year, month] = monthKey.split('-').map(Number)
  const referenceDate = (asOf instanceof Date ? asOf.toISOString() : String(asOf)).slice(0, 10)

  return (Array.isArray(billSchedules) ? billSchedules : [])
    .map((bill) => {
      const amount = Number(bill?.amount)
      if (!Number.isFinite(amount) || amount <= 0) return null
      const day = Math.max(1, Math.min(31, Number(bill.day || bill.dueDay || bill.date) || 1))
      let dueDate = makeDateKey(year, month, day)
      if (dueDate > cycle.end && cycle.start.slice(0, 7) !== monthKey) {
        const previous = previousMonth(year, month)
        dueDate = makeDateKey(previous.year, previous.month, day)
      }
      if (dueDate < referenceDate || dueDate > cycle.end || dueDate < cycle.start) return null

      return {
        id: String(bill.id || `${bill.linkedCharge || 'charge'}-${day}`),
        title: String(bill.name || bill.title || 'Charge planifiée'),
        amount,
        day,
        dueDate,
        priority: String(bill.priority || 'standard'),
        categoryId: String(bill.linkedCharge || bill.categoryKey || bill.key || '')
      }
    })
    .filter(Boolean)
    .sort((left, right) => left.dueDate.localeCompare(right.dueDate) || left.id.localeCompare(right.id))
}

const normalizeHistory = (value) => {
  const snapshots = Array.isArray(value)
    ? value
    : Object.values(value?.snapshots && typeof value.snapshots === 'object' ? value.snapshots : {})

  return snapshots
    .filter(snapshot => snapshot && typeof snapshot === 'object')
    .map(snapshot => ({
      month: String(snapshot.month || snapshot.metrics?.month || ''),
      range: snapshot.range || null,
      metrics: snapshot.metrics || {}
    }))
    .filter(snapshot => MONTH_KEY_PATTERN.test(snapshot.month))
    .sort((left, right) => left.month.localeCompare(right.month))
}

const readSettingValue = async (service, key) => {
  const result = await service.getSetting(key)
  return result?.value ?? null
}

const defaultDependencies = {
  monthlyBudgetStateService: {
    async getMonthlyBudgetState(monthKey) {
      const { MonthlyBudgetStateService } = await import('../../../js/monthlyBudgetStateService.js')
      return MonthlyBudgetStateService.getMonthlyBudgetState(monthKey)
    }
  },
  budgetCategoriesService: {
    async getBudgetCategories(options) {
      const { BudgetCategoriesService } = await import('../../../js/budgetCategoriesService.js')
      return BudgetCategoriesService.getBudgetCategories(options)
    }
  },
  goalsService: {
    async listUserFacingGoals() {
      const { GoalsService } = await import('../../goals/goalsService.js')
      return GoalsService.listUserFacingGoals()
    }
  },
  userAppSettingsService: {
    async getSetting(key) {
      const { UserAppSettingsService } = await import('../../../js/userAppSettingsService.js')
      return UserAppSettingsService.getSetting(key)
    }
  },
  settingsService: {
    async loadRecurringIncomes() {
      const { SettingsService } = await import('../../settings/settingsService.js')
      return SettingsService.loadRecurringIncomes()
    },
    async loadBillSchedules() {
      const { SettingsService } = await import('../../settings/settingsService.js')
      return SettingsService.loadBillSchedules()
    }
  }
}

export function createCoachContextService(dependencies = {}) {
  const monthlyBudgetStateService = dependencies.monthlyBudgetStateService || defaultDependencies.monthlyBudgetStateService
  const budgetCategoriesService = dependencies.budgetCategoriesService || defaultDependencies.budgetCategoriesService
  const goalsService = dependencies.goalsService || defaultDependencies.goalsService
  const userAppSettingsService = dependencies.userAppSettingsService || defaultDependencies.userAppSettingsService
  const settingsService = dependencies.settingsService || defaultDependencies.settingsService

  return Object.freeze({
    async buildContext({ monthKey, asOf } = {}) {
      if (!MONTH_KEY_PATTERN.test(String(monthKey || ''))) {
        throw new TypeError('CoachContextService requires a YYYY-MM monthKey')
      }
      if (!asOf || !Number.isFinite(Date.parse(asOf instanceof Date ? asOf.toISOString() : String(asOf)))) {
        throw new TypeError('CoachContextService requires a valid asOf')
      }

      const [
        monthlyState,
        categories,
        goals,
        recurringIncomes,
        billSchedules,
        cycleSettings,
        historyValue
      ] = await Promise.all([
        monthlyBudgetStateService.getMonthlyBudgetState(monthKey),
        budgetCategoriesService.getBudgetCategories({ includeInactive: false }),
        typeof goalsService.listUserFacingGoals === 'function'
          ? goalsService.listUserFacingGoals()
          : goalsService.listGoals(),
        settingsService.loadRecurringIncomes(),
        settingsService.loadBillSchedules(),
        readSettingValue(userAppSettingsService, STORAGE_KEYS.budgetCycleSettings),
        readSettingValue(userAppSettingsService, STORAGE_KEYS.monthlyHistorySnapshots)
      ])

      const activeCategories = Array.isArray(categories) ? categories : []
      const metrics = computeMonthlyMetrics({
        monthKey,
        budgetData: monthlyState?.data || {},
        categories: activeCategories,
        recurringIncomes,
        billSchedules
      })
      const cycle = computeBudgetCycle({
        monthKey,
        settings: cycleSettings || { mode: 'calendar' },
        asOf
      })
      const history = normalizeHistory(historyValue)
      const missingFields = [
        ...(!metrics.presence.income ? ['income'] : []),
        ...(!metrics.presence.expenses ? ['expenses'] : [])
      ]
      const completeness = (2 - missingFields.length) / 2
      const dataQuality = {
        completeness,
        missingFields,
        historyDepth: history.length,
        isReliable: missingFields.length === 0
      }

      return createCoachContext({
        asOf,
        monthKey,
        cycle,
        monthly: {
          income: metrics.income,
          plannedExpenses: metrics.plannedExpenses,
          paidExpenses: metrics.paidExpenses,
          currentBalance: metrics.currentBalance,
          projectedBalance: metrics.projectedBalance,
          remainingExpenses: metrics.remainingExpenses,
          expenseRate: metrics.expenseRate
        },
        categories: metrics.categories,
        upcomingCharges: normalizeUpcomingCharges(billSchedules, monthKey, cycle, asOf),
        goals,
        history,
        dataQuality
      })
    }
  })
}

export const CoachContextService = createCoachContextService()

export default CoachContextService
