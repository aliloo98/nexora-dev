#!/usr/bin/env node
import assert from 'node:assert/strict'
import { STORAGE_KEYS } from '../../constants/storageKeys.js'
import { createCoachContextService } from '../services/coachContextService.js'

const writes = []
const settingsByKey = {
  [STORAGE_KEYS.budgetCycleSettings]: { mode: 'calendar' },
  [STORAGE_KEYS.monthlyHistorySnapshots]: {
    version: 1,
    snapshots: {
      '2026-06': {
        month: '2026-06',
        metrics: { income: 2800, expenses: 1900, savings: 900 }
      }
    }
  }
}

const service = createCoachContextService({
  monthlyBudgetStateService: {
    getMonthlyBudgetState: async () => ({
      data: {
        salary: 3000,
        rent: 1000,
        rent_paye: 1000,
        custom_restaurant: 200,
        custom_restaurant_paye: 50
      }
    }),
    saveMonthlyBudgetState: async () => writes.push('monthly')
  },
  budgetCategoriesService: {
    getBudgetCategories: async () => [
      { id: 'salary', name: 'Salaire', type: 'income', is_default: true, is_active: true },
      { id: 'rent', name: 'Loyer', type: 'fixed_expense', is_default: true, is_active: true },
      { id: 'custom_restaurant', name: 'Restaurants', type: 'variable_expense', is_default: false, is_active: true }
    ],
    createBudgetCategory: async () => writes.push('category')
  },
  goalsService: {
    listUserFacingGoals: async () => [{
      id: 'goal',
      name: 'Maison',
      target: 10000,
      current: 2000,
      targetDate: '2027-01-01',
      isPrimary: true
    }],
    saveGoals: async () => writes.push('goals')
  },
  settingsService: {
    loadRecurringIncomes: async () => [],
    loadBillSchedules: async () => [{
      id: 'bill',
      name: 'Loyer',
      amount: 1000,
      day: 20,
      linkedCharge: 'rent'
    }],
    saveBillSchedules: async () => writes.push('bills')
  },
  userAppSettingsService: {
    getSetting: async key => ({ value: settingsByKey[key] ?? null }),
    saveSetting: async () => writes.push('setting')
  }
})

const context = await service.buildContext({
  monthKey: '2026-07',
  asOf: '2026-07-15T09:00:00.000Z'
})

assert.equal(context.monthly.income, 3000)
assert.equal(context.monthly.plannedExpenses, 1200)
assert.equal(context.monthly.paidExpenses, 1050)
assert.equal(context.categories.find(category => category.id === 'custom_restaurant')?.isCustom, true)
assert.equal(context.upcomingCharges[0].dueDate, '2026-07-20')
assert.equal(context.dataQuality.historyDepth, 1)
assert.equal(context.dataQuality.isReliable, true)
assert.equal(Object.isFrozen(context), true)
assert.equal(Object.isFrozen(context.categories), true)
assert.deepEqual(writes, [], 'CoachContextService must never call a write method')

assert.throws(() => {
  context.monthly.income = 0
}, TypeError)

const insufficientHistoryService = createCoachContextService({
  monthlyBudgetStateService: {
    getMonthlyBudgetState: async () => ({ data: { salary: 0, rent: 0 } })
  },
  budgetCategoriesService: {
    getBudgetCategories: async () => [
      { id: 'salary', name: 'Salaire', type: 'income', is_default: true, is_active: true },
      { id: 'rent', name: 'Loyer', type: 'fixed_expense', is_default: true, is_active: true }
    ]
  },
  goalsService: { listUserFacingGoals: async () => [] },
  settingsService: {
    loadRecurringIncomes: async () => [],
    loadBillSchedules: async () => []
  },
  userAppSettingsService: { getSetting: async () => ({ value: null }) }
})

const noHistory = await insufficientHistoryService.buildContext({
  monthKey: '2026-07',
  asOf: '2026-07-15'
})
assert.equal(noHistory.dataQuality.historyDepth, 0)
assert.equal(noHistory.dataQuality.isReliable, true, 'explicit zero values remain reliable')

await assert.rejects(
  () => service.buildContext({ monthKey: 'bad', asOf: '2026-07-15' }),
  /monthKey/
)
await assert.rejects(
  () => service.buildContext({ monthKey: '2026-07' }),
  /asOf/
)

console.log('coachContextService-tests: OK')
