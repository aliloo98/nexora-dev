import assert from 'node:assert/strict'
import { calculateForecast } from './forecastEngine.js'

console.log('\n🧪 Running Forecast Engine Tests')

// 1. Prévision standard équilibrée
const metricsNormal = { revReel: 2500, fixReel: 1000, varReel: 500 }
const forecastNormal = calculateForecast(metricsNormal, { referenceDate: '2026-08-15' })
assert.equal(forecastNormal.overdraftRisk, 'NONE')
assert.ok(forecastNormal.lowestBalance >= 0)
assert.equal(forecastNormal.dailyTrajectory.length, 31)
console.log('✓ [Forecast] Trajectoire standard équilibrée (overdraftRisk = NONE)')

// 2. Détection de risque de découvert élevé
const metricsHighRisk = { revReel: 1200, fixReel: 1500, varReel: 300 }
const forecastRisk = calculateForecast(metricsHighRisk, { referenceDate: '2026-08-15' })
assert.equal(forecastRisk.overdraftRisk, 'HIGH')
assert.ok(forecastRisk.lowestBalance < 0)
console.log('✓ [Forecast] Risque de découvert élevé détecté (overdraftRisk = HIGH)')

// 3. Les échéances partielles ne doivent pas masquer les autres charges fixes
const metricsPartialBills = { revReel: 2000, fixReel: 1800, varReel: 800 }
const forecastPartialBills = calculateForecast(metricsPartialBills, {
  referenceDate: '2026-08-15',
  billSchedules: [{ amount: 95, dayOfMonth: 15, recurrence: 'monthly' }]
})
assert.equal(forecastPartialBills.finalBalance, -600)
assert.equal(forecastPartialBills.overdraftRisk, 'HIGH')
console.log('✓ [Forecast] Échéances partielles complétées par les charges fixes restantes')

console.log('📊 Forecast Engine Tests: 3 passed, 0 failed\n')
