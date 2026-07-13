import assert from 'node:assert/strict'
import { BudgetCategoriesService, DEFAULT_BUDGET_CATEGORIES } from './budgetCategoriesService.js'

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

const storageValues = new Map()
globalThis.localStorage = {
  getItem: (key) => storageValues.get(key) ?? null,
  setItem: (key, value) => storageValues.set(key, String(value)),
  removeItem: (key) => storageValues.delete(key)
}

const category = (id, userId, name) => ({
  id,
  user_id: userId,
  name,
  type: 'variable_expense',
  position: 500,
  is_default: false,
  is_active: true,
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z'
})

storageValues.set('nexora_budget_categories_v1', JSON.stringify({
  local: [category('local-category', 'local', 'Catégorie anonyme')],
  'user-a': [
    category('category-a', 'user-a', 'Catégorie A'),
    category('category-a-wrong-owner', 'user-b', 'Catégorie A mal attribuée')
  ],
  'user-b': [category('category-b', 'user-b', 'Catégorie B')]
}))

const userACategories = await BudgetCategoriesService.getBudgetCategories({ includeInactive: true, userId: 'user-a' })
assert.ok(userACategories.some(item => item.id === 'category-a'), 'user A should read their own custom category')
assert.equal(userACategories.some(item => item.id === 'category-b'), false, 'user A must not read user B categories')
assert.equal(userACategories.some(item => item.id === 'local-category'), false, 'user A must not inherit anonymous categories')
assert.ok(userACategories.every(item => item.user_id === 'user-a'), 'all categories returned to user A must belong to user A')
assert.equal(
  userACategories.find(item => item.id === 'category-a-wrong-owner')?.user_id,
  'user-a',
  'the owner namespace must take precedence over stale embedded metadata'
)

const userBCategories = await BudgetCategoriesService.getBudgetCategories({ includeInactive: true, userId: 'user-b' })
assert.ok(userBCategories.some(item => item.id === 'category-b'), 'user B should read their own custom category')
assert.equal(userBCategories.some(item => item.id === 'category-a'), false, 'user B must not read user A categories')
assert.equal(userBCategories.some(item => item.id === 'local-category'), false, 'user B must not inherit anonymous categories')

const storeAfterAuthenticatedReads = JSON.parse(storageValues.get('nexora_budget_categories_v1'))
assert.deepEqual(
  storeAfterAuthenticatedReads.local,
  [category('local-category', 'local', 'Catégorie anonyme')],
  'authenticated reads must preserve anonymous categories without migrating or deleting them'
)

const anonymousCategories = await BudgetCategoriesService.getBudgetCategories({ includeInactive: true, userId: 'local' })
assert.ok(anonymousCategories.some(item => item.id === 'local-category'), 'anonymous mode should keep access to anonymous categories')
assert.equal(anonymousCategories.some(item => item.id === 'category-a'), false, 'anonymous mode must not read user A categories')
assert.equal(anonymousCategories.some(item => item.id === 'category-b'), false, 'anonymous mode must not read user B categories')

console.info(`budgetCategoriesService-tests: ${DEFAULT_BUDGET_CATEGORIES.length} defaults and owner isolation — OK`)
