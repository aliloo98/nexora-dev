#!/usr/bin/env node
import assert from 'node:assert/strict'
import { resolveBudgetWithRecurring } from './recurringResolution.js'

const categoriesById = new Map([
  ['rev_ali', { id: 'rev_ali', name: 'Revenu principal — Utilisateur' }],
  ['rev_megane', { id: 'rev_megane', name: 'Revenu principal — Mon foyer' }]
])

const result = resolveBudgetWithRecurring({
  budgetData: {},
  incomeKeys: ['rev_ali', 'rev_megane'],
  expenseKeys: [],
  categoriesById,
  recurringIncomes: [
    { id: 'income-1', name: 'Salaire Ali', amount: 2110 },
    { id: 'income-2', name: 'Salaire Mégane', amount: 1300 }
  ],
  billSchedules: []
})

assert.equal(result.resolved.rev_ali, 2110)
assert.equal(result.resolved.rev_megane, 1300)
console.log('recurringResolution-tests: OK')
