/**
 * Nexora - Couple Service
 *
 * Manages couple relationships, household formation, and basic couple operations.
 * Implements the collaborative couple budget feature.
 *
 * Core entities:
 * - couples: Relationship between 2 users forming a household
 * - couple_invitations: Invitation workflow
 * - shared_items: Granular sharing control
 */

import { supabase } from '../supabase.js'
import { StorageManager } from '../../js/storage.js'

const COUPLE_CACHE_KEY = 'nexora_couple_cache'
const COUPLE_TTL = 5 * 60 * 1000 // 5 minutes

export const CoupleService = {
  /**
   * Get the current user's active couple (if any)
   * @param {string} userId - User ID to check
   * @returns {Promise<{couple, partner}>}
   */
  async getActiveCoupleForUser(userId) {
    if (!userId) return { couple: null, partner: null }

    try {
      // Try to get from cache first
      const cached = await StorageManager.getItem(COUPLE_CACHE_KEY)
      if (cached) {
        const { couple, expiry } = cached
        if (expiry > Date.now()) {
          return couple
        }
      }

      const { data, error } = await supabase
        .from('couples')
        .select('*')
        .or(`user_id_1.eq.${userId},user_id_2.eq.${userId}`)
        .eq('status', 'active')
        .single()

      if (error && error.code !== 'PGRST116') {
        throw error
      }

      if (!data) {
        return { couple: null, partner: null }
      }

      // Get partner info
      const partnerId = data.user_id_1 === userId ? data.user_id_2 : data.user_id_1

      // Cache for 5 minutes
      await StorageManager.setItem(COUPLE_CACHE_KEY, {
        couple: { couple: data, partnerId },
        expiry: Date.now() + COUPLE_TTL
      })

      return { couple: data, partnerId }
    } catch (error) {
      console.error('❌ Error fetching couple:', error)
      return { couple: null, partnerId: null }
    }
  },

  /**
   * Check if a couple exists for the given user pair
   * @param {string} userId1 - First user ID
   * @param {string} userId2 - Second user ID
   * @returns {Promise<boolean>}
   */
  async couplePairExists(userId1, userId2) {
    try {
      const sortedIds = [userId1, userId2].sort()
      
      const { data, error } = await supabase
        .from('couples')
        .select('id')
        .eq('user_id_1', sortedIds[0])
        .eq('user_id_2', sortedIds[1])
        .single()

      if (error && error.code === 'PGRST116') {
        return false // No rows found
      }

      if (error) throw error
      
      return !!data
    } catch (error) {
      console.error('❌ Error checking couple pair:', error)
      return false
    }
  },

  /**
   * Create a new couple relationship
   * @param {string} userId1 - First user ID
   * @param {string} userId2 - Second user ID
   * @returns {Promise<{couple, error}>}
   */
  async createCouple(userId1, userId2) {
    try {
      if (!userId1 || !userId2) {
        throw new Error('Both user IDs are required')
      }

      if (userId1 === userId2) {
        throw new Error('Cannot form couple with same user')
      }

      // Sort IDs to ensure consistency
      const sortedIds = [userId1, userId2].sort()

      // Check if couple already exists
      const exists = await this.couplePairExists(sortedIds[0], sortedIds[1])
      if (exists) {
        throw new Error('Couple already exists for this pair')
      }

      const { data, error } = await supabase
        .from('couples')
        .insert({
          user_id_1: sortedIds[0],
          user_id_2: sortedIds[1],
          status: 'active'
        })
        .select()
        .single()

      if (error) throw error

      // Clear cache
      await StorageManager.removeItem(COUPLE_CACHE_KEY)

      console.log('✓ Couple created:', data.id)
      return { couple: data, error: null }
    } catch (error) {
      console.error('❌ Error creating couple:', error)
      return { couple: null, error: error.message }
    }
  },

  /**
   * Dissolve a couple relationship
   * @param {string} coupleId - Couple ID
   * @returns {Promise<{success, error}>}
   */
  async dissolveCouple(coupleId) {
    try {
      const { error } = await supabase
        .from('couples')
        .update({ status: 'dissolved' })
        .eq('id', coupleId)

      if (error) throw error

      // Clear cache
      await StorageManager.removeItem(COUPLE_CACHE_KEY)

      console.log('✓ Couple dissolved:', coupleId)
      return { success: true, error: null }
    } catch (error) {
      console.error('❌ Error dissolving couple:', error)
      return { success: false, error: error.message }
    }
  },

  /**
   * Mark item as shared for couple
   * @param {string} coupleId - Couple ID
   * @param {string} itemId - Item ID (transaction, goal, etc)
   * @param {string} itemType - Type of item
   * @param {string} userId - User sharing the item
   * @returns {Promise<{sharedItem, error}>}
   */
  async shareItem(coupleId, itemId, itemType, userId) {
    try {
      if (!['transaction', 'category', 'goal', 'debt', 'account'].includes(itemType)) {
        throw new Error(`Invalid item type: ${itemType}`)
      }

      const { data, error } = await supabase
        .from('shared_items')
        .upsert(
          {
            couple_id: coupleId,
            item_id: itemId,
            item_type: itemType,
            is_shared: true,
            created_by: userId
          },
          { onConflict: 'couple_id,item_id,item_type' }
        )
        .select()
        .single()

      if (error) throw error

      console.log('✓ Item shared:', itemId)
      return { sharedItem: data, error: null }
    } catch (error) {
      console.error('❌ Error sharing item:', error)
      return { sharedItem: null, error: error.message }
    }
  },

  /**
   * Mark item as private for couple
   * @param {string} coupleId - Couple ID
   * @param {string} itemId - Item ID
   * @param {string} itemType - Type of item
   * @returns {Promise<{success, error}>}
   */
  async unshareItem(coupleId, itemId, itemType) {
    try {
      const { error } = await supabase
        .from('shared_items')
        .update({ is_shared: false })
        .eq('couple_id', coupleId)
        .eq('item_id', itemId)
        .eq('item_type', itemType)

      if (error) throw error

      console.log('✓ Item unshared:', itemId)
      return { success: true, error: null }
    } catch (error) {
      console.error('❌ Error unsharing item:', error)
      return { success: false, error: error.message }
    }
  },

  /**
   * Get sharing status for an item
   * @param {string} coupleId - Couple ID
   * @param {string} itemId - Item ID
   * @param {string} itemType - Type of item
   * @returns {Promise<boolean>}
   */
  async isItemShared(coupleId, itemId, itemType) {
    try {
      const { data, error } = await supabase
        .from('shared_items')
        .select('is_shared')
        .eq('couple_id', coupleId)
        .eq('item_id', itemId)
        .eq('item_type', itemType)
        .single()

      if (error && error.code === 'PGRST116') {
        return false // Item not in shared_items = not shared
      }

      if (error) throw error

      return data?.is_shared || false
    } catch (error) {
      console.error('❌ Error checking sharing status:', error)
      return false
    }
  },

  /**
   * Get all shared items for a couple
   * @param {string} coupleId - Couple ID
   * @param {string} itemType - Filter by item type (optional)
   * @returns {Promise<Array>}
   */
  async getSharedItems(coupleId, itemType = null) {
    try {
      let query = supabase
        .from('shared_items')
        .select('*')
        .eq('couple_id', coupleId)
        .eq('is_shared', true)

      if (itemType) {
        query = query.eq('item_type', itemType)
      }

      const { data, error } = await query

      if (error) throw error

      return data || []
    } catch (error) {
      console.error('❌ Error fetching shared items:', error)
      return []
    }
  },

  /**
   * Get sharing stats for a couple
   * @param {string} coupleId - Couple ID
   * @returns {Promise<Object>}
   */
  async getSharingStats(coupleId) {
    try {
      const { data, error } = await supabase
        .from('shared_items')
        .select('item_type, is_shared')
        .eq('couple_id', coupleId)

      if (error) throw error

      const stats = {
        total: data?.length || 0,
        shared: data?.filter(item => item.is_shared).length || 0,
        byType: {}
      }

      // Group by type
      data?.forEach(item => {
        if (!stats.byType[item.item_type]) {
          stats.byType[item.item_type] = { total: 0, shared: 0 }
        }
        stats.byType[item.item_type].total++
        if (item.is_shared) {
          stats.byType[item.item_type].shared++
        }
      })

      return stats
    } catch (error) {
      console.error('❌ Error fetching sharing stats:', error)
      return { total: 0, shared: 0, byType: {} }
    }
  },

  /**
   * Clear couple cache
   */
  async clearCache() {
    await StorageManager.removeItem(COUPLE_CACHE_KEY)
  }
}

export default CoupleService
