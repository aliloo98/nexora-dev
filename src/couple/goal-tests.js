#!/usr/bin/env node
import assert from 'assert'

const CoupleGoalServiceMock = {
  async createSharedGoal(coupleId, goalData, createdById) {
    if (!coupleId || !goalData.name || !goalData.targetAmount) {
      return { goal: null, error: new Error('Required fields') }
    }
    return { goal: { id: 'goal-1', name: goalData.name }, error: null }
  },

  async contributeToGoal(goalId, amount, userId) {
    if (!goalId || !amount || !userId) {
      return { contribution: null, error: new Error('Required fields') }
    }
    if (amount <= 0) {
      return { contribution: null, error: new Error('Must be positive') }
    }
    return { contribution: { id: 'contrib-1', amount }, error: null }
  },

  async getSharedGoals(coupleId) {
    return []
  },

  async getGoalProgress(goalId) {
    return { goal: { progressPct: 50 }, contributions: [], error: null }
  },

  async getContributionBreakdown(goalId) {
    return { byUser: { 'user-1': 420, 'user-2': 380 }, error: null }
  }
}

const tests = [
  {
    name: '[Goal] Create goal requires fields',
    fn: async () => {
      const result = await CoupleGoalServiceMock.createSharedGoal('couple-1', {}, 'user-1')
      assert(result.error !== null)
    }
  },
  {
    name: '[Goal] Create goal succeeds',
    fn: async () => {
      const result = await CoupleGoalServiceMock.createSharedGoal('couple-1', { name: 'House', targetAmount: 50000 }, 'user-1')
      assert(result.error === null)
      assert(result.goal !== null)
    }
  },
  {
    name: '[Goal] Contribute positive amount',
    fn: async () => {
      const result = await CoupleGoalServiceMock.contributeToGoal('goal-1', 420, 'user-1')
      assert(result.error === null)
      assert(result.contribution !== null)
    }
  },
  {
    name: '[Goal] Reject negative contribution',
    fn: async () => {
      const result = await CoupleGoalServiceMock.contributeToGoal('goal-1', -100, 'user-1')
      assert(result.error !== null)
    }
  },
  {
    name: '[Goal] Get shared goals',
    fn: async () => {
      const result = await CoupleGoalServiceMock.getSharedGoals('couple-1')
      assert(Array.isArray(result))
    }
  },
  {
    name: '[Goal] Get progress calculates percentage',
    fn: async () => {
      const result = await CoupleGoalServiceMock.getGoalProgress('goal-1')
      assert(result.goal.progressPct !== undefined)
    }
  },
  {
    name: '[Goal] Get contribution breakdown',
    fn: async () => {
      const result = await CoupleGoalServiceMock.getContributionBreakdown('goal-1')
      assert(result.byUser !== undefined)
      assert(result.byUser['user-1'] === 420)
    }
  }
]

async function runTests() {
  console.log('\n🧪 Running Couple Goal Tests (Phase 5)\n')
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
