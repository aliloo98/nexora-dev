/**
 * Nexora - Couple Goal Service
 *
 * Manages shared goals with individual contributions:
 * - Maison, mariage, voyage, voiture, etc.
 * - Contributions séparées (membre 1: 420€, membre 2: 380€)
 * - Progression commune (800€ / 2000€)
 */

import { supabase } from '../supabase.js'

export const CoupleGoalService = {
  /**
   * Create a shared goal for couple
   * @param {string} coupleId - Couple ID
   * @param {Object} goalData - {name, description, targetAmount, dueDate}
   * @param {string} createdById - User ID creating goal
   * @returns {Promise<{goal, error}>}
   */
  async createSharedGoal(coupleId, goalData, createdById) {
    try {
      if (!coupleId || !goalData.name || !goalData.targetAmount) {
        throw new Error('Couple ID, name, and target amount required')
      }

      const { data, error } = await supabase
        .from('couple_goals')
        .insert({
          couple_id: coupleId,
          name: goalData.name,
          description: goalData.description || '',
          target_amount: goalData.targetAmount,
          current_amount: 0,
          due_date: goalData.dueDate || null,
          status: 'active',
          created_by: createdById
        })
        .select()
        .single()

      if (error) throw error

      console.log(`✓ Shared goal created: ${goalData.name}`)
      return { goal: data, error: null }
    } catch (error) {
      console.error('❌ Error creating goal:', error)
      return { goal: null, error: error.message }
    }
  },

  /**
   * Add contribution to shared goal
   * @param {string} goalId - Goal ID
   * @param {number} amount - Contribution amount
   * @param {string} userId - User contributing
   * @returns {Promise<{contribution, error}>}
   */
  async contributeToGoal(goalId, amount, userId) {
    try {
      if (!goalId || !amount || !userId) {
        throw new Error('Goal ID, amount, and user ID required')
      }

      if (amount <= 0) {
        throw new Error('Contribution amount must be positive')
      }

      // Create contribution record
      const { data, error } = await supabase
        .from('couple_goal_contributions')
        .insert({
          goal_id: goalId,
          user_id: userId,
          amount: amount,
          contributed_at: new Date().toISOString()
        })
        .select()
        .single()

      if (error) throw error

      // Update goal current amount
      const { data: goal, error: getError } = await supabase
        .from('couple_goals')
        .select('current_amount')
        .eq('id', goalId)
        .single()

      if (!getError && goal) {
        await supabase
          .from('couple_goals')
          .update({ current_amount: goal.current_amount + amount })
          .eq('id', goalId)
      }

      console.log(`✓ Contributed €${amount} to goal`)
      return { contribution: data, error: null }
    } catch (error) {
      console.error('❌ Error contributing to goal:', error)
      return { contribution: null, error: error.message }
    }
  },

  /**
   * Get shared goals for couple
   * @param {string} coupleId - Couple ID
   * @returns {Promise<Array>}
   */
  async getSharedGoals(coupleId) {
    try {
      if (!coupleId) return []

      const { data, error } = await supabase
        .from('couple_goals')
        .select('*')
        .eq('couple_id', coupleId)
        .eq('status', 'active')

      if (error) throw error

      return data || []
    } catch (error) {
      console.error('❌ Error fetching goals:', error)
      return []
    }
  },

  /**
   * Get goal progress and contributions
   * @param {string} goalId - Goal ID
   * @returns {Promise<{goal, contributions, error}>}
   */
  async getGoalProgress(goalId) {
    try {
      const { data: goal, error: goalError } = await supabase
        .from('couple_goals')
        .select('*')
        .eq('id', goalId)
        .single()

      if (goalError) throw goalError

      const { data: contributions, error: contribError } = await supabase
        .from('couple_goal_contributions')
        .select('*')
        .eq('goal_id', goalId)
        .order('contributed_at', { ascending: true })

      if (contribError) throw contribError

      const progressPct = goal.target_amount > 0
        ? Math.round((goal.current_amount / goal.target_amount) * 100)
        : 0

      return {
        goal: { ...goal, progressPct },
        contributions: contributions || [],
        error: null
      }
    } catch (error) {
      console.error('❌ Error fetching progress:', error)
      return { goal: null, contributions: [], error: error.message }
    }
  },

  /**
   * Get user contributions breakdown
   * @param {string} goalId - Goal ID
   * @returns {Promise<{byUser, error}>}
   */
  async getContributionBreakdown(goalId) {
    try {
      const { data, error } = await supabase
        .from('couple_goal_contributions')
        .select('user_id, amount')
        .eq('goal_id', goalId)

      if (error) throw error

      const byUser = {}
      ;(data || []).forEach(contrib => {
        if (!byUser[contrib.user_id]) {
          byUser[contrib.user_id] = 0
        }
        byUser[contrib.user_id] += contrib.amount
      })

      return { byUser, error: null }
    } catch (error) {
      console.error('❌ Error calculating breakdown:', error)
      return { byUser: {}, error: error.message }
    }
  }
}

export default CoupleGoalService
