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

/**
 * Calcule les charges restantes à payer pour le mois courant.
 * Filtre uniquement les dépenses (exclut revenus, transferts internes, analyses exclues).
 * Basé sur toutes les dépenses dont paid === false.
 */
export function calculateRemainingCharges(metrics = {}) {
  const categories = metrics.categories || []
  
  // Filtrer uniquement les dépenses non payées (exclure revenus)
  const unpaidExpenses = categories.filter(cat => {
    // Exclure les revenus
    if (cat.type === 'income') return false
    
    // Exclure les catégories sans montant
    if (cat.amount <= 0) return false
    
    // Exclure les opérations exclues des analyses (si metadata disponible)
    if (cat.exclude_from_analytics) return false
    
    // Exclure les transferts internes (si metadata disponible)
    if (cat.internal_transfer) return false
    
    // Inclure uniquement les dépenses non entièrement payées
    return cat.paidAmount < cat.amount
  })
  
  // Calculer le montant total restant à payer
  const remainingAmount = unpaidExpenses.reduce((sum, cat) => {
    return sum + (cat.amount - cat.paidAmount)
  }, 0)
  
  return Math.max(0, remainingAmount)
}

/**
 * Calcule le solde prévisionnel après paiement de toutes les charges restantes.
 * Formule: solde actuel - charges restantes
 */
export function calculateProjectedBalance(metrics = {}) {
  const currentBalance = metrics.currentBalance || 0
  const remainingCharges = calculateRemainingCharges(metrics)
  return currentBalance - remainingCharges
}

/**
 * Retourne les détails des charges restantes (montant total et nombre)
 * Avec filtrage métier strict : exclut revenus, transferts, analyses exclues
 */
export function getRemainingChargesDetails(metrics = {}) {
  const categories = metrics.categories || []
  
  const unpaidExpenses = categories.filter(cat => {
    // Exclure les revenus
    if (cat.type === 'income') return false
    
    // Exclure les catégories sans montant
    if (cat.amount <= 0) return false
    
    // Exclure les opérations exclues des analyses
    if (cat.exclude_from_analytics) return false
    
    // Exclure les transferts internes
    if (cat.internal_transfer) return false
    
    // Inclure uniquement les dépenses non entièrement payées
    return cat.paidAmount < cat.amount
  })
  
  const unpaidCount = unpaidExpenses.length
  const unpaidAmount = unpaidExpenses.reduce((sum, cat) => sum + (cat.amount - cat.paidAmount), 0)
  
  return {
    total: unpaidAmount,
    count: unpaidCount,
    amount: unpaidAmount,
    items: unpaidExpenses.map(cat => ({
      id: cat.id,
      name: cat.name,
      type: cat.type,
      remaining: cat.amount - cat.paidAmount,
      total: cat.amount,
      paid: cat.paidAmount
    }))
  }
}

/**
 * Détermine l'état de la situation financière pour l'UX
 * @returns {Object} { state: 'positive'|'warning'|'critical'|'neutral', message: string }
 */
export function getFinancialState(metrics = {}) {
  const remainingCharges = calculateRemainingCharges(metrics)
  const projectedBalance = calculateProjectedBalance(metrics)
  const currentBalance = metrics.currentBalance || 0
  
  // Cas 1: Toutes les charges sont payées - État positif
  if (remainingCharges <= 0) {
    return {
      state: 'positive',
      message: currentBalance > 0 
        ? `Toutes tes charges prévues sont réglées. Tu peux affecter tes ${Math.round(currentBalance).toLocaleString('fr-FR')} € restants à ton objectif ou à ton épargne.`
        : 'Toutes tes charges prévues sont réglées.',
      showOpportunity: currentBalance > 0
    }
  }
  
  // Cas 2: Solde prévisionnel négatif - État critique
  if (projectedBalance < 0) {
    return {
      state: 'critical',
      message: `Attention : si toutes les charges restantes sont payées, ton solde sera négatif de ${Math.abs(Math.round(projectedBalance)).toLocaleString('fr-FR')} €.`,
      showOpportunity: false
    }
  }
  
  // Cas 3: Solde prévisionnel positif mais proche de zéro - État warning
  if (projectedBalance < currentBalance * 0.2) {
    return {
      state: 'warning',
      message: `Il te restera environ ${Math.round(projectedBalance).toLocaleString('fr-FR')} € après paiement des charges.`,
      showOpportunity: false
    }
  }
  
  // Cas 4: Situation normale - État neutre
  return {
    state: 'neutral',
    message: `Tu disposes de ${Math.round(currentBalance).toLocaleString('fr-FR')} € avec ${Math.round(remainingCharges).toLocaleString('fr-FR')} € de charges restantes.`,
    showOpportunity: false
  }
}

/**
 * Vide le cache des calculs financiers
 * À appeler lorsque les données changent
 */
export function clearFinancialStateCache() {
  financialStateCache.clear()
}

export default { 
  computeMonthlyMetrics, 
  hasBudgetAmount, 
  readBudgetAmount, 
  readBudgetPaidAmount,
  calculateRemainingCharges,
  calculateProjectedBalance,
  getRemainingChargesDetails,
  getFinancialState,
  clearFinancialStateCache
}
