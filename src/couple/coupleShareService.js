/**
 * Nexora - Couple Share Service
 *
 * Manages selective sharing of items between couple members.
 * Allows fine-grained control over what gets shared:
 *
 * Item types:
 * - transactions (revenues, expenses, variable costs)
 * - categories (expense/income categories)
 * - goals (objectives)
 * - debts (shared debts)
 * - accounts (bank accounts)
 *
 * Each item can be marked as:
 * 🔒 Privé (private - not shared)
 * ❤️ Partagé (shared - visible to partner)
 */

import { supabase } from '../supabase.js'
import { StorageManager } from '../../js/storage.js'

const SHARING_CACHE_KEY = 'nexora_sharing_cache'
const SHARING_CACHE_TTL = 5 * 60 * 1000 // 5 minutes

export const CoupleShareService = {
  /**
   * Share an item with partner
   * @param {string} coupleId - Couple ID
   * @param {string} itemId - ID of item to share
   * @param {string} itemType - Type: transaction, category, goal, debt, account
   * @param {string} userId - User doing the sharing (for audit)
   * @returns {Promise<{shared, error}>}
   */
  async shareItem(coupleId, itemId, itemType, userId) {
    try {
      this._validateItemType(itemType)

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

      // Clear cache
      await this._clearShareCache(coupleId)

      console.log(`✓ Item shared: ${itemId} (${itemType})`)
      return { shared: data, error: null }
    } catch (error) {
      console.error('❌ Error sharing item:', error)
      return { shared: null, error: error.message }
    }
  },

  /**
   * Unshare an item (make private)
   * @param {string} coupleId - Couple ID
   * @param {string} itemId - ID of item
   * @param {string} itemType - Type of item
   * @returns {Promise<{success, error}>}
   */
  async unshareItem(coupleId, itemId, itemType) {
    try {
      this._validateItemType(itemType)

      const { error } = await supabase
        .from('shared_items')
        .update({ is_shared: false })
        .eq('couple_id', coupleId)
        .eq('item_id', itemId)
        .eq('item_type', itemType)

      if (error) throw error

      // Clear cache
      await this._clearShareCache(coupleId)

      console.log(`✓ Item unshared: ${itemId}`)
      return { success: true, error: null }
    } catch (error) {
      console.error('❌ Error unsharing item:', error)
      return { success: false, error: error.message }
    }
  },

  /**
   * Check if item is shared
   * @param {string} coupleId - Couple ID
   * @param {string} itemId - Item ID
   * @param {string} itemType - Item type
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
        return false // Not found = not shared
      }

      if (error) throw error

      return data?.is_shared || false
    } catch (error) {
      console.error('❌ Error checking share status:', error)
      return false
    }
  },

  /**
   * Get all shared items of specific type
   * @param {string} coupleId - Couple ID
   * @param {string} itemType - Type to filter by
   * @returns {Promise<Array>}
   */
  async getSharedItemsByType(coupleId, itemType) {
    try {
      this._validateItemType(itemType)

      // Try cache first
      const cached = await this._getShareCache(coupleId)
      if (cached && cached[itemType]) {
        return cached[itemType].shared
      }

      const { data, error } = await supabase
        .from('shared_items')
        .select('item_id')
        .eq('couple_id', coupleId)
        .eq('item_type', itemType)
        .eq('is_shared', true)

      if (error) throw error

      return (data || []).map(item => item.item_id)
    } catch (error) {
      console.error(`❌ Error fetching shared ${itemType}s:`, error)
      return []
    }
  },

  /**
   * Get sharing summary for couple
   * @param {string} coupleId - Couple ID
   * @returns {Promise<Object>}
   */
  async getSharingSummary(coupleId) {
    try {
      const summary = {
        transactions: { total: 0, shared: 0 },
        categories: { total: 0, shared: 0 },
        goals: { total: 0, shared: 0 },
        debts: { total: 0, shared: 0 },
        accounts: { total: 0, shared: 0 }
      }

      const { data, error } = await supabase
        .from('shared_items')
        .select('item_type, is_shared')
        .eq('couple_id', coupleId)

      if (error) throw error

      if (data) {
        data.forEach(item => {
          const key = item.item_type
          if (summary[key]) {
            summary[key].total++
            if (item.is_shared) {
              summary[key].shared++
            }
          }
        })
      }

      return summary
    } catch (error) {
      console.error('❌ Error fetching sharing summary:', error)
      return {}
    }
  },

  /**
   * Toggle share status for an item
   * @param {string} coupleId - Couple ID
   * @param {string} itemId - Item ID
   * @param {string} itemType - Item type
   * @param {boolean} shouldShare - Should be shared?
   * @returns {Promise<{success, error}>}
   */
  async toggleShare(coupleId, itemId, itemType, shouldShare) {
    try {
      if (shouldShare) {
        const result = await this.shareItem(coupleId, itemId, itemType, null)
        return { success: result.error === null, error: result.error }
      } else {
        return this.unshareItem(coupleId, itemId, itemType)
      }
    } catch (error) {
      console.error('❌ Error toggling share:', error)
      return { success: false, error: error.message }
    }
  },

  /**
   * Batch share multiple items
   * @param {string} coupleId - Couple ID
   * @param {Array} items - Array of {itemId, itemType}
   * @param {string} userId - User doing sharing
   * @returns {Promise<{successful, failed}>}
   */
  async batchShareItems(coupleId, items, userId) {
    try {
      const successful = []
      const failed = []

      for (const item of items) {
        const result = await this.shareItem(coupleId, item.itemId, item.itemType, userId)
        if (result.error) {
          failed.push({ item, error: result.error })
        } else {
          successful.push(item)
        }
      }

      console.log(`✓ Batch share complete: ${successful.length} shared, ${failed.length} failed`)
      return { successful, failed, error: null }
    } catch (error) {
      console.error('❌ Error in batch share:', error)
      return { successful: [], failed: items, error: error.message }
    }
  },

  /**
   * Batch unshare multiple items
   * @param {string} coupleId - Couple ID
   * @param {Array} items - Array of {itemId, itemType}
   * @returns {Promise<{successful, failed}>}
   */
  async batchUnshareItems(coupleId, items) {
    try {
      const successful = []
      const failed = []

      for (const item of items) {
        const result = await this.unshareItem(coupleId, item.itemId, item.itemType)
        if (result.error) {
          failed.push({ item, error: result.error })
        } else {
          successful.push(item)
        }
      }

      console.log(`✓ Batch unshare complete: ${successful.length} unshared, ${failed.length} failed`)
      return { successful, failed, error: null }
    } catch (error) {
      console.error('❌ Error in batch unshare:', error)
      return { successful: [], failed: items, error: error.message }
    }
  },

  /**
   * Get sharing journal (audit log of who shared what)
   * @param {string} coupleId - Couple ID
   * @param {number} limit - Limit results (default 50)
   * @returns {Promise<Array>}
   */
  async getSharingJournal(coupleId, limit = 50) {
    try {
      const { data, error } = await supabase
        .from('shared_items')
        .select('*')
        .eq('couple_id', coupleId)
        .order('created_at', { ascending: false })
        .limit(limit)

      if (error) throw error

      return data || []
    } catch (error) {
      console.error('❌ Error fetching sharing journal:', error)
      return []
    }
  },

  // ========== INTERNAL HELPERS ==========

  _validateItemType(itemType) {
    const validTypes = ['transaction', 'category', 'goal', 'debt', 'account']
    if (!validTypes.includes(itemType)) {
      throw new Error(`Invalid item type: ${itemType}. Must be one of: ${validTypes.join(', ')}`)
    }
  },

  async _getShareCache(coupleId) {
    try {
      const cacheKey = `${SHARING_CACHE_KEY}_${coupleId}`
      const cached = await StorageManager.getItem(cacheKey)
      
      if (cached && cached.expiry > Date.now()) {
        return cached.data
      }
      return null
    } catch (error) {
      return null
    }
  },

  async _clearShareCache(coupleId) {
    try {
      const cacheKey = `${SHARING_CACHE_KEY}_${coupleId}`
      await StorageManager.removeItem(cacheKey)
    } catch (error) {
      console.warn('Cache clear warning:', error)
    }
  }
}

export default CoupleShareService
