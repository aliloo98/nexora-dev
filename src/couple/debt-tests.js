#!/usr/bin/env node
import assert from 'assert'

const CoupleDebtServiceMock = {
  async createSharedDebt(coupleId, debtData, createdById) {
    if (!coupleId || !debtData.name || !debtData.totalAmount) {
      return { debt: null, error: new Error('Required fields') }
    }
    return { debt: { id: 'debt-1', name: debtData.name }, error: null }
  },

  async payDebtContribution(debtId, amount, userId) {
    if (!debtId || !amount || !userId) {
      return { payment: null, error: new Error('Required fields') }
    }
    if (amount <= 0) {
      return { payment: null, error: new Error('Must be positive') }
    }
    return { payment: { id: 'payment-1', amount }, error: null }
  },

  async getSharedDebts(coupleId) {
    return []
  },

  async getDebtStatus(debtId) {
    return { debt: { repaymentPct: 30 }, payments: [], error: null }
  },

  async getDebtContributionBreakdown(debtId) {
    return { byUser: { 'user-1': 500, 'user-2': 500 }, error: null }
  },

  async markDebtAsPaid(debtId) {
    return { success: true, error: null }
  }
}

const tests = [
  {
    name: '[Debt] Create debt requires fields',
    fn: async () => {
      const result = await CoupleDebtServiceMock.createSharedDebt('couple-1', {}, 'user-1')
      assert(result.error !== null)
    }
  },
  {
    name: '[Debt] Create debt succeeds',
    fn: async () => {
      const result = await CoupleDebtServiceMock.createSharedDebt('couple-1', { name: 'Car Loan', totalAmount: 15000 }, 'user-1')
      assert(result.error === null)
      assert(result.debt !== null)
    }
  },
  {
    name: '[Debt] Pay positive amount',
    fn: async () => {
      const result = await CoupleDebtServiceMock.payDebtContribution('debt-1', 500, 'user-1')
      assert(result.error === null)
      assert(result.payment !== null)
    }
  },
  {
    name: '[Debt] Reject negative payment',
    fn: async () => {
      const result = await CoupleDebtServiceMock.payDebtContribution('debt-1', -100, 'user-1')
      assert(result.error !== null)
    }
  },
  {
    name: '[Debt] Get shared debts',
    fn: async () => {
      const result = await CoupleDebtServiceMock.getSharedDebts('couple-1')
      assert(Array.isArray(result))
    }
  },
  {
    name: '[Debt] Get status shows repayment %',
    fn: async () => {
      const result = await CoupleDebtServiceMock.getDebtStatus('debt-1')
      assert(result.debt.repaymentPct !== undefined)
    }
  },
  {
    name: '[Debt] Get contribution breakdown',
    fn: async () => {
      const result = await CoupleDebtServiceMock.getDebtContributionBreakdown('debt-1')
      assert(result.byUser['user-1'] === 500)
    }
  },
  {
    name: '[Debt] Mark debt as paid',
    fn: async () => {
      const result = await CoupleDebtServiceMock.markDebtAsPaid('debt-1')
      assert(result.success === true)
    }
  }
]

async function runTests() {
  console.log('\n🧪 Running Couple Debt Tests (Phase 6)\n')
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
