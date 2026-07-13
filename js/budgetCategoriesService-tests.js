import assert from 'node:assert/strict'
import { DEFAULT_BUDGET_CATEGORIES } from './budgetCategoriesService.js'

const validTypes = new Set(['income', 'fixed_expense', 'variable_expense'])
const ids = new Set()

for (const category of DEFAULT_BUDGET_CATEGORIES) {
  assert.match(category.id, /^[a-z0-9][a-z0-9_-]*$/, `invalid category id: ${category.id}`)
  assert.ok(category.id.length <= 128, `category id is too long: ${category.id}`)
  assert.equal(category.name, category.name.trim(), `category name is not trimmed: ${category.id}`)
  assert.ok(category.name.length >= 1 && category.name.length <= 120, `invalid category name length: ${category.id}`)
  assert.ok(validTypes.has(category.type), `invalid category type: ${category.id}`)
  assert.ok(Number.isInteger(category.position) && category.position >= 0, `invalid category position: ${category.id}`)
  assert.equal(ids.has(category.id), false, `duplicate category id: ${category.id}`)
  ids.add(category.id)
}

console.info(`budgetCategoriesService-tests: ${DEFAULT_BUDGET_CATEGORIES.length} default categories — OK`)
