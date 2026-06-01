import { MonthlyBudgetStateService } from '../../js/monthlyBudgetStateService.js'
import { TransactionsService } from '../../js/transactionsService.js'

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

const mapBudgetEntriesToFlows = (budgetData = {}) => {
  const revenues = []
  const charges = []

  Object.keys(budgetData).forEach(k => {
    const val = budgetData[k]
    if (k.startsWith('rev_') || k.toLowerCase().includes('revenu') || k.toLowerCase().includes('salary')) {
      // mark dateEstimated when no explicit payday metadata
      revenues.push({ amount: safeNumber(val), frequency: 'monthly', day: 5, title: k, dateEstimated: true })
    } else {
      // treat as charge
      charges.push({ amount: safeNumber(val), date: 5, title: k, priority: 'standard', dateEstimated: true })
    }
  })

  return { revenues, charges }
}

const fetchCurrentMonthBudget = async (monthKey) => {
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
        return mapBudgetEntriesToFlows(data.budget_entries)
      }
    }
  } catch (e) {
    // ignore and fallback to transactions
  }

  // Fallback: try TransactionsService.getBudgetMonth
  try {
    const budget = await TransactionsService.getBudgetMonth(monthKey)
    if (budget && Object.keys(budget).length > 0) {
      return mapBudgetEntriesToFlows(budget)
    }
  } catch (e) {
    // final fallback
  }

  return { revenues: [], charges: [] }
}

export default {
  fetchCurrentMonthBudget
}
