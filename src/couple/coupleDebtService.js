/**
 * Nexora - Couple Debt Service
 *
 * Manages shared debts:
 * - Private debt or shared debt
 * - Crédit voiture partagé (shared car loan)
 * - Individual contribution calculations
 */

import { supabase } from '../supabase.js'

export const CoupleDebtService = {
  /**
   * Create a shared debt
   * @param {string} coupleId - Couple ID
   * @param {Object} debtData - {name, totalAmount, monthlyPayment, description}
   * @param {string} createdById - User ID
   * @returns {Promise<{debt, error}>}
   */
  async createSharedDebt(coupleId, debtData, createdById) {
    try {
      if (!coupleId || !debtData.name || !debtData.totalAmount) {
        throw new Error('Required fields missing')
      }

      const { data, error } = await supabase
        .from('couple_debts')
        .insert({
          couple_id: coupleId,
          name: debtData.name,
          description: debtData.description || '',
          total_amount: debtData.totalAmount,
          remaining_amount: debtData.totalAmount,
          monthly_payment: debtData.monthlyPayment || 0,
          status: 'active',
          created_by: createdById
        })
        .select()
        .single()

      if (error) throw error

      console.log(`✓ Shared debt created: ${debtData.name}`)
      return { debt: data, error: null }
    } catch (error) {
      console.error('❌ Error creating debt:', error)
      return { debt: null, error: error.message }
    }
  },

  /**
   * Pay debt contribution
   * @param {string} debtId - Debt ID
   * @param {number} amount - Payment amount
   * @param {string} userId - User making payment
   * @returns {Promise<{payment, error}>}
   */
  async payDebtContribution(debtId, amount, userId) {
    try {
      if (!debtId || !amount || !userId) {
        throw new Error('Required fields missing')
      }

      if (amount <= 0) {
        throw new Error('Payment amount must be positive')
      }

      const { data, error } = await supabase
        .from('couple_debt_payments')
        .insert({
          debt_id: debtId,
          user_id: userId,
          amount: amount,
          paid_at: new Date().toISOString()
        })
        .select()
        .single()

      if (error) throw error

      // Update remaining amount
      const { data: debt } = await supabase
        .from('couple_debts')
        .select('remaining_amount')
        .eq('id', debtId)
        .single()

      if (debt && debt.remaining_amount > 0) {
        const newRemaining = Math.max(0, debt.remaining_amount - amount)
        await supabase
          .from('couple_debts')
          .update({ remaining_amount: newRemaining })
          .eq('id', debtId)
      }

      console.log(`✓ Debt payment: €${amount}`)
      return { payment: data, error: null }
    } catch (error) {
      console.error('❌ Error recording payment:', error)
      return { payment: null, error: error.message }
    }
  },

  /**
   * Get shared debts for couple
   * @param {string} coupleId - Couple ID
   * @returns {Promise<Array>}
   */
  async getSharedDebts(coupleId) {
    try {
      if (!coupleId) return []

      const { data, error } = await supabase
        .from('couple_debts')
        .select('*')
        .eq('couple_id', coupleId)
        .eq('status', 'active')

      if (error) throw error

      return data || []
    } catch (error) {
      console.error('❌ Error fetching debts:', error)
      return []
    }
  },

  /**
   * Get debt status and repayment progress
   * @param {string} debtId - Debt ID
   * @returns {Promise<{debt, payments, error}>}
   */
  async getDebtStatus(debtId) {
    try {
      const { data: debt, error: debtError } = await supabase
        .from('couple_debts')
        .select('*')
        .eq('id', debtId)
        .single()

      if (debtError) throw debtError

      const { data: payments, error: payError } = await supabase
        .from('couple_debt_payments')
        .select('*')
        .eq('debt_id', debtId)

      if (payError) throw payError

      const repaymentPct = debt.total_amount > 0
        ? Math.round(((debt.total_amount - debt.remaining_amount) / debt.total_amount) * 100)
        : 0

      return {
        debt: { ...debt, repaymentPct },
        payments: payments || [],
        error: null
      }
    } catch (error) {
      console.error('❌ Error fetching debt status:', error)
      return { debt: null, payments: [], error: error.message }
    }
  },

  /**
   * Get individual contribution to debt
   * @param {string} debtId - Debt ID
   * @returns {Promise<{byUser, error}>}
   */
  async getDebtContributionBreakdown(debtId) {
    try {
      const { data, error } = await supabase
        .from('couple_debt_payments')
        .select('user_id, amount')
        .eq('debt_id', debtId)

      if (error) throw error

      const byUser = {}
      ;(data || []).forEach(payment => {
        if (!byUser[payment.user_id]) {
          byUser[payment.user_id] = 0
        }
        byUser[payment.user_id] += payment.amount
      })

      return { byUser, error: null }
    } catch (error) {
      console.error('❌ Error calculating breakdown:', error)
      return { byUser: {}, error: error.message }
    }
  },

  /**
   * Mark debt as paid
   * @param {string} debtId - Debt ID
   * @returns {Promise<{success, error}>}
   */
  async markDebtAsPaid(debtId) {
    try {
      if (!debtId) throw new Error('Debt ID required')

      const { error } = await supabase
        .from('couple_debts')
        .update({ status: 'paid' })
        .eq('id', debtId)

      if (error) throw error

      console.log('✓ Debt marked as paid')
      return { success: true, error: null }
    } catch (error) {
      console.error('❌ Error marking debt paid:', error)
      return { success: false, error: error.message }
    }
  }
}

export default CoupleDebtService
