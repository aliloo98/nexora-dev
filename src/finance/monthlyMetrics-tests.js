#!/usr/bin/env node
import assert from 'node:assert/strict'
import { computeMonthlyMetrics } from './monthlyMetrics.js'

const categories = [
  { id: 'salary', name: 'Salaire', type: 'income', is_default: true, is_active: true },
  { id: 'rent', name: 'Loyer', type: 'fixed_expense', is_default: true, is_active: true },
  { id: 'custom_restaurant', name: 'Restaurants', type: 'variable_expense', is_default: false, is_active: true }
]

const metrics = computeMonthlyMetrics({
  monthKey: '2026-07',
  budgetData: {
    salary: '3 000,50',
    rent: 1000,
    rent_paye: true,
    custom_restaurant: 250,
    custom_restaurant_paye: '125'
  },
  categories
})

assert.equal(metrics.income, 3000.5)
assert.equal(metrics.fixedExpenses, 1000)
assert.equal(metrics.variableExpenses, 250)
assert.equal(metrics.plannedExpenses, 1250)
assert.equal(metrics.paidExpenses, 1125)
assert.equal(metrics.currentBalance, 1875.5)
assert.equal(metrics.projectedBalance, 1750.5)
assert.equal(metrics.remainingExpenses, 125)
assert.equal(metrics.categories.find(item => item.id === 'custom_restaurant')?.isCustom, true)
assert.deepEqual(metrics.presence, { income: true, expenses: true })

const validZeroExpenses = computeMonthlyMetrics({
  budgetData: { salary: 2000, rent: 0, custom_restaurant: 0 },
  categories
})
assert.equal(validZeroExpenses.plannedExpenses, 0)
assert.equal(validZeroExpenses.presence.expenses, true, 'explicit zero expenses are valid data')

const recurring = computeMonthlyMetrics({
  budgetData: {},
  categories,
  recurringIncomes: [{ id: 'income-1', linkedCharge: 'salary', amount: 2800 }],
  billSchedules: [{ id: 'bill-1', linkedCharge: 'rent', amount: 900 }]
})
assert.equal(recurring.income, 2800)
assert.equal(recurring.plannedExpenses, 900)
assert.deepEqual(recurring.presence, { income: true, expenses: true })

const legacyEquivalent = computeMonthlyMetrics({
  budgetData: {
    salary: 3000,
    rent: 1000,
    rent_paye: 750,
    custom_restaurant: 200,
    custom_restaurant_paye: false
  },
  categories
})
assert.deepEqual(
  {
    income: legacyEquivalent.income,
    expenses: legacyEquivalent.expenses,
    paidExpenses: legacyEquivalent.paidExpenses,
    savings: legacyEquivalent.savings,
    currentBalance: legacyEquivalent.currentBalance,
    remainingToSpend: legacyEquivalent.remainingToSpend
  },
  {
    income: 3000,
    expenses: 1200,
    paidExpenses: 750,
    savings: 1800,
    currentBalance: 2250,
    remainingToSpend: 450
  }
)

console.log('monthlyMetrics-tests: OK')
