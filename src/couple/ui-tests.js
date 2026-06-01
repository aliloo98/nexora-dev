#!/usr/bin/env node
import assert from 'assert'
import { CoupleUIComponent } from './coupleUIComponent.js'
import * as CoupleInvitationModule from './coupleInvitationService.js'

const originalGetCoupleStatus = CoupleInvitationModule.CoupleInvitationService.getCoupleStatus

const stubCoupleStatus = (status) => {
  CoupleInvitationModule.CoupleInvitationService.getCoupleStatus = async () => {
    if (status === 'couple_actif') {
      return { status, details: { couple: { status: 'active' } } }
    }
    return { status, details: {} }
  }
}

const restoreCoupleStatus = () => {
  CoupleInvitationModule.CoupleInvitationService.getCoupleStatus = originalGetCoupleStatus
}

const tests = [
  {
    name: '[UI] Hide couple tab when user is not authenticated',
    fn: async () => {
      const result = await CoupleUIComponent.shouldShowCoupleTab(null)
      assert.strictEqual(result, false)
    }
  },
  {
    name: '[UI] Hide couple tab when no couple exists',
    fn: async () => {
      stubCoupleStatus('aucune_invitation')
      const result = await CoupleUIComponent.shouldShowCoupleTab({ id: 'user-1' })
      restoreCoupleStatus()
      assert.strictEqual(result, false)
    }
  },
  {
    name: '[UI] Hide couple tab when invitation is sent but not accepted',
    fn: async () => {
      stubCoupleStatus('invitation_envoyee')
      const result = await CoupleUIComponent.shouldShowCoupleTab({ id: 'user-2' })
      restoreCoupleStatus()
      assert.strictEqual(result, false)
    }
  },
  {
    name: '[UI] Hide couple tab when invitation is received but not accepted',
    fn: async () => {
      stubCoupleStatus('invitation_reçue')
      const result = await CoupleUIComponent.shouldShowCoupleTab({ id: 'user-3' })
      restoreCoupleStatus()
      assert.strictEqual(result, false)
    }
  },
  {
    name: '[UI] Hide couple tab when couple status load fails',
    fn: async () => {
      CoupleInvitationModule.CoupleInvitationService.getCoupleStatus = async () => {
        throw new Error('Service unavailable')
      }
      const result = await CoupleUIComponent.shouldShowCoupleTab({ id: 'user-4' })
      restoreCoupleStatus()
      assert.strictEqual(result, false)
    }
  },
  {
    name: '[UI] Show couple tab only when couple is active',
    fn: async () => {
      stubCoupleStatus('couple_actif')
      const result = await CoupleUIComponent.shouldShowCoupleTab({ id: 'user-5' })
      restoreCoupleStatus()
      assert.strictEqual(result, true)
    }
  }
]

async function runTests() {
  console.log('\n🧪 Running Couple UI Tests (Phase 9)\n')
  let passed = 0
  let failed = 0

  for (const test of tests) {
    try {
      await test.fn()
      console.log(`✓ ${test.name}`)
      passed++
    } catch (error) {
      console.log(`✗ ${test.name}: ${error.message}`)
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
