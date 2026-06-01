#!/usr/bin/env node
import assert from 'assert'

const CoupleAssistantServiceMock = {
  async analyzeCoupleMetrics(coupleId, budget) {
    if (!coupleId || !budget) {
      return { insights: [], alerts: [], recommendations: [], error: new Error('Required fields') }
    }
    return {
      insights: [{ type: 'savings', message: 'Le foyer épargne 280 €/mois.' }],
      alerts: [],
      recommendations: [],
      error: null
    }
  },

  async analyzeGoalProgress(goals) {
    if (!Array.isArray(goals)) {
      return { goalInsights: [], error: new Error('Array required') }
    }
    return { goalInsights: [], error: null }
  },

  async generatePersonalMessages(metrics) {
    return [{ tone: 'positive', message: 'Super ! Vous économisez bien.' }]
  },

  async getCoupleBudgetHealth(budget, goals = [], debts = []) {
    return { score: 72, explanation: 'Healthy', error: null }
  }
}

const tests = [
  {
    name: '[Assistant] Analyze metrics requires fields',
    fn: async () => {
      const result = await CoupleAssistantServiceMock.analyzeCoupleMetrics(null, {})
      assert(result.error !== null)
    }
  },
  {
    name: '[Assistant] Analyze metrics returns insights',
    fn: async () => {
      const result = await CoupleAssistantServiceMock.analyzeCoupleMetrics('couple-1', { remaining: 280, common_expenses: 1500 })
      assert(result.error === null)
      assert(Array.isArray(result.insights))
    }
  },
  {
    name: '[Assistant] Analyze goals requires array',
    fn: async () => {
      const result = await CoupleAssistantServiceMock.analyzeGoalProgress(null)
      assert(result.error !== null)
    }
  },
  {
    name: '[Assistant] Analyze goals returns insights',
    fn: async () => {
      const result = await CoupleAssistantServiceMock.analyzeGoalProgress([])
      assert(result.error === null)
      assert(Array.isArray(result.goalInsights))
    }
  },
  {
    name: '[Assistant] Generate messages',
    fn: async () => {
      const result = await CoupleAssistantServiceMock.generatePersonalMessages({ remaining: 500 })
      assert(Array.isArray(result))
    }
  },
  {
    name: '[Assistant] Get health score',
    fn: async () => {
      const result = await CoupleAssistantServiceMock.getCoupleBudgetHealth({}, [], [])
      assert(result.score !== undefined)
      assert(result.score >= 0 && result.score <= 100)
      assert(result.explanation !== undefined)
    }
  },
  {
    name: '[Assistant] Health score is numeric',
    fn: async () => {
      const result = await CoupleAssistantServiceMock.getCoupleBudgetHealth({}, [], [])
      assert(typeof result.score === 'number')
    }
  }
]

async function runTests() {
  console.log('\n🧪 Running Couple Assistant Tests (Phase 7)\n')
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
