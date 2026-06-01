/**
 * Nexora - Couple Invitation Service
 *
 * Manages the workflow of couple invitations:
 * - Sending invitations (by email or user ID)
 * - Accepting/rejecting invitations
 * - Creating couple relationships from accepted invitations
 *
 * States:
 * - aucune invitation (no record)
 * - invitation envoyée (pending)
 * - invitation reçue (pending for invitee)
 * - couple actif (accepted → couple created)
 */

import { supabase } from '../supabase.js'
import { crypto as nodeCrypto } from 'crypto'
import { v4 as uuidv4 } from 'uuid'

// Generate invitation code
const generateInvitationCode = () => {
  return uuidv4().replace(/-/g, '').substring(0, 16).toUpperCase()
}

export const CoupleInvitationService = {
  /**
   * Send an invitation to create a couple
   * @param {string} inviterId - User ID of inviter
   * @param {string} inviteeEmailOrUserId - Email or user ID of invitee
   * @param {number} expiryHours - Hours until invitation expires (default 7 days)
   * @returns {Promise<{invitation, invitationLink, error}>}
   */
  async sendInvitation(inviterId, inviteeEmailOrUserId, expiryHours = 24 * 7) {
    try {
      if (!inviterId || !inviteeEmailOrUserId) {
        throw new Error('Inviter ID and invitee email/ID are required')
      }

      // Don't allow inviting self
      if (inviterId === inviteeEmailOrUserId) {
        throw new Error('Cannot invite yourself to form a couple')
      }

      const invitationCode = generateInvitationCode()
      const expiresAt = new Date(Date.now() + expiryHours * 60 * 60 * 1000).toISOString()

      // Determine if it's an email or user ID
      const isEmail = inviteeEmailOrUserId.includes('@')
      const payload = {
        inviter_id: inviterId,
        status: 'pending',
        invitation_code: invitationCode,
        expires_at: expiresAt
      }

      if (isEmail) {
        payload.invitee_email = inviteeEmailOrUserId
      } else {
        payload.invitee_id = inviteeEmailOrUserId
      }

      const { data, error } = await supabase
        .from('couple_invitations')
        .insert(payload)
        .select()
        .single()

      if (error) throw error

      // Generate invitation link (would include invitation code)
      const invitationLink = `${window.location.origin}?invitation=${invitationCode}`

      console.log('✓ Invitation sent:', invitationCode)
      return { invitation: data, invitationLink, error: null }
    } catch (error) {
      console.error('❌ Error sending invitation:', error)
      return { invitation: null, invitationLink: null, error: error.message }
    }
  },

  /**
   * Get pending invitations for a user
   * @param {string} userId - User ID
   * @returns {Promise<Array>}
   */
  async getPendingInvitations(userId) {
    try {
      if (!userId) return []

      // Invitations sent by this user
      const { data: sent, error: sentError } = await supabase
        .from('couple_invitations')
        .select('*')
        .eq('inviter_id', userId)
        .eq('status', 'pending')

      // Invitations received by this user
      const { data: received, error: receivedError } = await supabase
        .from('couple_invitations')
        .select('*')
        .eq('invitee_id', userId)
        .eq('status', 'pending')

      if (sentError || receivedError) {
        throw sentError || receivedError
      }

      return {
        sent: sent || [],
        received: received || []
      }
    } catch (error) {
      console.error('❌ Error fetching pending invitations:', error)
      return { sent: [], received: [] }
    }
  },

  /**
   * Get invitation by code
   * @param {string} invitationCode - Invitation code
   * @returns {Promise<{invitation, error}>}
   */
  async getInvitationByCode(invitationCode) {
    try {
      if (!invitationCode) {
        throw new Error('Invitation code is required')
      }

      const { data, error } = await supabase
        .from('couple_invitations')
        .select('*')
        .eq('invitation_code', invitationCode)
        .single()

      if (error && error.code === 'PGRST116') {
        throw new Error('Invitation not found')
      }

      if (error) throw error

      // Check if expired
      const now = new Date()
      const expiresAt = new Date(data.expires_at)
      if (now > expiresAt) {
        throw new Error('Invitation has expired')
      }

      return { invitation: data, error: null }
    } catch (error) {
      console.error('❌ Error fetching invitation:', error)
      return { invitation: null, error: error.message }
    }
  },

  /**
   * Accept an invitation and create couple
   * @param {string} invitationCode - Invitation code
   * @param {string} accepterId - User ID of the person accepting
   * @returns {Promise<{couple, error}>}
   */
  async acceptInvitation(invitationCode, accepterId) {
    try {
      if (!invitationCode || !accepterId) {
        throw new Error('Invitation code and accepter ID are required')
      }

      // Get invitation
      const { invitation, error: invError } = await this.getInvitationByCode(invitationCode)
      if (invError) throw invError

      // Verify accepter matches invitee
      if (invitation.invitee_id && invitation.invitee_id !== accepterId) {
        throw new Error('You cannot accept an invitation not addressed to you')
      }

      // Verify accepter matches invitee email
      if (invitation.invitee_email) {
        // In real app, would verify email claim from auth token
        // For now, accept if invitee_id is set after acceptance
      }

      // Update invitation status
      const { error: updateError } = await supabase
        .from('couple_invitations')
        .update({ status: 'accepted' })
        .eq('id', invitation.id)

      if (updateError) throw updateError

      // Create couple (if not exists)
      const sortedIds = [invitation.inviter_id, accepterId].sort()

      const { data: coupleData, error: coupleError } = await supabase
        .from('couples')
        .insert({
          user_id_1: sortedIds[0],
          user_id_2: sortedIds[1],
          status: 'active'
        })
        .select()
        .single()

      // It's OK if couple already exists (just continue)
      if (coupleError && !coupleError.message.includes('unique')) {
        throw coupleError
      }

      console.log('✓ Invitation accepted, couple created')
      return { couple: coupleData, error: null }
    } catch (error) {
      console.error('❌ Error accepting invitation:', error)
      return { couple: null, error: error.message }
    }
  },

  /**
   * Reject an invitation
   * @param {string} invitationCode - Invitation code
   * @returns {Promise<{success, error}>}
   */
  async rejectInvitation(invitationCode) {
    try {
      if (!invitationCode) {
        throw new Error('Invitation code is required')
      }

      const { error } = await supabase
        .from('couple_invitations')
        .update({ status: 'rejected' })
        .eq('invitation_code', invitationCode)

      if (error) throw error

      console.log('✓ Invitation rejected')
      return { success: true, error: null }
    } catch (error) {
      console.error('❌ Error rejecting invitation:', error)
      return { success: false, error: error.message }
    }
  },

  /**
   * Cancel an invitation (inviter only)
   * @param {string} invitationId - Invitation ID
   * @param {string} inviterId - User ID of inviter (for validation)
   * @returns {Promise<{success, error}>}
   */
  async cancelInvitation(invitationId, inviterId) {
    try {
      if (!invitationId || !inviterId) {
        throw new Error('Invitation ID and inviter ID are required')
      }

      // Verify inviter owns this invitation
      const { data, error: getError } = await supabase
        .from('couple_invitations')
        .select('inviter_id')
        .eq('id', invitationId)
        .single()

      if (getError) throw getError

      if (data.inviter_id !== inviterId) {
        throw new Error('Only the inviter can cancel an invitation')
      }

      // Cancel the invitation
      const { error } = await supabase
        .from('couple_invitations')
        .update({ status: 'cancelled' })
        .eq('id', invitationId)

      if (error) throw error

      console.log('✓ Invitation cancelled')
      return { success: true, error: null }
    } catch (error) {
      console.error('❌ Error cancelling invitation:', error)
      return { success: false, error: error.message }
    }
  },

  /**
   * Get couple status for user (what invitations/couples exist)
   * @param {string} userId - User ID
   * @returns {Promise<{status, details}>}
   */
  async getCoupleStatus(userId) {
    try {
      if (!userId) return { status: 'aucune_invitation', details: {} }

      // Check for active couple
      const { data: coupleData } = await supabase
        .from('couples')
        .select('*')
        .or(`user_id_1.eq.${userId},user_id_2.eq.${userId}`)
        .eq('status', 'active')
        .single()

      if (coupleData) {
        return { status: 'couple_actif', details: { couple: coupleData } }
      }

      // Check for pending invitations
      const { data: sentData } = await supabase
        .from('couple_invitations')
        .select('*')
        .eq('inviter_id', userId)
        .eq('status', 'pending')

      if (sentData?.length > 0) {
        return { status: 'invitation_envoyee', details: { invitation: sentData[0] } }
      }

      const { data: receivedData } = await supabase
        .from('couple_invitations')
        .select('*')
        .eq('invitee_id', userId)
        .eq('status', 'pending')

      if (receivedData?.length > 0) {
        return { status: 'invitation_reçue', details: { invitation: receivedData[0] } }
      }

      return { status: 'aucune_invitation', details: {} }
    } catch (error) {
      console.error('❌ Error fetching couple status:', error)
      return { status: 'erreur', details: { error: error.message } }
    }
  }
}

export default CoupleInvitationService
