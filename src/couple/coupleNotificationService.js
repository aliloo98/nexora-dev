/**
 * Nexora - Couple Notification Service
 *
 * Sends notifications for couple events:
 * - objectif commun alimenté (shared goal contribution)
 * - dette commune remboursée (shared debt payment)
 * - objectif atteint (goal complete)
 * - budget foyer négatif (household deficit)
 */

import { supabase } from '../supabase.js'

export const CoupleNotificationService = {
  /**
   * Send goal contribution notification
   * @param {string} coupleId - Couple ID
   * @param {string} userId - User who contributed
   * @param {string} goalName - Goal name
   * @param {number} amount - Contribution amount
   * @returns {Promise<{notification, error}>}
   */
  async notifyGoalContribution(coupleId, userId, goalName, amount) {
    try {
      if (!coupleId || !userId || !goalName || !amount) {
        throw new Error('Required fields missing')
      }

      const { data, error } = await supabase
        .from('couple_notifications')
        .insert({
          couple_id: coupleId,
          type: 'goal_contribution',
          title: `Objectif alimenté: ${goalName}`,
          message: `€${amount} ajoutés à "${goalName}"`,
          data: JSON.stringify({ goalName, amount, userId }),
          created_at: new Date().toISOString()
        })
        .select()
        .single()

      if (error) throw error

      console.log(`✓ Goal contribution notification sent`)
      return { notification: data, error: null }
    } catch (error) {
      console.error('❌ Error sending notification:', error)
      return { notification: null, error: error.message }
    }
  },

  /**
   * Send goal completion notification
   * @param {string} coupleId - Couple ID
   * @param {string} goalName - Goal name
   * @returns {Promise<{notification, error}>}
   */
  async notifyGoalCompleted(coupleId, goalName) {
    try {
      if (!coupleId || !goalName) {
        throw new Error('Required fields missing')
      }

      const { data, error } = await supabase
        .from('couple_notifications')
        .insert({
          couple_id: coupleId,
          type: 'goal_completed',
          title: `Objectif atteint ! 🎉`,
          message: `"${goalName}" est complètement financé !`,
          data: JSON.stringify({ goalName }),
          created_at: new Date().toISOString()
        })
        .select()
        .single()

      if (error) throw error

      console.log(`✓ Goal completion notification sent`)
      return { notification: data, error: null }
    } catch (error) {
      console.error('❌ Error sending notification:', error)
      return { notification: null, error: error.message }
    }
  },

  /**
   * Send debt payment notification
   * @param {string} coupleId - Couple ID
   * @param {string} debtName - Debt name
   * @param {number} amount - Payment amount
   * @returns {Promise<{notification, error}>}
   */
  async notifyDebtPayment(coupleId, debtName, amount) {
    try {
      if (!coupleId || !debtName || !amount) {
        throw new Error('Required fields missing')
      }

      const { data, error } = await supabase
        .from('couple_notifications')
        .insert({
          couple_id: coupleId,
          type: 'debt_payment',
          title: `Dette remboursée: ${debtName}`,
          message: `€${amount} payés pour "${debtName}"`,
          data: JSON.stringify({ debtName, amount }),
          created_at: new Date().toISOString()
        })
        .select()
        .single()

      if (error) throw error

      console.log(`✓ Debt payment notification sent`)
      return { notification: data, error: null }
    } catch (error) {
      console.error('❌ Error sending notification:', error)
      return { notification: null, error: error.message }
    }
  },

  /**
   * Send budget deficit alert
   * @param {string} coupleId - Couple ID
   * @param {number} deficit - Deficit amount
   * @returns {Promise<{notification, error}>}
   */
  async notifyBudgetDeficit(coupleId, deficit) {
    try {
      if (!coupleId || !deficit) {
        throw new Error('Required fields missing')
      }

      const { data, error } = await supabase
        .from('couple_notifications')
        .insert({
          couple_id: coupleId,
          type: 'budget_deficit',
          title: `Alerte budget négatif ⚠️`,
          message: `Le foyer affiche un déficit de €${Math.abs(deficit)}`,
          data: JSON.stringify({ deficit }),
          priority: 'high',
          created_at: new Date().toISOString()
        })
        .select()
        .single()

      if (error) throw error

      console.log(`✓ Budget deficit alert sent`)
      return { notification: data, error: null }
    } catch (error) {
      console.error('❌ Error sending alert:', error)
      return { notification: null, error: error.message }
    }
  },

  /**
   * Get notifications for couple
   * @param {string} coupleId - Couple ID
   * @param {number} limit - Number to retrieve
   * @returns {Promise<Array>}
   */
  async getNotifications(coupleId, limit = 20) {
    try {
      if (!coupleId) return []

      const { data, error } = await supabase
        .from('couple_notifications')
        .select('*')
        .eq('couple_id', coupleId)
        .order('created_at', { ascending: false })
        .limit(limit)

      if (error) throw error

      return data || []
    } catch (error) {
      console.error('❌ Error fetching notifications:', error)
      return []
    }
  },

  /**
   * Mark notification as read
   * @param {string} notificationId - Notification ID
   * @returns {Promise<{success, error}>}
   */
  async markAsRead(notificationId) {
    try {
      if (!notificationId) throw new Error('Notification ID required')

      const { error } = await supabase
        .from('couple_notifications')
        .update({ read_at: new Date().toISOString() })
        .eq('id', notificationId)

      if (error) throw error

      console.log(`✓ Notification marked as read`)
      return { success: true, error: null }
    } catch (error) {
      console.error('❌ Error marking read:', error)
      return { success: false, error: error.message }
    }
  },

  /**
   * Get unread notification count
   * @param {string} coupleId - Couple ID
   * @returns {Promise<number>}
   */
  async getUnreadCount(coupleId) {
    try {
      if (!coupleId) return 0

      const { data, error } = await supabase
        .from('couple_notifications')
        .select('id')
        .eq('couple_id', coupleId)
        .is('read_at', null)

      if (error) throw error

      return data?.length || 0
    } catch (error) {
      console.error('❌ Error counting unread:', error)
      return 0
    }
  }
}

export default CoupleNotificationService
