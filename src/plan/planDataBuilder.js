import TreasuryService from '../treasury/treasuryService.js'
import TreasuryAdapter from '../treasury/treasuryAdapter.js'
import { SettingsService } from '../settings/settingsService.js'
import { computeCycleBalancesFromMetrics } from '../finance/cycleBalance.js'
import { filterUserFacingRecords } from '../utils/userFacingFilter.js'
import { STORAGE_KEYS } from '../constants/storageKeys.js'
import { readSyncedArray, writeSyncedArray } from '../../js/syncedSettingAccess.js'
import { parseAmount } from './planFormatters.js'

export const readDebts = async () => filterUserFacingRecords(await readSyncedArray(STORAGE_KEYS.debts, []))

export const saveDebts = async (debts) => writeSyncedArray(STORAGE_KEYS.debts, debts)

export const makeDebtId = () => `debt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`

export const isDemoMode = () => {
  try {
    return window.SafeStorage?.getItem?.('nexora_demo_mode_v1') === 'on' || localStorage.getItem('nexora_demo_mode_v1') === 'on'
  } catch {
    return false
  }
}

export const demoPlanData = () => {
  const fromDate = new Date('2026-06-01T00:00:00')
  const revenues = [
    { title: 'Salaire utilisateur', amount: 1700, frequency: 'once', date: '2026-06-05' },
    { title: 'Salaire foyer', amount: 1300, frequency: 'once', date: '2026-06-28' }
  ]
  const charges = [
    { title: 'Loyer', amount: 650, date: '2026-06-12', priority: 'critique' },
    { title: 'Électricité', amount: 95, date: '2026-06-18', priority: 'importante' },
    { title: 'Courses', amount: 420, date: '2026-06-20', priority: 'standard' }
  ]
  const { timeline, endingBalance } = TreasuryService.buildTimeline({ baseBalance: 940, revenues, charges, fromDate, days: 30 })
  return {
    timeline,
    endingBalance,
    projectedEndOfCycle: endingBalance,
    currentBalance: 940,
    baseBalance: 940,
    totalRevenue: 3000,
    totalCharges: 1165,
    totalFixedCharges: 745,
    totalVariableCharges: 420,
    targetSavings: 300,
    toPayNow: [],
    goals: [{ id: 'demo_goal', name: 'Coussin de sécurité', target: 1500, current: 450, targetDate: '2026-09-30' }],
    debts: [{ id: 'demo_debt', name: 'Crédit voiture', initial: 2400, remaining: 1800, monthly: 180 }]
  }
}

export const buildPlanData = async () => {
  if (isDemoMode()) return demoPlanData()

  const monthKey = typeof window.getMonth === 'function' ? window.getMonth() : new Date().toISOString().slice(0, 7)
  const fromDate = /^\d{4}-\d{2}$/.test(monthKey) ? new Date(`${monthKey}-01T00:00:00`) : new Date()

  // Calculate current balance from budget data
  let baseBalance = 0
  try {
    if (window.MonthlyBudgetStateService?.getCurrentBalance && typeof window.MonthlyBudgetStateService.getCurrentBalance === 'function') {
      baseBalance = await window.MonthlyBudgetStateService.getCurrentBalance(monthKey)
    }
  } catch (err) {
    console.warn('[PlanHubUI] calculateBalance failed, using 0:', err)
  }

  const [recurringIncomes, billSchedules, goals] = await Promise.all([
    SettingsService.loadRecurringIncomes(),
    SettingsService.loadBillSchedules(),
    window.GoalsService?.listUserFacingGoals
      ? window.GoalsService.listUserFacingGoals().catch(() => [])
      : filterUserFacingRecords(
        await (window.GoalsService?.listGoals ? window.GoalsService.listGoals().catch(() => []) : []),
        (goal) => goal?.name
      )
  ])

  const { revenues: fetchedRevenues, charges: fetchedCharges } = await TreasuryAdapter.fetchCurrentMonthBudget(monthKey)

  const normalizedRecurringIncomes = (recurringIncomes || []).map((income) => ({
      title: income.name || 'Revenu récurrent',
      amount: Number(income.amount) || 0,
      frequency: income.frequency || 'monthly',
      day: Number(income.day) || 1
    }))
    .filter((income) => income.amount > 0 && Number.isFinite(income.day) && income.day >= 1 && income.day <= 31)

  const revenues = normalizedRecurringIncomes.length > 0
    ? normalizedRecurringIncomes
    : (fetchedRevenues || []).filter((income) => income && income.dateEstimated !== true)

  const scheduleByKey = new Map()
  const scheduleByName = new Map()
  ;(billSchedules || []).forEach((bill) => {
    const normalized = {
      title: bill.name || 'Charge',
      amount: Number(bill.amount) || 0,
      date: Number(bill.day || bill.date) || 1,
      priority: bill.priority || 'standard',
      linkedCharge: bill.linkedCharge || ''
    }
    if (normalized.linkedCharge) scheduleByKey.set(normalized.linkedCharge, normalized)
    scheduleByName.set(normalized.title.toLowerCase(), normalized)
  })

  const linkedScheduleNames = new Set()
  const charges = (fetchedCharges || []).map((charge) => {
    const schedule = scheduleByKey.get(charge.sourceKey) || scheduleByName.get(String(charge.title || '').toLowerCase())
    if (!schedule) return charge
    linkedScheduleNames.add(schedule.title.toLowerCase())
    return {
      ...charge,
      date: schedule.date,
      priority: schedule.priority,
      dateEstimated: false
    }
  })

  ;(billSchedules || []).forEach((bill) => {
    const title = bill.name || 'Charge'
    const key = title.toLowerCase()
    const linkedCharge = bill.linkedCharge || ''
    if (linkedCharge && (fetchedCharges || []).some((charge) => charge.sourceKey === linkedCharge)) return
    if (linkedScheduleNames.has(key)) return
    charges.push({
      title,
      amount: Number(bill.amount) || 0,
      date: Number(bill.day || bill.date) || 1,
      priority: bill.priority || 'standard'
    })
  })

  const { timeline, endingBalance } = TreasuryService.buildTimeline({
    baseBalance,
    revenues,
    charges,
    fromDate,
    days: 30
  })

  const scheduledRevenue = revenues.reduce((sum, item) => sum + (Number(item.amount) || 0), 0)
  const budgetRevenue = (fetchedRevenues || []).reduce((sum, item) => sum + (Number(item.amount) || 0), 0)
  const totalCharges = charges.reduce((sum, item) => sum + (Number(item.amount) || 0), 0)
  const { toPayNow } = TreasuryService.suggestPayments({
    baseBalance,
    revenues,
    charges,
    fromDate,
    days: 30
  })

  const monthMetrics = typeof window.getMonthMetrics === 'function'
    ? (window.NexoraMetricsCache?.getCachedMonthMetrics
      ? window.NexoraMetricsCache.getCachedMonthMetrics(monthKey, () => window.getMonthMetrics(monthKey, { fromDom: true }))
      : window.getMonthMetrics(monthKey, { fromDom: true }))
    : { income: Math.max(scheduledRevenue, budgetRevenue), expenses: totalCharges, paidExpenses: 0 }
  const totalRevenue = Number(monthMetrics?.income) || 0
  const totalFixedCharges = Number(monthMetrics?.fixed) || Math.max(0, totalCharges - (Number(monthMetrics?.variable) || 0))
  const totalVariableCharges = Number(monthMetrics?.variable) || 0
  const cycleBalances = computeCycleBalancesFromMetrics(monthMetrics)
  const targetFromBudget = typeof window.getVal === 'function'
    ? Number(window.getVal('target_epargne') || 0)
    : Number(parseAmount(document.querySelector('[data-key="target_epargne"]')?.value || 0) || 0)
  const monthlyGoalContribution = Number(parseAmount(document.getElementById('goal-monthly-contrib')?.value || 0) || 0)
  const targetSavings = targetFromBudget > 0
    ? targetFromBudget
    : monthlyGoalContribution > 0
      ? monthlyGoalContribution
      : totalRevenue > 0
        ? Math.round(totalRevenue * 0.1)
        : 0

  return {
    timeline,
    endingBalance,
    projectedEndOfCycle: cycleBalances.projectedEndOfCycle,
    currentBalance: cycleBalances.currentBalance,
    baseBalance: cycleBalances.currentBalance,
    totalRevenue,
    totalCharges,
    totalFixedCharges,
    totalVariableCharges,
    paidExpenses: Number(monthMetrics?.paidExpenses) || 0,
    targetSavings,
    toPayNow,
    goals,
    debts: await readDebts()
  }
}
