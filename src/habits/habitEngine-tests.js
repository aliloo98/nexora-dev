import assert from 'node:assert/strict'
import { detectHabits } from './habitEngine.js'

console.log('\n🧪 Running Habit Engine Tests')

// 1. Détection des dépenses concentrées le week-end
const tx = [
  { amount: 120, date: '2026-08-01', category: 'Restaurants' }, // Samedi
  { amount: 80, date: '2026-08-02', category: 'Loisirs' },     // Dimanche
  { amount: 40, date: '2026-08-05', category: 'Courses' }      // Mercredi
]
const habitsTx = detectHabits(tx, [])
const weekendHabit = habitsTx.find(h => h.type === 'WEEKEND_SPENDING')
assert.ok(weekendHabit)
assert.equal(weekendHabit.confidence, 88)
console.log('✓ [Habits] Concentré de dépenses week-end détecté')

// 2. Détection de hausse de catégorie sur l'historique
const history = [
  { categories: { Restaurants: 200, Essence: 150 }, revReel: 2500, fixReel: 1000, varReel: 500 },
  { categories: { Restaurants: 280, Essence: 120 }, revReel: 2500, fixReel: 1000, varReel: 500 }
]
const habitsHist = detectHabits([], history)
const restaurantHabit = habitsHist.find(h => h.type === 'CATEGORY_RISING' && h.category === 'Restaurants')
assert.ok(restaurantHabit)
assert.ok(restaurantHabit.description.includes('augmentent de 40%'))
console.log('✓ [Habits] Hausse de 40% de la catégorie Restaurants détectée')

console.log('📊 Habit Engine Tests: 2 passed, 0 failed\n')
