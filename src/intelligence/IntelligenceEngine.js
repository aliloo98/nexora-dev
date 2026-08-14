/**
 * Intelligence Engine V1 - Moteur d'analyse financière déterministe
 *
 * Orchestre les sources de vérité existantes de Nexora pour produire
 * un snapshot canonique d'intelligence financière consommable par Jarvis.
 *
 * PRINCIPES:
 * - Ne duplique pas les calculs existants
 * - Orchestre les sources de vérité: cycleBalance, monthlyMetrics, AnalysisEngine, etc.
 * - 100% déterministe
 * - 100% testable
 * - Aucune dépendance DOM/window/localStorage
 * - Aucune IA générative
 */

import { computeCycleBalances } from '../finance/cycleBalance.js'
import { AnalysisEngine } from '../assistant/AnalysisEngine.js'
import { calculateForecast } from '../forecast/forecastEngine.js'
import { detectOpportunities } from '../opportunity/opportunityEngine.js'
import { DebtPlanner } from '../debt/debtPlanner.js'
import { calculateGoalMetrics, selectPrimaryGoal } from '../goals/goalMetrics.js'

const ENGINE_VERSION = 1

/**
 * Évalue la qualité des données disponibles
 */
function assessDataQuality(metrics = {}, goals = [], debts = [], history = [], dataAvailability = {}) {
  const issues = []
  
  // Vérification revenus
  const hasIncome = metrics.income > 0
  if (!hasIncome) {
    issues.push({ code: 'NO_INCOME', severity: 'high' })
  }
  
  // Vérification dépenses
  const hasExpenses = metrics.plannedExpenses > 0
  if (!hasExpenses) {
    issues.push({ code: 'NO_EXPENSES', severity: 'medium' })
  }
  
  // Vérification objectifs - distinguer unknown vs known empty
  const goalsKnown = dataAvailability.goals === 'known'
  const hasGoal = goalsKnown && goals.length > 0 && goals.some(g => (g.target || g.targetAmount) > 0)
  if (goalsKnown && !hasGoal) {
    // Known empty (no goals configured) - not an issue, just information
  } else if (!goalsKnown) {
    issues.push({ code: 'NO_GOAL_DATA', severity: 'low' })
  }
  
  // Vérification dette - distinguer unknown vs known empty
  const debtsKnown = dataAvailability.debts === 'known'
  const hasDebt = debtsKnown && debts.length > 0 && debts.some(d => (d.balance || d.amount) > 0)
  if (debtsKnown && !hasDebt) {
    // Known empty (no debts) - not an issue, this is good
  } else if (!debtsKnown) {
    issues.push({ code: 'NO_DEBT_DATA', severity: 'low' })
  }
  
  // Vérification historique
  const hasHistory = Array.isArray(history) && history.length >= 2
  if (!hasHistory) {
    issues.push({ code: 'INSUFFICIENT_HISTORY', severity: 'medium' })
  }
  
  // Score de qualité
  const qualityScore = 100 - (issues.length * 15)
  const qualityLevel = qualityScore >= 85 ? 'high' : qualityScore >= 55 ? 'medium' : 'low'
  
  return {
    score: Math.max(0, qualityScore),
    level: qualityLevel,
    issues,
    hasIncome,
    hasExpenses,
    hasGoal,
    hasDebt,
    hasHistory,
    isComplete: issues.length === 0,
    dataAvailability: {
      goals: goalsKnown ? 'known' : 'unknown',
      debts: debtsKnown ? 'known' : 'unknown',
      history: 'known' // History is always known if provided
    }
  }
}

/**
 * Construit l'état de santé financier
 */
function buildHealthState(metrics = {}, cycleBalances = {}, analysisResult = {}) {
  const { income, savingsRate } = metrics
  const { projectedEndOfCycle } = cycleBalances
  const { score, label } = analysisResult
  
  // Calculer chargesRate à partir des données réelles
  const chargesRate = income > 0 ? ((metrics.fixedExpenses || 0) / income) * 100 : 0

  // Classification basée sur les métriques existantes
  let status = 'unknown'
  if (income <= 0) {
    status = 'no_income'
  } else if (projectedEndOfCycle < 0) {
    status = 'critical'
  } else if (chargesRate > 70) {
    status = 'fragile'
  } else if (savingsRate >= 20) {
    status = 'strong'
  } else if (savingsRate >= 5) {
    status = 'stable'
  } else {
    status = 'balanced'
  }
  
  return {
    status,
    score: score || 0,
    label: label || 'Inconnu',
    cashflow: projectedEndOfCycle >= 0 ? 'positive' : 'negative',
    pressure: chargesRate > 50 ? 'high' : chargesRate > 30 ? 'medium' : 'low'
  }
}

/**
 * Détecte les risques financiers
 */
function detectRisks(cycleBalances = {}, inputMetrics = {}, dataQuality = {}, forecast = {}) {
  const risks = []
  const { income, projectedEndOfCycle } = cycleBalances
  const { fixedExpenses, variableExpenses } = inputMetrics
  
  // Risque 1: Déficit mensuel
  if (projectedEndOfCycle < 0) {
    risks.push({
      id: 'deficit',
      domain: 'cashflow',
      severity: 'critical',
      evidence: {
        income,
        expenses: fixedExpenses + variableExpenses,
        deficit: Math.abs(projectedEndOfCycle)
      }
    })
  }
  
  // Risque 2: Absence de revenu
  if (!dataQuality.hasIncome) {
    risks.push({
      id: 'no_income',
      domain: 'income',
      severity: 'high',
      evidence: { income }
    })
  }
  
  // Risque 3: Risque de découvert (depuis forecast)
  if (forecast.overdraftRisk === 'HIGH') {
    risks.push({
      id: 'overdraft_risk',
      domain: 'cashflow',
      severity: 'high',
      evidence: {
        lowestBalance: forecast.lowestBalance,
        lowestBalanceDay: forecast.lowestBalanceDay
      }
    })
  }
  
  return risks
}

/**
 * Détecte les opportunités financières
 */
function detectFinancialOpportunities(cycleBalances = {}, inputMetrics = {}, dataQuality = {}, goals = [], billSchedules = []) {
  const opportunities = []
  const { income, projectedEndOfCycle } = cycleBalances
  const { savingsRate } = inputMetrics
  
  // Réutiliser l'opportunity engine existant
  const existingOpportunities = detectOpportunities(inputMetrics, billSchedules, goals)
  opportunities.push(...existingOpportunities)
  
  // Opportunité: Cashflow positif
  if (projectedEndOfCycle > 0 && savingsRate > 0) {
    opportunities.push({
      id: 'positive_cashflow',
      domain: 'cashflow',
      title: 'Marge disponible',
      description: `Tu termineras le mois avec une marge de ${Math.round(projectedEndOfCycle)} €.`,
      estimatedGain: Math.round(projectedEndOfCycle),
      difficulty: 'NONE',
      confidence: 95,
      priority: 70
    })
  }
  
  return opportunities
}

/**
 * Analyse les tendances
 * History contract: [{ income, expenses }]
 */
function analyzeTrends(metrics = {}, history = []) {
  if (!Array.isArray(history) || history.length < 2) {
    return { available: false, reason: 'insufficient_history' }
  }
  
  const current = metrics
  const previous = history[history.length - 1]

  // Utiliser uniquement les champs du contrat history: income, expenses
  const incomeTrend = current.income > previous.income ? 'up' : current.income < previous.income ? 'down' : 'stable'
  const expenseTrend = (current.plannedExpenses || current.expenses) > previous.expenses ? 'up' : (current.plannedExpenses || current.expenses) < previous.expenses ? 'down' : 'stable'

  // Savings trend non calculable avec le contrat actuel (pas de projectedBalance dans history)
  const savingsTrend = 'unavailable'
  
  return {
    available: true,
    income: incomeTrend,
    expenses: expenseTrend,
    savings: savingsTrend,
    comparison: {
      income: { current: current.income, previous: previous.income },
      expenses: { current: current.plannedExpenses || current.expenses, previous: previous.expenses },
      savings: { current: null, previous: null, note: 'savings trend unavailable with current history contract' }
    }
  }
}

/**
 * Hiérarchise les priorités
 */
function prioritize(risks = [], opportunities = {}, dataQuality = {}) {
  const priorities = []
  
  // Priorité 1: Corriger le déficit
  const deficitRisk = risks.find(r => r.id === 'deficit')
  if (deficitRisk) {
    priorities.push({
      id: 'fix_deficit',
      rank: 1,
      action: 'Réduire les dépenses pour rétablir un cashflow positif',
      domain: 'cashflow',
      severity: 'critical'
    })
  }
  
  // Priorité 2: Sécuriser les revenus
  const noIncomeRisk = risks.find(r => r.id === 'no_income')
  if (noIncomeRisk) {
    priorities.push({
      id: 'secure_income',
      rank: 2,
      action: 'Enregistrer des revenus pour permettre l\'analyse',
      domain: 'income',
      severity: 'high'
    })
  }
  
  // Priorité 3: Opportunités si pas de risque critique
  if (!deficitRisk && !noIncomeRisk && opportunities.length > 0) {
    const topOpportunity = opportunities[0]
    priorities.push({
      id: 'capture_opportunity',
      rank: 3,
      action: topOpportunity.title || 'Profiter des opportunités disponibles',
      domain: topOpportunity.domain || 'general',
      severity: 'low'
    })
  }
  
  return priorities
}

/**
 * Point d'entrée principal du moteur Intelligence
 *
 * @param {Object} input - Données financières
 * @param {Object} input.metrics - Métriques mensuelles (income, expenses, etc.)
 * @param {Array} input.history - Historique des mois précédents
 * @param {Array} input.goals - Liste des objectifs
 * @param {Array} input.debts - Liste des dettes
 * @param {Array} input.billSchedules - Échéancier de factures
 * @param {Object} options - Options de configuration
 * @param {Date|string} options.referenceDate - Date de référence pour déterminisme
 * @returns {Object} Snapshot canonique d'intelligence
 */
export function buildIntelligenceSnapshot(input = {}, options = {}) {
  const {
    metrics = {},
    history = [],
    goals = [],
    debts = [],
    billSchedules = [],
    dataAvailability = {}
  } = input
  
  const referenceDate = options.referenceDate ? new Date(options.referenceDate) : new Date()
  
  // 1. Assurer la qualité des données
  const dataQuality = assessDataQuality(metrics, goals, debts, history, dataAvailability)
  
  // 2. Calculer les soldes de cycle (réutilisation de cycleBalance)
  const cycleBalances = computeCycleBalances({
    income: metrics.income,
    totalExpenses: metrics.plannedExpenses || metrics.expenses,
    paidExpenses: metrics.paidExpenses
  })
  
  // 3. Utiliser AnalysisEngine existant pour l'analyse approfondie
  const analysisEngine = new AnalysisEngine()
  const analysisData = {
    budget: { income: metrics.income, metrics },
    debts: { total: debts.reduce((sum, d) => sum + (d.balance || d.amount || 0), 0) },
    historical: {
      avgIncome: history.length > 0 ? history.reduce((sum, h) => sum + (h.income || 0), 0) / history.length : metrics.income,
      avgExpenses: history.length > 0 ? history.reduce((sum, h) => sum + (h.expenses || 0), 0) / history.length : metrics.plannedExpenses
    }
  }
  const calculatedMetrics = analysisEngine.calculateMetrics(analysisData)
  const scoreResult = analysisEngine.calculateScore(calculatedMetrics)
  
  // 4. État de santé
  const health = buildHealthState(metrics, cycleBalances, scoreResult)
  
  // 5. Prévision (réutilisation de forecastEngine)
  const forecast = calculateForecast(metrics, { referenceDate, billSchedules })
  
  // 6. Risques
  const risks = detectRisks(cycleBalances, metrics, dataQuality, forecast)
  
  // 7. Opportunités
  const opportunities = detectFinancialOpportunities(cycleBalances, metrics, dataQuality, goals, billSchedules)
  
  // 8. Tendances
  const trends = analyzeTrends(metrics, history)
  
  // 9. Priorités
  const priorities = prioritize(risks, opportunities, dataQuality)
  
  // 10. Objectif principal
  const primaryGoal = selectPrimaryGoal(goals)
  let goalAnalysis = null
  if (primaryGoal) {
    goalAnalysis = calculateGoalMetrics(primaryGoal, { asOf: referenceDate })
  }
  
  // 11. Dette (réutilisation de debtPlanner)
  let debtAnalysis = null
  if (debts.length > 0) {
    const debtSummary = DebtPlanner.simulate({
      debts: debts.map(d => ({
        id: d.id,
        balance: d.balance || d.amount,
        ratePct: d.ratePct || d.rate,
        minPayment: d.minPayment
      })),
      monthlyExtra: cycleBalances.projectedEndOfCycle > 0 ? cycleBalances.projectedEndOfCycle : 0,
      method: 'avalanche'
    })
    debtAnalysis = {
      total: debts.reduce((sum, d) => sum + (d.balance || d.amount || 0), 0),
      monthlyTotal: debts.reduce((sum, d) => sum + (d.minPayment || 0), 0),
      payoffMonths: debtSummary.months,
      totalInterest: debtSummary.totalInterest
    }
  }
  
  // Snapshot canonique
  return {
    version: ENGINE_VERSION,
    generatedFor: referenceDate.toISOString().slice(0, 10),
    dataQuality,
    health,
    cashflow: {
      income: cycleBalances.income,
      expenses: cycleBalances.totalExpenses,
      paidExpenses: cycleBalances.paidExpenses,
      projected: cycleBalances.projectedEndOfCycle,
      current: cycleBalances.currentBalance,
      remaining: cycleBalances.remainingToSpend
    },
    budget: {
      fixed: metrics.fixedExpenses || 0,
      variable: metrics.variableExpenses || 0,
      total: metrics.plannedExpenses || metrics.expenses || 0
    },
    buffer: {
      available: cycleBalances.projectedEndOfCycle,
      daysRemaining: null
    },
    savings: {
      rate: metrics.savingsRate || (metrics.income > 0 ? (cycleBalances.projectedEndOfCycle / metrics.income) * 100 : 0),
      amount: cycleBalances.projectedEndOfCycle
    },
    debt: debtAnalysis,
    trends,
    risks,
    opportunities,
    forecast: {
      lowestBalance: forecast.lowestBalance,
      lowestBalanceDay: forecast.lowestBalanceDay,
      overdraftRisk: forecast.overdraftRisk,
      finalBalance: forecast.finalBalance
    },
    priorities,
    goal: goalAnalysis,
    evidence: {
      balanceSource: 'cycleBalance',
      analysisSource: 'AnalysisEngine',
      forecastSource: 'forecastEngine',
      opportunitySource: 'opportunityEngine',
      debtSource: 'debtPlanner',
      goalSource: 'goalMetrics',
      goalSelectionSource: 'selectPrimaryGoal'
    }
  }
}

export default { buildIntelligenceSnapshot }
