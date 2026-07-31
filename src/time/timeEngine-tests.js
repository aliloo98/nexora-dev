import assert from 'node:assert/strict'
import { getTimeContext } from './timeEngine.js'

console.log('\n🧪 Running Time Engine Tests')

// Date de référence : 15 Août 2026
const refDate = new Date(2026, 7, 15) // Août (month = 7, 0-indexed)

// 1. Mois passé (Mai 2026 vs Août 2026)
const pastCtx = getTimeContext('2026-05', refDate)
assert.equal(pastCtx.status, 'PAST', 'Mai 2026 doit être identifié comme PAST')
assert.equal(pastCtx.isPast, true)
assert.equal(pastCtx.daysRemaining, 0, 'Les jours restants pour un mois passé doivent être 0')
assert.equal(pastCtx.daysElapsed, 31, 'Tous les jours du mois passé sont écoulés')
assert.equal(pastCtx.progressPercent, 100)
console.log('✓ [PAST] Mois passé correctement identifié (daysRemaining = 0)')

// 2. Mois courant (Août 2026 vs Août 2026)
const currentCtx = getTimeContext('2026-08', refDate)
assert.equal(currentCtx.status, 'CURRENT', 'Août 2026 doit être identifié comme CURRENT')
assert.equal(currentCtx.isCurrent, true)
assert.equal(currentCtx.currentDay, 15)
assert.equal(currentCtx.daysInMonth, 31)
assert.equal(currentCtx.daysRemaining, 17, 'Au 15 août, jours restants = 31 - 15 + 1 = 17')
assert.equal(currentCtx.daysElapsed, 15)
console.log('✓ [CURRENT] Mois courant correctement calculé au jour 15')

// 3. Mois futur (Septembre 2026 vs Août 2026)
const futureCtx = getTimeContext('2026-09', refDate)
assert.equal(futureCtx.status, 'FUTURE', 'Septembre 2026 doit être identifié comme FUTURE')
assert.equal(futureCtx.isFuture, true)
assert.equal(futureCtx.daysElapsed, 0, 'Les jours écoulés pour un mois futur doivent être 0')
assert.equal(futureCtx.daysRemaining, 30, 'Les jours restants pour septembre sont 30')
assert.equal(futureCtx.progressPercent, 0)
console.log('✓ [FUTURE] Mois futur correctement identifié (daysElapsed = 0)')

console.log('📊 Time Engine Tests: 3 passed, 0 failed\n')
