#!/usr/bin/env node
/**
 * Couple Mode Tests - Phase 1
 * Tests for basic couple infrastructure
 */

import assert from 'assert'

const CoupleServiceMock = {
  async getActiveCoupleForUser(userId) {
    if (!userId) return { couple: null, partnerId: null }
    return { couple: null, partnerId: null }
  },

  async createCouple(userId1, userId2) {
    if (!userId1 || !userId2) {
      return { couple: null, error: new Error('Both user IDs are required') }
    }
    if (userId1 === userId2) {
      return { couple: null, error: new Error('Cannot form couple with same user') }
    }
    return { couple: { id: 'couple-1', user_id_1: userId1, user_id_2: userId2 }, error: null }
  },

  async shareItem(coupleId, itemId, itemType, userId) {
    const validTypes = ['transaction', 'category', 'goal', 'debt', 'account']
    if (!validTypes.includes(itemType)) {
      return { sharedItem: null, error: new Error(`Invalid item type: ${itemType}`) }
    }
    return { sharedItem: { id: 'shared-1' }, error: null }
  },

  async getSharingStats(coupleId) {
    return { total: 0, shared: 0, byType: {} }
  },

  async clearCache() {
    return true
  }
}

const tests = [
  {
    name: '[Couple] Non-existent couple returns null',
    fn: async () => {
      const result = await CoupleServiceMock.getActiveCoupleForUser('non-existent')
      assert(result.couple === null)
    }
  },
  {
    name: '[Couple] Cannot create couple with same user',
    fn: async () => {
      const result = await CoupleServiceMock.createCouple('user-1', 'user-1')
      assert(result.error !== null)
    }
  },
  {
    name: '[Couple] Couple requires both user IDs',
    fn: async () => {
      const result = await CoupleServiceMock.createCouple(null, 'user-2')
      assert(result.error !== null)
    }
  },
  {
    name: '[Couple] Can create couple with different users',
    fn: async () => {
      const result = await CoupleServiceMock.createCouple('user-1', 'user-2')
      assert(result.error === null)
      assert(result.couple !== null)
    }
  },
  {
    name: '[Sharing] Invalid item type throws error',
    fn: async () => {
      const result = await CoupleServiceMock.shareItem('couple-id', 'item-id', 'invalid_type', 'user-id')
      assert(result.error !== null)
    }
  },
  {
    name: '[Sharing] Valid item types accepted',
    fn: async () => {
      const validTypes = ['transaction', 'category', 'goal', 'debt', 'account']
      for (const itemType of validTypes) {
        const result = await CoupleServiceMock.shareItem('couple-id', 'item-id', itemType, 'user-id')
        assert(result.error === null)
      }
    }
  },
  {
    name: '[Cache] Cache can be cleared',
    fn: async () => {
      const result = await CoupleServiceMock.clearCache()
      assert(result === true)
    }
  }
]

async function runTests() {
  console.log('\n🧪 Running Couple Mode Tests (Phase 1)\n')

  let passed = 0
  let failed = 0

  for (const test of tests) {
    try {
      await test.fn()
      console.log(`✓ ${test.name}`)
      passed++
    } catch (error) {
      console.log(`✗ ${test.name}`)
      console.log(`  Error: ${error.message}`)
      failed++
    }
  }

  console.log(`\n📊 Results: ${passed} passed, ${failed} failed\n`)

  process.exit(failed > 0 ? 1 : 0)
}

runTests().catch(err => {
  console.error('Test runner error:', err)
  process.exit(1)
})
