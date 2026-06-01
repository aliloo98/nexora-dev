#!/usr/bin/env node
import assert from 'assert'

const CoupleNotificationServiceMock = {
  async notifyGoalContribution(coupleId, userId, goalName, amount) {
    if (!coupleId || !userId || !goalName || !amount) {
      return { notification: null, error: new Error('Required fields') }
    }
    return { notification: { id: 'notif-1', type: 'goal_contribution' }, error: null }
  },

  async notifyGoalCompleted(coupleId, goalName) {
    if (!coupleId || !goalName) {
      return { notification: null, error: new Error('Required fields') }
    }
    return { notification: { id: 'notif-2', type: 'goal_completed' }, error: null }
  },

  async notifyDebtPayment(coupleId, debtName, amount) {
    if (!coupleId || !debtName || !amount) {
      return { notification: null, error: new Error('Required fields') }
    }
    return { notification: { id: 'notif-3', type: 'debt_payment' }, error: null }
  },

  async notifyBudgetDeficit(coupleId, deficit) {
    if (!coupleId || !deficit) {
      return { notification: null, error: new Error('Required fields') }
    }
    return { notification: { id: 'notif-4', type: 'budget_deficit' }, error: null }
  },

  async getNotifications(coupleId, limit = 20) {
    return []
  },

  async markAsRead(notificationId) {
    return { success: true, error: null }
  },

  async getUnreadCount(coupleId) {
    return 3
  }
}

const tests = [
  {
    name: '[Notification] Goal contribution requires fields',
    fn: async () => {
      const result = await CoupleNotificationServiceMock.notifyGoalContribution('couple-1', null, 'House', 500)
      assert(result.error !== null)
    }
  },
  {
    name: '[Notification] Goal contribution notification',
    fn: async () => {
      const result = await CoupleNotificationServiceMock.notifyGoalContribution('couple-1', 'user-1', 'House', 500)
      assert(result.error === null)
      assert(result.notification !== null)
    }
  },
  {
    name: '[Notification] Goal completed notification',
    fn: async () => {
      const result = await CoupleNotificationServiceMock.notifyGoalCompleted('couple-1', 'House')
      assert(result.error === null)
      assert(result.notification.type === 'goal_completed')
    }
  },
  {
    name: '[Notification] Debt payment notification',
    fn: async () => {
      const result = await CoupleNotificationServiceMock.notifyDebtPayment('couple-1', 'Car Loan', 500)
      assert(result.error === null)
      assert(result.notification.type === 'debt_payment')
    }
  },
  {
    name: '[Notification] Budget deficit alert',
    fn: async () => {
      const result = await CoupleNotificationServiceMock.notifyBudgetDeficit('couple-1', -200)
      assert(result.error === null)
      assert(result.notification.type === 'budget_deficit')
    }
  },
  {
    name: '[Notification] Get notifications',
    fn: async () => {
      const result = await CoupleNotificationServiceMock.getNotifications('couple-1')
      assert(Array.isArray(result))
    }
  },
  {
    name: '[Notification] Mark as read',
    fn: async () => {
      const result = await CoupleNotificationServiceMock.markAsRead('notif-1')
      assert(result.success === true)
    }
  },
  {
    name: '[Notification] Get unread count',
    fn: async () => {
      const result = await CoupleNotificationServiceMock.getUnreadCount('couple-1')
      assert(typeof result === 'number')
      assert(result >= 0)
    }
  }
]

async function runTests() {
  console.log('\n🧪 Running Couple Notification Tests (Phase 8)\n')
  let passed = 0, failed = 0
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
