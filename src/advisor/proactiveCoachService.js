import { UserAppSettingsService } from '../../js/userAppSettingsService.js'
import { STORAGE_KEYS } from '../constants/storageKeys.js'
import { computeCycleBalances } from '../finance/cycleBalance.js'
import { filterUserFacingRecords } from '../utils/userFacingFilter.js'

export const FINANCIAL_MEMORY_KEY = STORAGE_KEYS.financialMemory
export const AI_SETTINGS_KEY = STORAGE_KEYS.aiSettings

export const DEFAULT_AI_SETTINGS = {
  cautionLevel: 'balanced',
  coachPriority: 'security',
  communicationStyle: 'benevolent',
  recommendationFrequency: 'daily',
  thresholds: {
    minBalance: 150,
    chargesRate: 75,
    variableRate: 35,
    goalDelayDays: 1
  }
}

const CAUTION_PROFILES = {
  very_cautious: { minBalancePct: 0.14, purchaseFloorPct: 0.16, label: 'Très prudent' },
  cautious: { minBalancePct: 0.1, purchaseFloorPct: 0.12, label: 'Prudent' },
  balanced: { minBalancePct: 0.08, purchaseFloorPct: 0.08, label: 'Équilibré' },
  ambitious: { minBalancePct: 0.05, purchaseFloorPct: 0.05, label: 'Ambitieux' },
  aggressive: { minBalancePct: 0.03, purchaseFloorPct: 0.03, label: 'Agressif' }
}

const clamp = (value, min = 0, max = 100) => Math.max(min, Math.min(max, value))
const safeNumber = (value, fallback = 0) => {
  const number = Number(value)
  return Number.isFinite(number) ? number : fallback
}

const formatEuro = (value) => `${Math.round(safeNumber(value)).toLocaleString('fr-FR')} €`
const normalizeText = (value) => String(value || '').trim()
const todayKey = (date = new Date()) => {
  const d = date instanceof Date ? date : new Date(date)
  return Number.isNaN(d.getTime()) ? new Date().toISOString().slice(0, 10) : d.toISOString().slice(0, 10)
}

const readJson = (key, fallback) => {
  try {
    const runtime = typeof window !== 'undefined' ? window : globalThis
    const raw = runtime?.SafeStorage?.getItem?.(key) || runtime?.localStorage?.getItem?.(key)
    if (!raw) return fallback
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' ? parsed : fallback
  } catch {
    return fallback
  }
}

const writeJson = (key, value) => {
  try {
    const runtime = typeof window !== 'undefined' ? window : globalThis
    const serialized = JSON.stringify(value)
    if (runtime?.SafeStorage?.setItem) runtime.SafeStorage.setItem(key, serialized)
    else runtime?.localStorage?.setItem?.(key, serialized)
    if (UserAppSettingsService?.saveSetting) {
      UserAppSettingsService.saveSetting(key, value)
        .then(() => UserAppSettingsService.syncLocalSettingToCloud?.(key))
        .catch((err) => console.warn('[NexoraAdvisor] synced setting failed', key, err))
    }
  } catch {
    // Local memory is helpful, not required.
  }
}

const normalizeAiSettings = (settings = {}) => {
  const thresholds = settings.thresholds && typeof settings.thresholds === 'object' ? settings.thresholds : {}
  return {
    cautionLevel: CAUTION_PROFILES[settings.cautionLevel] ? settings.cautionLevel : DEFAULT_AI_SETTINGS.cautionLevel,
    coachPriority: ['security', 'savings', 'primary_goal', 'debt_reduction', 'major_purchase', 'couple_budget'].includes(settings.coachPriority)
      ? settings.coachPriority
      : DEFAULT_AI_SETTINGS.coachPriority,
    communicationStyle: ['direct', 'benevolent', 'professional', 'motivational'].includes(settings.communicationStyle)
      ? settings.communicationStyle
      : DEFAULT_AI_SETTINGS.communicationStyle,
    recommendationFrequency: ['daily', 'weekly', 'risk_only'].includes(settings.recommendationFrequency)
      ? settings.recommendationFrequency
      : DEFAULT_AI_SETTINGS.recommendationFrequency,
    thresholds: {
      minBalance: Math.max(0, safeNumber(thresholds.minBalance, DEFAULT_AI_SETTINGS.thresholds.minBalance)),
      chargesRate: clamp(Math.round(safeNumber(thresholds.chargesRate, DEFAULT_AI_SETTINGS.thresholds.chargesRate)), 1, 100),
      variableRate: clamp(Math.round(safeNumber(thresholds.variableRate, DEFAULT_AI_SETTINGS.thresholds.variableRate)), 1, 100),
      goalDelayDays: Math.max(0, Math.round(safeNumber(thresholds.goalDelayDays, DEFAULT_AI_SETTINGS.thresholds.goalDelayDays)))
    }
  }
}

export function readAiSettings() {
  return normalizeAiSettings(readJson(AI_SETTINGS_KEY, DEFAULT_AI_SETTINGS))
}

export function updateAiSettings(patch = {}) {
  const next = normalizeAiSettings({
    ...readAiSettings(),
    ...patch,
    thresholds: {
      ...readAiSettings().thresholds,
      ...(patch.thresholds || {})
    }
  })
  writeJson(AI_SETTINGS_KEY, next)
  return next
}

export function readFinancialMemory() {
  const memory = readJson(FINANCIAL_MEMORY_KEY, {})
  return {
    lastPrimaryGoal: normalizeText(memory.lastPrimaryGoal),
    lastImportantAlerts: Array.isArray(memory.lastImportantAlerts) ? memory.lastImportantAlerts.slice(0, 5) : [],
    lastRecommendation: normalizeText(memory.lastRecommendation),
    recentProgress: normalizeText(memory.recentProgress),
    preferences: memory.preferences && typeof memory.preferences === 'object' ? memory.preferences : {},
    lastAdviceDate: normalizeText(memory.lastAdviceDate)
  }
}

export function updateFinancialMemory(patch = {}) {
  const current = readFinancialMemory()
  const nextAlerts = Array.isArray(patch.lastImportantAlerts)
    ? Array.from(new Set(patch.lastImportantAlerts.filter(Boolean))).slice(0, 5)
    : current.lastImportantAlerts
  const next = {
    ...current,
    ...patch,
    lastImportantAlerts: nextAlerts,
    preferences: { ...current.preferences, ...(patch.preferences || {}) }
  }
  writeJson(FINANCIAL_MEMORY_KEY, next)
  return next
}

const getRuntime = () => (typeof window !== 'undefined' ? window : globalThis)

export async function collectFinancialContext(overrides = {}) {
  const runtime = getRuntime()
  const month = overrides.month || (typeof runtime.getMonth === 'function' ? runtime.getMonth() : null)
  const metrics = overrides.metrics || (typeof runtime.getMonthMetrics === 'function'
    ? runtime.getMonthMetrics(month, { fromDom: true })
    : null)

  const income = safeNumber(overrides.income ?? metrics?.income)
  const fixedExpenses = safeNumber(overrides.fixedExpenses ?? metrics?.fixed)
  const variableExpenses = safeNumber(overrides.variableExpenses ?? metrics?.variable)
  const inferredExpenses = fixedExpenses + variableExpenses
  const expenses = safeNumber(overrides.expenses ?? metrics?.expenses, inferredExpenses)
  const paidExpenses = safeNumber(overrides.paidExpenses ?? metrics?.paidExpenses)
  const cycleBalances = computeCycleBalances({
    income,
    totalExpenses: expenses,
    paidExpenses: paidExpenses || Math.max(0, expenses - safeNumber(metrics?.savings, income - expenses))
  })
  const projectedBalance = safeNumber(
    overrides.projectedBalance ?? metrics?.projectedEndOfCycle ?? metrics?.savings,
    cycleBalances.projectedEndOfCycle
  )
  const currentBalance = safeNumber(overrides.currentBalance ?? metrics?.currentBalance, cycleBalances.currentBalance)
  const targetSavings = safeNumber(overrides.targetSavings ?? (typeof runtime.getVal === 'function' ? runtime.getVal('target_epargne') : 0))

  const debts = filterUserFacingRecords(Array.isArray(overrides.debts)
    ? overrides.debts
    : (typeof runtime.readDebts === 'function'
      ? runtime.readDebts()
      : readJson('nexora_debts_v1', [])))

  const goals = filterUserFacingRecords(
    Array.isArray(overrides.goals)
      ? overrides.goals
      : (runtime.GoalsService?.listGoals ? await runtime.GoalsService.listGoals().catch(() => []) : []),
    (goal) => goal?.name
  )

  const primaryGoal = overrides.primaryGoal || goals.find((goal) => goal?.isPrimary) || (runtime.GoalsService?.getPrimaryGoal
    ? await runtime.GoalsService.getPrimaryGoal().catch(() => null)
    : null)

  return {
    month,
    income,
    fixedExpenses,
    variableExpenses,
    expenses: Math.max(expenses, inferredExpenses),
    debts: Array.isArray(debts) ? debts : [],
    goals: Array.isArray(goals) ? goals : [],
    primaryGoal,
    currentBalance,
    projectedBalance,
    targetSavings,
    upcomingCharges: Array.isArray(overrides.upcomingCharges) ? overrides.upcomingCharges : [],
    upcomingRevenues: Array.isArray(overrides.upcomingRevenues) ? overrides.upcomingRevenues : [],
    mode: overrides.mode || (runtime.document?.body?.classList?.contains('mode-simple') ? 'simple' : 'complete'),
    demoMode: Boolean(overrides.demoMode ?? (runtime.SafeStorage?.getItem?.('nexora_demo_mode_v1') === 'on' || runtime.localStorage?.getItem?.('nexora_demo_mode_v1') === 'on')),
    settings: normalizeAiSettings(overrides.settings || readAiSettings()),
    today: overrides.today || new Date()
  }
}

const getGoalDeadline = (goal, today) => {
  const target = safeNumber(goal?.target)
  const current = safeNumber(goal?.current)
  const remaining = Math.max(0, target - current)
  const date = goal?.targetDate ? new Date(`${String(goal.targetDate).slice(0, 10)}T00:00:00`) : null
  if (!date || Number.isNaN(date.getTime()) || remaining <= 0) return { remaining, monthsLeft: null, isLate: false, monthlyNeed: 0 }
  const start = today instanceof Date ? today : new Date(today)
  start.setHours(0, 0, 0, 0)
  const daysLeft = Math.ceil((date - start) / 86400000)
  const monthsLeft = daysLeft > 0 ? Math.max(1, Math.ceil(daysLeft / 30)) : 0
  return {
    remaining,
    monthsLeft,
    isLate: daysLeft < 0,
    monthlyNeed: monthsLeft > 0 ? Math.ceil(remaining / monthsLeft) : remaining
  }
}

export function analyzeProactiveCoach(context = {}) {
  const income = safeNumber(context.income)
  const fixed = safeNumber(context.fixedExpenses)
  const variable = safeNumber(context.variableExpenses)
  const expenses = safeNumber(context.expenses, fixed + variable)
  const projectedBalance = safeNumber(context.projectedBalance, income - expenses)
  const currentBalance = safeNumber(context.currentBalance, projectedBalance)
  const debts = Array.isArray(context.debts) ? context.debts.filter((debt) => safeNumber(debt?.remaining) > 0) : []
  const goals = Array.isArray(context.goals) ? context.goals : []
  const primaryGoal = context.primaryGoal || goals.find((goal) => goal?.isPrimary) || goals[0] || null
  const today = context.today instanceof Date ? context.today : new Date(context.today || Date.now())
  const chargesRate = income > 0 ? Math.round((expenses / income) * 100) : 0
  const variableRate = income > 0 ? Math.round((variable / income) * 100) : 0
  const debtMonthlyTotal = debts.reduce((sum, debt) => sum + safeNumber(debt?.monthly), 0)
  const targetSavings = safeNumber(context.targetSavings)
  const settings = normalizeAiSettings(context.settings || readAiSettings())
  const caution = CAUTION_PROFILES[settings.cautionLevel] || CAUTION_PROFILES.balanced
  const minBalance = Math.max(settings.thresholds.minBalance, Math.round(income * caution.minBalancePct))
  const memory = readFinancialMemory()
  const risks = []
  const opportunities = []
  const actions = []

  if (income <= 0) risks.push('Revenu non configuré')
  if (income > 0 && chargesRate > settings.thresholds.chargesRate) risks.push(`Charges élevées : ${chargesRate}% des revenus`)
  if (projectedBalance < 0) risks.push(`Solde fin de cycle négatif : ${formatEuro(projectedBalance)}`)
  else if (projectedBalance < minBalance) risks.push(`Marge critique : ${formatEuro(projectedBalance)} disponibles`)
  if (income > 0 && variableRate > settings.thresholds.variableRate) risks.push(`Dépenses variables élevées : ${variableRate}% des revenus`)
  if (primaryGoal) {
    const deadline = getGoalDeadline(primaryGoal, today)
    if (deadline.isLate) risks.push(`Objectif ${primaryGoal.name || 'principal'} en retard`)
    if (!primaryGoal.targetDate && safeNumber(primaryGoal.target) > safeNumber(primaryGoal.current)) risks.push('Objectif principal sans échéance')
    if (deadline.monthlyNeed > projectedBalance && projectedBalance > 0) risks.push(`Objectif ${primaryGoal.name || 'principal'} sans rythme suffisant`)
  } else if (income > 0 && projectedBalance > 0) {
    risks.push('Objectif principal non configuré')
  }
  debts.forEach((debt) => {
    if (safeNumber(debt?.monthly) <= 0) risks.push(`Dette ${debt.name || 'active'} sans mensualité`)
  })
  const upcomingCharge = (context.upcomingCharges || []).find((charge) => safeNumber(charge?.amount) > 0)
  if (upcomingCharge) risks.push(`Échéance proche : ${upcomingCharge.title || 'charge'} ${formatEuro(upcomingCharge.amount)}`)

  const budgetTense = income <= 0 || projectedBalance < minBalance || chargesRate > settings.thresholds.chargesRate || variableRate > settings.thresholds.variableRate
  if (!budgetTense && income > 0 && projectedBalance > minBalance + 50) opportunities.push(`Tu peux épargner environ ${formatEuro((projectedBalance - minBalance) * 0.6)} sans vider ta marge.`)
  if (!budgetTense && debts.length && projectedBalance > debtMonthlyTotal + 50) opportunities.push('Une dette peut être remboursée un peu plus vite.')
  if (!budgetTense && primaryGoal && projectedBalance > minBalance + 80) opportunities.push(`Ton objectif ${primaryGoal.name || 'principal'} peut avancer cette semaine.`)
  if (income > 0 && variableRate !== null && variableRate <= 25) opportunities.push('Tes dépenses variables sont maîtrisées.')

  let priority = 'Complète tes revenus dans Budget'
  let actionTarget = 'saisie'
  if (income <= 0) {
    priority = 'Ajoute tes revenus dans Budget'
    actions.push('Ajoute au moins un revenu réel avant de suivre une recommandation.')
  }
  else if (upcomingCharge && currentBalance < safeNumber(upcomingCharge.amount)) {
    priority = `Garde ${formatEuro(upcomingCharge.amount)} pour ${upcomingCharge.title || 'la prochaine charge'}`
    actionTarget = 'plan'
  } else if (projectedBalance < 0 || chargesRate > 80) {
    priority = `Réduis les dépenses variables de ${formatEuro(Math.max(50, Math.abs(projectedBalance) || variable * 0.15))}`
    actionTarget = 'saisie'
  } else if (debts.some((debt) => safeNumber(debt?.monthly) <= 0)) {
    priority = `Rembourse ${debts[0]?.name || 'la dette prioritaire'} en priorité`
    actionTarget = 'plan'
  } else if (primaryGoal && safeNumber(primaryGoal.target) > safeNumber(primaryGoal.current)) {
    priority = budgetTense
      ? 'Protège ta marge avant l’objectif principal'
      : `Ajoute ${formatEuro(Math.min(50, Math.max(20, projectedBalance - minBalance)))} à ${primaryGoal.name || 'l’objectif principal'} cette semaine`
    actionTarget = 'objectifs'
  } else if (settings.coachPriority === 'debt_reduction' && debts.length) {
    priority = `Rembourse ${debts[0]?.name || 'la dette prioritaire'} en priorité`
    actionTarget = 'plan'
  } else {
    priority = `Conserve au moins ${formatEuro(minBalance)} de marge`
    actionTarget = 'plan'
  }

  let dailyAdvice = `Conserve au moins ${formatEuro(minBalance)} de marge aujourd’hui.`
  if (income <= 0) dailyAdvice = 'Je peux t’aider, mais il me manque encore tes revenus, tes charges ou ton objectif principal.'
  else if (upcomingCharge) dailyAdvice = `${upcomingCharge.title || 'Une charge'} arrive bientôt, garde au moins ${formatEuro(upcomingCharge.amount)} disponibles.`
  else if (projectedBalance < 0) dailyAdvice = `Réduis ou reporte ${formatEuro(Math.abs(projectedBalance))} pour éviter un solde négatif.`
  else if (budgetTense) dailyAdvice = `Budget tendu : garde ta marge et limite les dépenses variables avant d’épargner.`
  else if (primaryGoal) {
    const deadline = getGoalDeadline(primaryGoal, today)
    if (deadline.isLate) dailyAdvice = `Ton objectif ${primaryGoal.name || 'principal'} est en retard, ajoute ${formatEuro(Math.min(Math.max(20, deadline.monthlyNeed / 4), projectedBalance))} cette semaine si possible.`
    else if (projectedBalance > 80) dailyAdvice = `Tu peux mettre ${formatEuro(Math.min(projectedBalance * 0.4, 100))} sur ${primaryGoal.name || 'ton objectif'} tout en gardant une marge.`
  }
  if (income > 0 && budgetTense && /objectif|épargn|epargn|mettre/i.test(dailyAdvice)) {
    dailyAdvice = `Budget tendu : sécurise les charges essentielles et garde ${formatEuro(minBalance)} de marge.`
  }

  if (memory.lastRecommendation === dailyAdvice && risks.length > 1) {
    dailyAdvice = `Action prioritaire : ${priority}.`
  }

  const styleAdvice = (text) => {
    if (settings.communicationStyle === 'direct') return text.replace(/^Je te conseille de\s+/i, '').replace(/^Tu peux\s+/i, 'Fais-le seulement si ')
    if (settings.communicationStyle === 'professional') return text.replace(/^Tu /, 'Vous ').replace(/\bta\b/g, 'votre').replace(/\btes\b/g, 'vos')
    if (settings.communicationStyle === 'motivational' && !budgetTense) return `${text} Tu progresses, garde le cap.`
    return text
  }
  dailyAdvice = styleAdvice(dailyAdvice)

  const progress = primaryGoal
    ? `${primaryGoal.name || 'Objectif'} : ${clamp(Math.round((safeNumber(primaryGoal.current) / Math.max(1, safeNumber(primaryGoal.target))) * 100))}% atteint`
    : ''

  const importantAlerts = risks.slice(0, 3)
  updateFinancialMemory({
    lastPrimaryGoal: primaryGoal?.name || memory.lastPrimaryGoal,
    lastImportantAlerts: importantAlerts,
    lastRecommendation: dailyAdvice,
    recentProgress: progress,
    lastAdviceDate: todayKey(today)
  })

  return {
    dailyAdvice,
    priority,
    risks: Array.from(new Set(risks)).slice(0, 5),
    opportunities: Array.from(new Set(opportunities)).slice(0, 5),
    actionTarget,
    actionLabel: actionTarget === 'objectifs' ? 'Voir l’objectif' : actionTarget === 'saisie' ? 'Mettre à jour' : 'Voir le plan',
    memory: readFinancialMemory(),
    settings,
    actions: actions.length ? actions : [priority],
    summary: {
      income,
      fixedExpenses: fixed,
      variableExpenses: variable,
      expenses,
      projectedBalance,
      currentBalance,
      chargesRate,
      variableRate,
      debtMonthlyTotal,
      targetSavings,
      hasEnoughData: income > 0 && expenses >= 0,
      budgetTense,
      minBalance
    }
  }
}

export async function getProactiveCoach(overrides = {}) {
  return analyzeProactiveCoach(await collectFinancialContext(overrides))
}

export default { collectFinancialContext, analyzeProactiveCoach, getProactiveCoach, readFinancialMemory, updateFinancialMemory, readAiSettings, updateAiSettings }
