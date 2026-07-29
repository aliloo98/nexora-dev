/**
 * AnalysisEngine - Analyzes financial data and produces insights
 * 
 * This engine processes collected data, calculates metrics, evaluates rules,
 * and produces a complete AssistantReport.
 */

import { AssistantReport, createEmptyReport } from './AssistantReport.js'
import { buildJudgmentEngine } from './judgmentEngine.js'
import registry from './RuleRegistry.js'

const clamp = (n, a = 0, b = 100) => Math.max(a, Math.min(b, n))
const safeNumber = (value, fallback = 0) => {
  const number = Number(value)
  return Number.isFinite(number) ? number : fallback
}

class AnalysisEngine {
  constructor(ruleRegistry = registry) {
    this.ruleRegistry = ruleRegistry
  }

  /**
   * Calculate financial metrics from collected data
   * @param {Object} data - Collected data from DataCollector
   * @returns {Object} Calculated metrics
   */
  calculateMetrics(data) {
    const budget = data.budget || {}
    const debts = data.debts || {}
    const historical = data.historical || {}

    const income = safeNumber(budget.income)
    const metrics = budget.metrics || {}
    
    const fixedExpenses = safeNumber(metrics.fixed)
    const variableExpenses = safeNumber(metrics.variable)
    const totalExpenses = safeNumber(metrics.expenses, fixedExpenses + variableExpenses)
    const savings = safeNumber(metrics.savings, income - totalExpenses)

    const chargesRate = income > 0 ? Math.round((totalExpenses / income) * 100) : 0
    const fixedRate = income > 0 ? (fixedExpenses > 0 ? Math.max(1, Math.round((fixedExpenses / income) * 100)) : 0) : 0
    const variableRate = income > 0 ? (variableExpenses > 0 ? Math.max(1, Math.round((variableExpenses / income) * 100)) : 0) : 0
    const savingsRate = income > 0 ? Math.round((savings / income) * 100) : 0

    // Historical comparison
    const histAvgIncome = safeNumber(historical.avgIncome, income)
    const histAvgExpenses = safeNumber(historical.avgExpenses, totalExpenses)
    const incomeTrendPct = histAvgIncome > 0 ? Math.round(((income - histAvgIncome) / histAvgIncome) * 100) : 0
    const expenseInflationRate = histAvgExpenses > 0 ? Math.round(((totalExpenses - histAvgExpenses) / histAvgExpenses) * 100) : 0

    // Debt metrics
    const debtTotal = safeNumber(debts.total)
    const debtMonthlyTotal = safeNumber(debts.monthlyTotal)
    const debtRate = income > 0 ? Math.round((debtMonthlyTotal / income) * 100) : 0

    return {
      income,
      fixedExpenses,
      variableExpenses,
      totalExpenses,
      savings,
      savingsRate,
      chargesRate,
      fixedRate,
      variableRate,
      incomeTrendPct,
      expenseInflationRate,
      debtTotal,
      debtMonthlyTotal,
      debtRate
    }
  }

  /**
   * Calculate financial score
   * @param {Object} metrics - Calculated metrics
   * @returns {Object} Score with label
   */
  calculateScore(metrics) {
    const { income, savingsRate, chargesRate, savings } = metrics

    if (income <= 0) {
      return { score: 0, label: 'Données insuffisantes' }
    }

    let base = 50
    base += clamp(savingsRate, -50, 50) * 0.8
    base -= Math.max(0, chargesRate - 80) * 0.5
    base += savings >= 0 ? 10 : -20

    const score = Math.round(clamp(base, 0, 100))
    const label = score >= 90 ? 'Excellent' : score >= 75 ? 'Bon' : score >= 50 ? 'Moyen' : 'Critique'

    return { score, label }
  }

  /**
   * Determine status and trajectory
   * @param {Object} metrics - Calculated metrics
   * @param {Object} score - Score object
   * @returns {Object} Status and trajectory
   */
  determineStatus(metrics, score) {
    const { income, savings } = metrics
    const hasData = income > 0

    const status = !hasData ? 'no_data' : score.score >= 90 ? 'excellent' : score.score >= 75 ? 'healthy' : score.score >= 60 ? 'attention' : 'critical'

    const trajectoryLabel = !hasData
      ? 'Données insuffisantes'
      : score.score >= 90
        ? '🟢 Excellente trajectoire'
        : score.score >= 75
          ? '🟢 Situation saine'
          : score.score >= 60
            ? '🟡 Sous surveillance'
            : score.score >= 40
              ? '🟠 Attention budget'
              : '🔴 Situation critique'

    return { status, trajectoryLabel }
  }

  /**
   * Build judgment using the judgment engine
   * @param {Object} metrics - Calculated metrics
   * @param {Object} data - Collected data
   * @returns {Object} Judgment
   */
  buildJudgment(metrics, data) {
    const context = {
      income: metrics.income,
      fixedExpenses: metrics.fixedExpenses,
      variableExpenses: metrics.variableExpenses,
      expenses: metrics.totalExpenses,
      projectedBalance: metrics.savings,
      debts: data.debts?.debts || [],
      goals: data.goals?.goals || [],
      primaryGoal: data.goals?.primaryGoal || null
    }

    return buildJudgmentEngine(context)
  }

  /**
   * Build debt strategy
   * @param {Object} metrics - Calculated metrics
   * @param {Object} data - Collected data
   * @returns {Object} Debt strategy
   */
  buildDebtStrategy(metrics, data) {
    const { income, savings, debtTotal, debtMonthlyTotal } = metrics
    const debts = data.debts?.debts || []

    if (debts.length === 0) {
      return {
        total: 0,
        monthlyTotal: 0,
        rate: 0,
        remainingAvailable: Math.max(0, savings),
        recommendation: 'Aucune dette active : la marge disponible peut aller vers les objectifs.'
      }
    }

    const mainDebt = debts.slice().sort((a, b) => Number(b.remaining || 0) - Number(a.remaining || 0))[0]
    const baseMonthly = Number(mainDebt?.monthly || 0)
    const currentMonths = baseMonthly > 0 ? Math.ceil(Number(mainDebt.remaining || 0) / baseMonthly) : null
    const plus50Months = baseMonthly + 50 > 0 ? Math.ceil(Number(mainDebt.remaining || 0) / (baseMonthly + 50)) : null
    const monthsSaved = currentMonths !== null && plus50Months !== null ? Math.max(0, currentMonths - plus50Months) : null
    const remainingAvailable = Math.max(0, savings - debtMonthlyTotal)
    
    let recommendation = metrics.debtRate >= 30
      ? 'Priorité recommandée : rembourser les dettes avant d\'augmenter l\'épargne.'
      : remainingAvailable > 0
        ? 'Vous pouvez équilibrer remboursement de dette et objectifs.'
        : 'Priorité recommandée : sécuriser les mensualités avant les objectifs.'

    if (monthsSaved && monthsSaved > 0) {
      recommendation = `En ajoutant 50 €/mois à ${mainDebt.name || 'la dette principale'}, elle serait terminée environ ${monthsSaved} mois plus tôt.`
    }

    return {
      total: debtTotal,
      monthlyTotal: debtMonthlyTotal,
      rate: metrics.debtRate,
      remainingAvailable,
      mainDebt,
      monthsSavedWith50: monthsSaved,
      recommendation
    }
  }

  /**
   * Build goals analysis
   * @param {Object} metrics - Calculated metrics
   * @param {Object} data - Collected data
   * @returns {Object} Goals analysis
   */
  buildGoalsAnalysis(metrics, data) {
    const { income, savings } = metrics
    const goals = data.goals?.goals || []
    const primaryGoal = data.goals?.primaryGoal || null

    const monthlyContribution = Math.max(0, Math.round(savings))

    const projections = goals
      .filter(goal => goal && Number(goal.target || 0) > Number(goal.current || 0))
      .map(goal => {
        const remaining = Math.max(0, Number(goal.target || 0) - Number(goal.current || 0))
        const currentMonths = monthlyContribution > 0 ? Math.ceil(remaining / monthlyContribution) : null
        const months50 = monthlyContribution + 50 > 0 ? Math.ceil(remaining / (monthlyContribution + 50)) : null
        const months100 = monthlyContribution + 100 > 0 ? Math.ceil(remaining / (monthlyContribution + 100)) : null

        return {
          name: goal.name || 'Objectif',
          remaining,
          currentMonths,
          months50,
          months100
        }
      })

    return {
      total: goals.length,
      primaryGoal,
      projections
    }
  }

  /**
   * Build context for rule evaluation
   * @param {Object} metrics - Calculated metrics
   * @param {Object} data - Collected data
   * @param {Object} judgment - Judgment
   * @returns {Object} Rule evaluation context
   */
  buildRuleContext(metrics, data, judgment) {
    return {
      ...metrics,
      debts: data.debts?.debts || [],
      goals: data.goals?.goals || [],
      primaryGoal: data.goals?.primaryGoal || null,
      judgment,
      hasData: metrics.income > 0
    }
  }

  /**
   * Analyze data and produce complete report
   * @param {Object} data - Collected data from DataCollector
   * @returns {AssistantReport} Complete analysis report
   */
  analyze(data) {
    try {
      // Calculate metrics
      const metrics = this.calculateMetrics(data)

      // Calculate score
      const score = this.calculateScore(metrics)

      // Determine status
      const { status, trajectoryLabel } = this.determineStatus(metrics, score)

      // Build judgment
      const judgment = this.buildJudgment(metrics, data)

      // Build debt strategy
      const debtStrategy = this.buildDebtStrategy(metrics, data)

      // Build goals analysis
      const goalsAnalysis = this.buildGoalsAnalysis(metrics, data)

      // Build rule context
      const ruleContext = this.buildRuleContext(metrics, data, judgment)

      // Evaluate rules for alerts
      const alertRules = this.ruleRegistry.evaluateRules(ruleContext, 'alerts')
      const alerts = alertRules.slice(0, 3).map(a => ({
        id: a.id,
        label: a.message,
        priority: a.priority
      }))

      // Evaluate rules for recommendations
      const recommendationRules = this.ruleRegistry.evaluateRules(ruleContext, 'recommendations')
      const recommendations = recommendationRules.slice(0, 6).map(r => r.message)

      // Evaluate rules for insights
      const insightRules = this.ruleRegistry.evaluateRules(ruleContext, 'insights')
      const insights = insightRules.slice(0, 6).map(i => i.message)

      // Ensure minimal outputs
      if (insights.length === 0) {
        insights.push('Aucune anomalie majeure détectée pour ce cycle.')
      }
      if (alerts.length === 0) {
        alerts.push({ id: 'none', label: 'Aucun point de vigilance majeur identifié.', priority: 0 })
      }
      if (recommendations.length === 0) {
        recommendations.push('Continuez à mettre à jour vos paiements pour affiner l\'analyse.')
      }

      // Build report
      return new AssistantReport({
        score: score.score,
        scoreLabel: score.label,
        status,
        trajectoryLabel,
        metrics,
        judgment: {
          diagnostic: judgment.diagnostic,
          impact: judgment.impact,
          action: judgment.action,
          why: judgment.why,
          primaryProblem: judgment.primaryProblem
        },
        alerts,
        recommendations,
        insights,
        debtAnalysis: debtStrategy,
        goalsAnalysis,
        metadata: {
          month: data.budget?.month || null,
          generatedAt: new Date().toISOString(),
          version: '1.0.0'
        }
      })
    } catch (error) {
      console.error('[AnalysisEngine] Error during analysis:', error)
      return createEmptyReport()
    }
  }
}

export { AnalysisEngine }
export default AnalysisEngine
