/**
 * Nexora - Couple Assistant Service
 *
 * AI-powered insights for couple households:
 * - "Le foyer épargne 280 €/mois."
 * - "Objectif Maison atteignable dans 14 mois."
 * - "Un membre contribue à 57% du budget commun."
 * - "Les dépenses communes augmentent."
 */

import { supabase } from '../supabase.js'

export const CoupleAssistantService = {
  /**
   * Analyze couple budget and provide insights
   * @param {string} coupleId - Couple ID
   * @param {Object} budget - Budget data from CoupleBudgetService
   * @returns {Promise<{insights, alerts, recommendations}>}
   */
  async analyzeCoupleMetrics(coupleId, budget) {
    try {
      if (!coupleId || !budget) {
        throw new Error('Couple ID and budget required')
      }

      const insights = []
      const alerts = []
      const recommendations = []

      // Insight 1: Household savings
      if (budget.remaining > 0) {
        insights.push({
          type: 'savings',
          message: `Le foyer épargne €${Math.round(budget.remaining)}/mois.`,
          priority: 'high',
          emoji: '💰'
        })
      } else if (budget.remaining < 0) {
        alerts.push({
          type: 'deficit',
          message: `Le foyer affiche un déficit de €${Math.abs(Math.round(budget.remaining))}.`,
          priority: 'critical',
          emoji: '⚠️'
        })
      }

      // Insight 2: Contribution imbalance
      const contributionDiff = Math.abs(budget.user1_contribution_pct - budget.user2_contribution_pct)
      if (contributionDiff > 20) {
        insights.push({
          type: 'contribution',
          message: `Contribution déséquilibrée: ${Math.round(budget.user1_contribution_pct)}% vs ${Math.round(budget.user2_contribution_pct)}%.`,
          priority: 'medium',
          emoji: '⚖️'
        })
      }

      // Recommendation: expenses trending
      if (budget.common_expenses > budget.common_income * 0.6) {
        recommendations.push({
          type: 'expense_control',
          message: 'Les dépenses communes représentent >60% des revenus. À surveiller.',
          priority: 'medium',
          emoji: '📊'
        })
      }

      console.log(`✓ Couple metrics analyzed`)
      return { insights, alerts, recommendations, error: null }
    } catch (error) {
      console.error('❌ Error analyzing metrics:', error)
      return { insights: [], alerts: [], recommendations: [], error: error.message }
    }
  },

  /**
   * Analyze goal progress
   * @param {Array} goals - Array of goals from CoupleGoalService
   * @returns {Promise<{goalInsights, error}>}
   */
  async analyzeGoalProgress(goals) {
    try {
      if (!Array.isArray(goals)) {
        throw new Error('Goals array required')
      }

      const goalInsights = []

      goals.forEach(goal => {
        const progressPct = (goal.current_amount / goal.target_amount) * 100

        // When is goal achievable?
        const monthsToComplete = this._estimateMonthsToGoal(goal)
        if (monthsToComplete > 0) {
          goalInsights.push({
            goal: goal.name,
            message: `Objectif ${goal.name} atteignable dans ${monthsToComplete} mois.`,
            progressPct: Math.round(progressPct),
            emoji: '🎯'
          })
        }

        // Goal at risk?
        if (progressPct < 10 && goal.due_date) {
          const daysToDeadline = this._daysUntilDate(goal.due_date)
          if (daysToDeadline < 90) {
            goalInsights.push({
              goal: goal.name,
              message: `Attention: ${goal.name} à risque. ${daysToDeadline} jours restants.`,
              type: 'at_risk',
              emoji: '⏰'
            })
          }
        }
      })

      return { goalInsights, error: null }
    } catch (error) {
      console.error('❌ Error analyzing goals:', error)
      return { goalInsights: [], error: error.message }
    }
  },

  /**
   * Generate personalized messages
   * @param {Object} metrics - Couple metrics
   * @returns {Promise<Array>}
   */
  async generatePersonalMessages(metrics) {
    try {
      const messages = []

      // Message about savings trend
      if (metrics.remaining > 1000) {
        messages.push({
          tone: 'positive',
          message: 'Super ! Vous économisez bien en tant que couple. Continuez ! 🌟',
          priority: 'low'
        })
      }

      // Message about expenses
      if (metrics.common_expenses < metrics.common_income * 0.4) {
        messages.push({
          tone: 'positive',
          message: 'Excellent contrôle des dépenses. Bien joué ! 🎉',
          priority: 'low'
        })
      }

      // Neutral tone messages (no judgment)
      messages.push({
        tone: 'neutral',
        message: `Cet mois-ci: €${Math.round(metrics.common_income)} de revenus communs.`,
        priority: 'informational'
      })

      return messages
    } catch (error) {
      console.error('❌ Error generating messages:', error)
      return []
    }
  },

  /**
   * Get couple health score (0-100)
   * @param {Object} budget - Budget data
   * @param {Array} goals - Goals array
   * @param {Array} debts - Debts array
   * @returns {Promise<{score, explanation}>}
   */
  async getCoupleBudgetHealth(budget, goals = [], debts = []) {
    try {
      let score = 50 // baseline

      // Income stability (+20)
      if (budget.common_income > 0) {
        score += 20
      }

      // Positive savings (+15)
      if (budget.remaining > 0) {
        score += 15
      }

      // No deficit (-20)
      if (budget.remaining < 0) {
        score -= 20
      }

      // Goals progress (+10)
      const totalGoalProgress = goals.reduce((sum, g) => sum + (g.current_amount / g.target_amount), 0)
      if (totalGoalProgress > 0.3) {
        score += 10
      }

      // Low debt (-15)
      const totalDebt = debts.reduce((sum, d) => sum + d.remaining_amount, 0)
      if (totalDebt > budget.common_income * 12) {
        score -= 15
      }

      const explanation = score > 70 ? 'Healthy' : score > 50 ? 'Fair' : 'Needs attention'

      return { score: Math.min(100, Math.max(0, score)), explanation, error: null }
    } catch (error) {
      console.error('❌ Error calculating health:', error)
      return { score: 0, explanation: 'Error', error: error.message }
    }
  },

  // ========== HELPERS ==========

  _estimateMonthsToGoal(goal) {
    if (!goal.current_amount || goal.remaining_amount <= 0) return -1

    // Calculate average monthly contribution (estimate: 300€/month)
    const avgMonthlyContribution = 300
    return Math.ceil(goal.remaining_amount / avgMonthlyContribution)
  },

  _daysUntilDate(dateString) {
    const now = new Date()
    const target = new Date(dateString)
    const diff = target - now
    return Math.ceil(diff / (1000 * 60 * 60 * 24))
  }
}

export default CoupleAssistantService
