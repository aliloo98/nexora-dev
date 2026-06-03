import {
  mergeRecurringIncomeArrays,
  mergeRecurringIncomeItems,
  normalizeRecurringIncome
} from './recurringIncomeSync.js'

let passed = 0
let failed = 0

const assert = (condition, message) => {
  if (!condition) {
    failed += 1
    console.error(`✗ ${message}`)
    return
  }
  passed += 1
  console.log(`✓ ${message}`)
}

const parseAmount = (value) => {
  const num = Number(String(value ?? '').replace(/\s/g, '').replace(',', '.'))
  return Number.isFinite(num) ? num : null
}

assert(
  normalizeRecurringIncome({ label: 'Freelance', value: 1500, recurrence: 'mensuel', dayOfMonth: 15 }, { parseAmount }).name === 'Freelance',
  'alias label/value/recurrence/dayOfMonth normalisés'
)
assert(
  normalizeRecurringIncome({ label: 'Freelance', value: 1500, recurrence: 'mensuel', dayOfMonth: 15 }, { parseAmount }).amount === 1500,
  'montant alias value conservé'
)
assert(
  normalizeRecurringIncome({ label: 'Freelance', value: 1500, recurrence: 'mensuel', dayOfMonth: 15 }, { parseAmount }).frequency === 'monthly',
  'fréquence mensuel → monthly'
)
assert(
  normalizeRecurringIncome({ label: 'Freelance', value: 1500, recurrence: 'mensuel', dayOfMonth: 15 }, { parseAmount }).day === 15,
  'jour dayOfMonth conservé'
)

const newerPartial = mergeRecurringIncomeArrays(
  [{ id: 'inc_1', name: '', amount: '', frequency: '', day: '', updated_at: '2026-06-03T12:00:00.000Z' }],
  [{ id: 'inc_1', name: 'Salaire', amount: 3200, frequency: 'monthly', day: 5, updated_at: '2026-06-03T11:00:00.000Z' }],
  { parseAmount }
)

assert(newerPartial.value.length === 1, 'une seule entrée après merge id')
assert(newerPartial.value[0].name === 'Salaire', 'nom complet conservé malgré local plus récent vide')
assert(newerPartial.value[0].amount === 3200, 'montant complet conservé')
assert(newerPartial.value[0].frequency === 'monthly', 'fréquence complète conservée')
assert(newerPartial.value[0].day === 5, 'jour complet conservé')

const nameLink = mergeRecurringIncomeArrays(
  [{ name: 'Salaire', amount: 0, updated_at: '2026-06-03T12:00:00.000Z' }],
  [{ id: 'inc_mac', name: 'Salaire', amount: 2800, frequency: 'monthly', day: 1, updated_at: '2026-06-03T10:00:00.000Z' }],
  { parseAmount }
)

assert(nameLink.value.length === 1, 'liaison nom ↔ id fusionne en une entrée')
assert(nameLink.value[0].id === 'inc_mac', 'id cloud conservé')
assert(nameLink.value[0].amount === 2800, 'montant cloud conservé sur doublon nom')

const reverseOrder = mergeRecurringIncomeArrays(
  [{ id: 'inc_mac', name: 'Salaire', amount: 2800, frequency: 'monthly', day: 1, updated_at: '2026-06-03T10:00:00.000Z' }],
  [{ name: 'Salaire', amount: 0, updated_at: '2026-06-03T12:00:00.000Z' }],
  { parseAmount }
)

assert(reverseOrder.value.length === 1, 'ordre cloud/local inverse — une entrée')
assert(reverseOrder.value[0].amount === 2800, 'ordre inverse — montant non écrasé')

const mergedItem = mergeRecurringIncomeItems([
  { id: 'x', title: 'Prime', value: 400, payDay: 20, updated_at: '2026-06-02T10:00:00.000Z' },
  { id: 'x', name: 'Prime annuelle', amount: 500, frequency: 'monthly', day: 20, updated_at: '2026-06-01T10:00:00.000Z' }
], { parseAmount })

assert(mergedItem.name === 'Prime', 'merge champ à champ — nom le plus récent non vide')
assert(mergedItem.amount === 400, 'merge champ à champ — montant le plus récent non vide')
assert(mergedItem.day === 20, 'merge champ à champ — jour conservé')

console.log(`\nrecurringIncome-sync-tests: ${passed} passed, ${failed} failed`)
if (failed > 0) process.exit(1)
