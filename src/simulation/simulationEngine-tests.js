import assert from 'node:assert/strict'
import { runSimulation } from './simulationEngine.js'

console.log('\n🧪 Running Simulation Engine Tests')

const baseMetrics = { revReel: 2500, fixReel: 1100, varReel: 500 } // Solde actuel = 900 €

// 1. Simulation augmentation de salaire +200 €
const simSalary = runSimulation(baseMetrics, { salaryIncrease: 200 }, { daysRemaining: 15 })
assert.equal(simSalary.newSoldeFinMois, 1100)
assert.equal(simSalary.deltaSolde, 200)
assert.ok(simSalary.newFinancialScore > 50)
console.log('✓ [Simulation] Augmentation de salaire (+200 €) correctement calculée')

// 2. Simulation suppression abonnement (-30 € de charges)
const simSub = runSimulation(baseMetrics, { subscriptionRemoved: 30 }, { daysRemaining: 15 })
assert.equal(simSub.newFixReel, 1070)
assert.equal(simSub.newSoldeFinMois, 930)
console.log('✓ [Simulation] Suppression d\'abonnement (-30 €) correctement calculée')

console.log('📊 Simulation Engine Tests: 2 passed, 0 failed\n')
