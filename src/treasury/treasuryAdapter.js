import { MonthlyBudgetStateService } from '../../js/monthlyBudgetStateService.js'
import { TransactionsService } from '../../js/transactionsService.js'
import { DEFAULT_BUDGET_CATEGORIES } from '../../js/budgetCategoriesService.js'
import { SettingsService } from '../settings/settingsService.js'
import { resolveBudgetWithRecurring } from '../finance/recurringResolution.js'

const safeNumber = (v) => {
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}

const guessDayFromMetadata = (meta) => {
  if (!meta) return 5
  if (meta.payday) return Number(meta.payday) || 5
  if (meta.day) return Number(meta.day) || 5
  return 5
}

const categoriesById = new Map(DEFAULT_BUDGET_CATEGORIES.map((category) => [category.id, category]))
const incomeKeys = DEFAULT_BUDGET_CATEGORIES.filter((category) => category.type === 'income').map((category) => category.id)
const expenseKeys = DEFAULT_BUDGET_CATEGORIES.filter((category) => category.type === 'fixed_expense' || category.type === 'variable_expense').map((category) => category.id)

const readAmount = (budgetData, key) => {
  if (Object.prototype.hasOwnProperty.call(budgetData, key)) return safeNumber(budgetData[key])
  if (Object.prototype.hasOwnProperty.call(budgetData, `${key}_reel`)) return safeNumber(budgetData[`${key}_reel`])
  return 0
}

const readPaidAmount = (budgetData, key) => {
  const total = readAmount(budgetData, key)
  const paid = budgetData[`${key}_paye`]
  if (paid === true) return total
  if (paid === false) return 0
  return Math.min(total, Math.max(0, safeNumber(paid)))
}

const mapBudgetEntriesToFlows = (budgetData = {}) => {
  const revenues = []
  const charges = []
  const recurringIncomes = Array.isArray(budgetData.__recurringIncomes) ? budgetData.__recurringIncomes : []
  const billSchedules = Array.isArray(budgetData.__billSchedules) ? budgetData.__billSchedules : []
  const { resolved } = resolveBudgetWithRecurring({
    budgetData,
    incomeKeys,
    expenseKeys,
    categoriesById,
    recurringIncomes,
    billSchedules
  })

  incomeKeys.forEach((key) => {
    const amount = safeNumber(resolved[key])
    if (amount <= 0) return
    const category = categoriesById.get(key)
    revenues.push({
      amount,
      frequency: 'monthly',
      day: guessDayFromMetadata(budgetData[`${key}_meta`]),
      title: category?.name || key,
      sourceKey: key,
      dateEstimated: true
    })
  })

  expenseKeys.forEach((key) => {
    const amount = safeNumber(resolved[key])
    if (amount <= 0) return
    const remaining = Math.max(0, amount - readPaidAmount(budgetData, key))
    if (remaining <= 0) return
    const category = categoriesById.get(key)
    charges.push({
      amount: remaining,
      date: guessDayFromMetadata(budgetData[`${key}_meta`]),
      title: category?.name || key,
      sourceKey: key,
      priority: 'standard',
      dateEstimated: true
    })
  })

  return { revenues, charges }
}

const fetchCurrentMonthBudget = async (monthKey) => {
  const [recurringIncomes, billSchedules] = await Promise.all([
    SettingsService.loadRecurringIncomes().catch(() => []),
    SettingsService.loadBillSchedules().catch(() => [])
  ])
  const withRecurring = (budget = {}) => ({ ...budget, __recurringIncomes: recurringIncomes, __billSchedules: billSchedules })

  // Try MonthlyBudgetStateService first
  try {
    const res = await MonthlyBudgetStateService.getMonthlyBudgetState(monthKey)
    if (res && res.data && Object.keys(res.data).length > 0) {
      // If structure contains transactions array, map them
      const data = res.data
      if (Array.isArray(data.transactions) && data.transactions.length > 0) {
        const revenues = []
        const charges = []
        data.transactions.forEach(t => {
          const amt = safeNumber(t.amount)
          const date = t.transaction_date || t.date || null
          const title = t.label || t.title || t.note || 'Transaction'
          const priority = (t.priority || t.metadata?.priority || 'normale')
          if (amt >= 0 && (t.transaction_type === 'income' || t.type === 'income' || t.category === 'income')) {
            revenues.push({ amount: amt, frequency: 'once', date, title })
          } else {
            charges.push({ amount: Math.abs(amt), date, title, priority })
          }
        })
        return { revenues, charges }
      }
      // Fallback: use generic budget entries
      if (data.budget_entries) {
        return mapBudgetEntriesToFlows(withRecurring(data.budget_entries))
      }
    }
  } catch (e) {
    // ignore and fallback to transactions
  }

  // Fallback: try TransactionsService.getBudgetMonth
  try {
    const budget = await TransactionsService.getBudgetMonth(monthKey)
    if (budget && Object.keys(budget).length > 0) {
      return mapBudgetEntriesToFlows(withRecurring(budget))
    }
  } catch (e) {
    // final fallback
  }

  return { revenues: [], charges: [] }
}

export default {
  fetchCurrentMonthBudget
}
