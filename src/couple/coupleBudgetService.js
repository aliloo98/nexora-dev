/**
 * Nexora - Couple Budget Service
 *
 * Manages household budget calculations:
 * - Common revenues (from shared income transactions)
 * - Common expenses (from shared expense transactions)
 * - Household remaining budget
 * - Individual contributions tracking
 *
 * Budget Display:
 * ❤️ Couple Budget View
 * 
 * Revenus communs (shared income)
 * Charges communes (shared expenses)
 * Reste à vivre commun (household available)
 * 
 * Contribution membre 1: 45%
 * Contribution membre 2: 55%
 */

import { supabase } from '../supabase.js'
import { StorageManager } from '../../js/storage.js'

const COUPLE_BUDGET_CACHE_KEY = 'nexora_couple_budget_cache'
const COUPLE_BUDGET_CACHE_TTL = 10 * 60 * 1000 // 10 minutes

export const CoupleBudgetService = {
  /**
   * Get couple budget summary for a given month
   * @param {string} coupleId - Couple ID
   * @param {string} monthYear - Format: 'YYYY-MM'
   * @returns {Promise<{budget, error}>}
   */
  async getCoupleBudgetForMonth(coupleId, monthYear) {
    try {
      if (!coupleId || !monthYear) {
        throw new Error('Couple ID and month are required')
      }

      // Try cache first
      const cached = await this._getCache(coupleId, monthYear)
      if (cached) {
        return { budget: cached, error: null }
      }

      // Get couple info
      const { data: coupleData, error: coupleError } = await supabase
        .from('couples')
        .select('user_id_1, user_id_2')
        .eq('id', coupleId)
        .single()

      if (coupleError) throw coupleError

      const [userId1, userId2] = [coupleData.user_id_1, coupleData.user_id_2]

      // Get shared transactions for this month
      const startDate = `${monthYear}-01`
      const endDate = new Date(monthYear + '-01')
      endDate.setMonth(endDate.getMonth() + 1)
      const endDateStr = endDate.toISOString().split('T')[0]

      // Get all shared transaction IDs
      const { data: sharedItems, error: shareError } = await supabase
        .from('shared_items')
        .select('item_id')
        .eq('couple_id', coupleId)
        .eq('item_type', 'transaction')
        .eq('is_shared', true)

      if (shareError) throw shareError

      const sharedTransactionIds = sharedItems?.map(item => item.item_id) || []

      // Get transactions for both users in this month
      let query = supabase
        .from('transactions')
        .select('id, user_id, amount, transaction_type')
        .gte('transaction_date', startDate)
        .lt('transaction_date', endDateStr)
        .or(`user_id.eq.${userId1},user_id.eq.${userId2}`)

      const { data: allTransactions, error: transError } = await query

      if (transError) throw transError

      // Filter to only shared transactions
      const sharedTransactions = (allTransactions || []).filter(t =>
        sharedTransactionIds.includes(t.id)
      )

      // Calculate budget
      const budget = this._calculateBudget(sharedTransactions, userId1, userId2, monthYear)

      // Cache it
      await this._setCache(coupleId, monthYear, budget)

      console.log(`✓ Couple budget fetched: ${monthYear}`)
      return { budget, error: null }
    } catch (error) {
      console.error('❌ Error fetching couple budget:', error)
      return { budget: null, error: error.message }
    }
  },

  /**
   * Get couple budget trend (last N months)
   * @param {string} coupleId - Couple ID
   * @param {number} months - Number of months to retrieve
   * @returns {Promise<{trend, error}>}
   */
  async getCoupleBudgetTrend(coupleId, months = 6) {
    try {
      if (!coupleId) throw new Error('Couple ID required')

      const trend = []
      const now = new Date()

      for (let i = 0; i < months; i++) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
        const monthYear = d.toISOString().substring(0, 7) // YYYY-MM

        const { budget } = await this.getCoupleBudgetForMonth(coupleId, monthYear)
        if (budget) {
          trend.unshift(budget)
        }
      }

      console.log(`✓ Couple budget trend fetched: ${trend.length} months`)
      return { trend, error: null }
    } catch (error) {
      console.error('❌ Error fetching budget trend:', error)
      return { trend: [], error: error.message }
    }
  },

  /**
   * Get user contribution percentage to household
   * @param {string} coupleId - Couple ID
   * @param {string} monthYear - Format: 'YYYY-MM'
   * @returns {Promise<{user1Pct, user2Pct, error}>}
   */
  async getContributionPercentages(coupleId, monthYear) {
    try {
      if (!coupleId || !monthYear) {
        throw new Error('Couple ID and month required')
      }

      const { budget } = await this.getCoupleBudgetForMonth(coupleId, monthYear)
      if (!budget) {
        throw new Error('Budget not found')
      }

      return {
        user1Pct: budget.user1_contribution_pct,
        user2Pct: budget.user2_contribution_pct,
        error: null
      }
    } catch (error) {
      console.error('❌ Error calculating contributions:', error)
      return { user1Pct: 0, user2Pct: 0, error: error.message }
    }
  },

  /**
   * Get shared expenses by category
   * @param {string} coupleId - Couple ID
   * @param {string} monthYear - Format: 'YYYY-MM'
   * @returns {Promise<Array>}
   */
  async getSharedExpensesByCategory(coupleId, monthYear) {
    try {
      const { budget } = await this.getCoupleBudgetForMonth(coupleId, monthYear)
      if (!budget || !budget.expenses_by_category) {
        return []
      }

      return budget.expenses_by_category.sort((a, b) => b.amount - a.amount)
    } catch (error) {
      console.error('❌ Error fetching expenses by category:', error)
      return []
    }
  },

  /**
   * Clear budget cache for recalculation
   * @param {string} coupleId - Couple ID
   * @returns {Promise<{success}>}
   */
  async clearBudgetCache(coupleId) {
    try {
      const cacheKey = `${COUPLE_BUDGET_CACHE_KEY}_${coupleId}*`
      // In real implementation would clear all matching keys
      // For now, clear main key
      const mainKey = `${COUPLE_BUDGET_CACHE_KEY}_${coupleId}`
      await StorageManager.removeItem(mainKey)

      console.log('✓ Budget cache cleared')
      return { success: true }
    } catch (error) {
      console.error('❌ Error clearing cache:', error)
      return { success: false }
    }
  },

  // ========== INTERNAL HELPERS ==========

  _calculateBudget(transactions, userId1, userId2, monthYear) {
    // Group by user
    const user1Transactions = transactions.filter(t => t.user_id === userId1)
    const user2Transactions = transactions.filter(t => t.user_id === userId2)

    // Calculate totals
    const user1Income = this._sumByType(user1Transactions, 'income')
    const user1Expenses = this._sumByType(user1Transactions, 'expense')
    const user2Income = this._sumByType(user2Transactions, 'income')
    const user2Expenses = this._sumByType(user2Transactions, 'expense')

    const totalIncome = user1Income + user2Income
    const totalExpenses = user1Expenses + user2Expenses
    const remaining = totalIncome - totalExpenses

    // Contribution percentages (based on income)
    const user1ContributionPct = totalIncome > 0 ? (user1Income / totalIncome) * 100 : 50
    const user2ContributionPct = totalIncome > 0 ? (user2Income / totalIncome) * 100 : 50

    return {
      month_year: monthYear,
      common_income: totalIncome,
      common_expenses: totalExpenses,
      remaining: remaining,
      user1_income: user1Income,
      user2_income: user2Income,
      user1_expenses: user1Expenses,
      user2_expenses: user2Expenses,
      user1_contribution_pct: Math.round(user1ContributionPct * 10) / 10,
      user2_contribution_pct: Math.round(user2ContributionPct * 10) / 10,
      user1_net: user1Income - user1Expenses,
      user2_net: user2Income - user2Expenses,
      expenses_by_category: [] // TODO: group by category
    }
  },

  _sumByType(transactions, type) {
    return transactions
      .filter(t => t.transaction_type === type)
      .reduce((sum, t) => sum + (t.amount || 0), 0)
  },

  async _getCache(coupleId, monthYear) {
    try {
      const cacheKey = `${COUPLE_BUDGET_CACHE_KEY}_${coupleId}_${monthYear}`
      const cached = await StorageManager.getItem(cacheKey)

      if (cached && cached.expiry > Date.now()) {
        return cached.data
      }
      return null
    } catch (error) {
      return null
    }
  },

  async _setCache(coupleId, monthYear, data) {
    try {
      const cacheKey = `${COUPLE_BUDGET_CACHE_KEY}_${coupleId}_${monthYear}`
      await StorageManager.setItem(cacheKey, {
        data,
        expiry: Date.now() + COUPLE_BUDGET_CACHE_TTL
      })
    } catch (error) {
      console.warn('Cache warning:', error)
    }
  }
}

export default CoupleBudgetService
