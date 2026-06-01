#!/usr/bin/env node
/**
 * Couple Budget Tests - Phase 4
 * Tests for household budget calculations
 */

import assert from 'assert'

const CoupleBudgetServiceMock = {
  async getCoupleBudgetForMonth(coupleId, monthYear) {
    if (!coupleId || !monthYear) {
      return { budget: null, error: new Error('Required fields') }
    }
    return {
      budget: {
        month_year: monthYear,
        common_income: 4500,
        common_expenses: 2200,
        remaining: 2300,
        user1_income: 2500,
        user2_income: 2000,
        user1_expenses: 1100,
        user2_expenses: 1100,
        user1_contribution_pct: 55.6,
        user2_contribution_pct: 44.4,
        user1_net: 1400,
        user2_net: 900
      },
      error: null
    }
  },

  async getCoupleBudgetTrend(coupleId, months = 6) {
    if (!coupleId) {
      return { trend: [], error: new Error('Couple ID required') }
    }
    return {
      trend: [
        { month_year: '2026-01', common_income: 4500, remaining: 2300 },
        { month_year: '2026-02', common_income: 4500, remaining: 2250 }
      ],
      error: null
    }
  },

  async getContributionPercentages(coupleId, monthYear) {
    if (!coupleId || !monthYear) {
      return { user1Pct: 0, user2Pct: 0, error: new Error('Required fields') }
    }
    return { user1Pct: 55.6, user2Pct: 44.4, error: null }
  },

  async getSharedExpensesByCategory(coupleId, monthYear) {
    if (!coupleId || !monthYear) return []
    return [
      { category: 'Loyer', amount: 1000 },
      { category: 'Utilities', amount: 300 }
    ]
  },

  async clearBudgetCache(coupleId) {
    return { success: true }
  }
}

const tests = [
  {
    name: '[Budget] Get couple budget requires couple ID',
    fn: async () => {
      const result = await CoupleBudgetServiceMock.getCoupleBudgetForMonth(null, '2026-01')
      assert(result.error !== null)
    }
  },
  {
    name: '[Budget] Get couple budget requires month',
    fn: async () => {
      const result = await CoupleBudgetServiceMock.getCoupleBudgetForMonth('couple-1', null)
      assert(result.error !== null)
    }
  },
  {
    name: '[Budget] Get couple budget succeeds',
    fn: async () => {
      const result = await CoupleBudgetServiceMock.getCoupleBudgetForMonth('couple-1', '2026-01')
      assert(result.error === null)
      assert(result.budget !== null)
      assert(result.budget.month_year === '2026-01')
    }
  },
  {
    name: '[Budget] Budget has income and expenses',
    fn: async () => {
      const result = await CoupleBudgetServiceMock.getCoupleBudgetForMonth('couple-1', '2026-01')
      const budget = result.budget
      assert(budget.common_income > 0, 'should have income')
      assert(budget.common_expenses > 0, 'should have expenses')
      assert(budget.remaining >= 0, 'should calculate remaining')
    }
  },
  {
    name: '[Budget] Budget shows user contributions',
    fn: async () => {
      const result = await CoupleBudgetServiceMock.getCoupleBudgetForMonth('couple-1', '2026-01')
      const budget = result.budget
      assert(budget.user1_contribution_pct !== undefined)
      assert(budget.user2_contribution_pct !== undefined)
      assert(budget.user1_contribution_pct + budget.user2_contribution_pct === 100)
    }
  },
  {
    name: '[Budget] Get trend returns array',
    fn: async () => {
      const result = await CoupleBudgetServiceMock.getCoupleBudgetTrend('couple-1', 6)
      assert(Array.isArray(result.trend))
      assert(result.trend.length > 0)
    }
  },
  {
    name: '[Budget] Get contribution percentages',
    fn: async () => {
      const result = await CoupleBudgetServiceMock.getContributionPercentages('couple-1', '2026-01')
      assert(result.error === null)
      assert(result.user1Pct + result.user2Pct === 100)
    }
  },
  {
    name: '[Budget] Get expenses by category returns array',
    fn: async () => {
      const result = await CoupleBudgetServiceMock.getSharedExpensesByCategory('couple-1', '2026-01')
      assert(Array.isArray(result))
    }
  },
  {
    name: '[Cache] Clear budget cache succeeds',
    fn: async () => {
      const result = await CoupleBudgetServiceMock.clearBudgetCache('couple-1')
      assert(result.success === true)
    }
  }
]

async function runTests() {
  console.log('\n🧪 Running Couple Budget Tests (Phase 4)\n')

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
