import { parseFinancialExpression } from './financialExpression.js'
import { computeCycleBalances } from './cycleBalance.js'
import { resolveBudgetWithRecurring } from './recurringResolution.js'

const CATEGORY_TYPES = new Set(['income', 'fixed_expense', 'variable_expense'])

const uniqueActiveCategories = (categories = []) => {
  const byId = new Map()
  for (const category of Array.isArray(categories) ? categories : []) {
    const id = String(category?.id || '').trim()
    if (!id || !CATEGORY_TYPES.has(category?.type) || category?.is_active === false) continue
    byId.set(id, { ...category, id })
  }
  return [...byId.values()]
}

const parseAmount = (value) => {
  const amount = parseFinancialExpression(value, { fallback: 0 })
  return Number.isFinite(amount) ? amount : 0
}

const hasOwn = (object, key) => Boolean(
  object
  && typeof object === 'object'
  && Object.prototype.hasOwnProperty.call(object, key)
)

export const hasBudgetAmount = (budgetData, key) => (
  hasOwn(budgetData, key) || hasOwn(budgetData, `${key}_reel`)
)

export const readBudgetAmount = (budgetData, key) => {
  if (hasOwn(budgetData, key)) return parseAmount(budgetData[key])
  if (hasOwn(budgetData, `${key}_reel`)) return parseAmount(budgetData[`${key}_reel`])
  return 0
}

export const readBudgetPaidAmount = (budgetData, key, amount = readBudgetAmount(budgetData, key)) => {
  if (!hasOwn(budgetData, `${key}_paye`)) return 0
  const paid = budgetData[`${key}_paye`]
  if (paid === true || paid === 'true' || paid === 1 || paid === '1') return Math.max(0, amount)
  if (paid === false || paid === 'false' || paid === 0 || paid === '0' || paid === '') return 0
  return Math.min(Math.max(0, amount), Math.max(0, parseAmount(paid)))
}

const buildResolvedBudget = ({
  budgetData,
  categories,
  recurringIncomes,
  billSchedules
}) => {
  const incomeKeys = categories.filter(category => category.type === 'income').map(category => category.id)
  const expenseKeys = categories.filter(category => category.type !== 'income').map(category => category.id)
  const normalizedBudget = { ...(budgetData || {}) }

  for (const key of [...incomeKeys, ...expenseKeys]) {
    if (hasBudgetAmount(budgetData, key)) normalizedBudget[key] = readBudgetAmount(budgetData, key)
  }

  return {
    incomeKeys,
    expenseKeys,
    ...resolveBudgetWithRecurring({
      budgetData: normalizedBudget,
      incomeKeys,
      expenseKeys,
      categoriesById: new Map(categories.map(category => [category.id, category])),
      recurringIncomes,
      billSchedules
    })
  }
}

/**
 * Source pure des agrégats mensuels.
 *
 * Les catégories actives, y compris personnalisées, définissent les clés prises
 * en compte. Les valeurs récurrentes utilisent le résolveur financier existant.
 */
export function computeMonthlyMetrics({
  monthKey = null,
  budgetData = {},
  categories = [],
  recurringIncomes = [],
  billSchedules = []
} = {}) {
  const normalizedCategories = uniqueActiveCategories(categories)
  const { incomeKeys, expenseKeys, resolved, decisions } = buildResolvedBudget({
    budgetData,
    categories: normalizedCategories,
    recurringIncomes,
    billSchedules
  })

  const lines = normalizedCategories.map((category) => {
    const amount = parseAmount(resolved[category.id])
    const paidAmount = category.type === 'income'
      ? 0
      : readBudgetPaidAmount(budgetData, category.id, amount)
    const decision = decisions.find(item => item.key === category.id)

    return {
      id: category.id,
      name: String(category.name || category.id),
      type: category.type,
      amount,
      paidAmount,
      isCustom: category.is_default !== true,
      source: decision?.source || 'manual_default'
    }
  })

  const sumType = (type) => lines
    .filter(line => line.type === type)
    .reduce((sum, line) => sum + line.amount, 0)

  const income = sumType('income')
  const fixedExpenses = sumType('fixed_expense')
  const variableExpenses = sumType('variable_expense')
  const plannedExpenses = fixedExpenses + variableExpenses
  const paidExpenses = lines
    .filter(line => line.type !== 'income')
    .reduce((sum, line) => sum + line.paidAmount, 0)
  const balances = computeCycleBalances({
    income,
    totalExpenses: plannedExpenses,
    paidExpenses
  })

  const decisionByKey = new Map(decisions.map(decision => [decision.key, decision]))
  const keyHasData = (key) => (
    hasBudgetAmount(budgetData, key) || Boolean(decisionByKey.get(key)?.recurringId)
  )
  const hasIncomeData = incomeKeys.some(keyHasData)
  const hasExpenseData = expenseKeys.some(keyHasData)

  return {
    monthKey,
    income,
    fixedExpenses,
    variableExpenses,
    plannedExpenses,
    paidExpenses: balances.paidExpenses,
    currentBalance: balances.currentBalance,
    projectedBalance: balances.projectedEndOfCycle,
    remainingExpenses: balances.remainingToSpend,
    expenseRate: income > 0 ? (plannedExpenses / income) * 100 : null,
    savingsRate: income > 0 ? (balances.projectedEndOfCycle / income) * 100 : null,
    categories: lines,
    presence: {
      income: hasIncomeData,
      expenses: hasExpenseData
    },
    // Alias de compatibilité avec getMonthMetrics et getBudgetSummary.
    fixed: fixedExpenses,
    variable: variableExpenses,
    expenses: plannedExpenses,
    savings: balances.projectedEndOfCycle,
    projectedEndOfCycle: balances.projectedEndOfCycle,
    remainingToSpend: balances.remainingToSpend
  }
}

export default { computeMonthlyMetrics, hasBudgetAmount, readBudgetAmount, readBudgetPaidAmount }
