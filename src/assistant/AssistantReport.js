/**
 * AssistantReport - Immutable output model for Assistant Nexora
 * 
 * This is the single output model that all consumers of the assistant receive.
 * It provides a consistent interface regardless of internal implementation changes.
 */

class AssistantReport {
  constructor(data = {}) {
    // Score and overall health
    this.score = data.score ?? 0
    this.scoreLabel = data.scoreLabel ?? 'Inconnu'
    this.status = data.status ?? 'no_data'
    this.trajectoryLabel = data.trajectoryLabel ?? ''

    // Metrics
    this.metrics = {
      income: data.metrics?.income ?? 0,
      fixedExpenses: data.metrics?.fixedExpenses ?? 0,
      variableExpenses: data.metrics?.variableExpenses ?? 0,
      totalExpenses: data.metrics?.totalExpenses ?? 0,
      savings: data.metrics?.savings ?? 0,
      savingsRate: data.metrics?.savingsRate ?? 0,
      chargesRate: data.metrics?.chargesRate ?? 0,
      fixedRate: data.metrics?.fixedRate ?? 0,
      variableRate: data.metrics?.variableRate ?? 0
    }

    // Judgment (single primary judgment)
    this.judgment = {
      diagnostic: data.judgment?.diagnostic ?? '',
      impact: data.judgment?.impact ?? '',
      action: data.judgment?.action ?? '',
      why: data.judgment?.why ?? '',
      primaryProblem: data.judgment?.primaryProblem ?? null
    }

    // Alerts (prioritized)
    this.alerts = Array.isArray(data.alerts) ? [...data.alerts] : []

    // Recommendations (prioritized)
    this.recommendations = Array.isArray(data.recommendations) ? [...data.recommendations] : []

    // Insights (general observations)
    this.insights = Array.isArray(data.insights) ? [...data.insights] : []

    // Forecasts (optional)
    this.forecasts = {
      budget: Array.isArray(data.forecasts?.budget) ? [...data.forecasts.budget] : [],
      goals: Array.isArray(data.forecasts?.goals) ? [...data.forecasts.goals] : []
    }

    // Debt analysis
    this.debtAnalysis = {
      total: data.debtAnalysis?.total ?? 0,
      monthlyTotal: data.debtAnalysis?.monthlyTotal ?? 0,
      rate: data.debtAnalysis?.rate ?? 0,
      strategy: data.debtAnalysis?.strategy ?? null
    }

    // Goals analysis
    this.goalsAnalysis = {
      total: data.goalsAnalysis?.total ?? 0,
      primaryGoal: data.goalsAnalysis?.primaryGoal ?? null,
      projections: Array.isArray(data.goalsAnalysis?.projections) ? [...data.goalsAnalysis.projections] : []
    }

    // Metadata
    this.metadata = {
      month: data.metadata?.month ?? null,
      generatedAt: data.metadata?.generatedAt ?? new Date().toISOString(),
      version: data.metadata?.version ?? '1.0.0'
    }

    // Freeze to make immutable
    Object.freeze(this)
    Object.freeze(this.metrics)
    Object.freeze(this.judgment)
    Object.freeze(this.alerts)
    Object.freeze(this.recommendations)
    Object.freeze(this.insights)
    Object.freeze(this.forecasts)
    Object.freeze(this.debtAnalysis)
    Object.freeze(this.goalsAnalysis)
    Object.freeze(this.metadata)
  }

  /**
   * Create a new report with merged data (immutable update)
   * @param {Object} newData - Data to merge
   * @returns {AssistantReport} New report instance
   */
  merge(newData) {
    return new AssistantReport({
      score: newData.score ?? this.score,
      scoreLabel: newData.scoreLabel ?? this.scoreLabel,
      status: newData.status ?? this.status,
      trajectoryLabel: newData.trajectoryLabel ?? this.trajectoryLabel,
      metrics: { ...this.metrics, ...newData.metrics },
      judgment: { ...this.judgment, ...newData.judgment },
      alerts: newData.alerts ?? [...this.alerts],
      recommendations: newData.recommendations ?? [...this.recommendations],
      insights: newData.insights ?? [...this.insights],
      forecasts: {
        budget: newData.forecasts?.budget ?? [...this.forecasts.budget],
        goals: newData.forecasts?.goals ?? [...this.forecasts.goals]
      },
      debtAnalysis: { ...this.debtAnalysis, ...newData.debtAnalysis },
      goalsAnalysis: {
        ...this.goalsAnalysis,
        ...newData.goalsAnalysis,
        projections: newData.goalsAnalysis?.projections ?? [...this.goalsAnalysis.projections]
      },
      metadata: { ...this.metadata, ...newData.metadata }
    })
  }

  /**
   * Check if report has analyzable data
   * @returns {boolean}
   */
  hasData() {
    return this.status !== 'no_data' && this.metrics.income > 0
  }

  /**
   * Get top priority alert
   * @returns {Object|null}
   */
  getTopAlert() {
    return this.alerts.length > 0 ? this.alerts[0] : null
  }

  /**
   * Get top priority recommendation
   * @returns {Object|null}
   */
  getTopRecommendation() {
    return this.recommendations.length > 0 ? this.recommendations[0] : null
  }

  /**
   * Convert to plain object (for serialization)
   * @returns {Object}
   */
  toJSON() {
    return {
      score: this.score,
      scoreLabel: this.scoreLabel,
      status: this.status,
      trajectoryLabel: this.trajectoryLabel,
      metrics: { ...this.metrics },
      judgment: { ...this.judgment },
      alerts: [...this.alerts],
      recommendations: [...this.recommendations],
      insights: [...this.insights],
      forecasts: {
        budget: [...this.forecasts.budget],
        goals: [...this.forecasts.goals]
      },
      debtAnalysis: { ...this.debtAnalysis },
      goalsAnalysis: {
        ...this.goalsAnalysis,
        projections: [...this.goalsAnalysis.projections]
      },
      metadata: { ...this.metadata }
    }
  }
}

/**
 * Create an empty report (for error cases)
 * @returns {AssistantReport}
 */
export function createEmptyReport() {
  return new AssistantReport({
    score: 0,
    scoreLabel: 'Données insuffisantes',
    status: 'no_data',
    trajectoryLabel: 'Données insuffisantes',
    judgment: {
      diagnostic: 'Données insuffisantes pour établir un jugement.',
      impact: 'Sans données, aucune analyse n\'est possible.',
      action: 'Complétez votre budget pour activer l\'assistant.',
      why: 'Les données sont nécessaires pour toute analyse financière.'
    },
    alerts: [],
    recommendations: [],
    insights: ['Complétez votre budget pour obtenir une analyse.'],
    metadata: {
      generatedAt: new Date().toISOString(),
      version: '1.0.0'
    }
  })
}

export { AssistantReport }
export default AssistantReport
