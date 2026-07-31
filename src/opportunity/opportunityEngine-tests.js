import assert from 'node:assert/strict'
import { detectOpportunities } from './opportunityEngine.js'

console.log('\n🧪 Running Opportunity Engine Tests')

// 1. Détection d'opportunités d'abonnements superflus
const bills = [
  { name: 'Netflix', amount: 15, day: 5 },
  { name: 'Spotify', amount: 10, day: 12 }
]
const oppBills = detectOpportunities({ revReel: 2500, fixReel: 1000, varReel: 400 }, bills, [])
const unusedSubOpp = oppBills.find(o => o.id === 'opp_unused_subs')
assert.ok(unusedSubOpp)
assert.equal(unusedSubOpp.difficulty, 'EASY')
assert.equal(unusedSubOpp.confidence, 90)
console.log('✓ [Opportunity] Opportunité micro-abonnements détectée')

// 2. Détection d'objectif d'épargne proche
const goals = [{ title: 'Fonds d\'urgence', targetAmount: 1000, currentAmount: 850 }]
const oppGoals = detectOpportunities({ revReel: 2500 }, [], goals)
const goalOpp = oppGoals.find(o => o.id === 'opp_reach_goal')
assert.ok(goalOpp)
assert.equal(goalOpp.priority, 90)
console.log('✓ [Opportunity] Opportunité d\'objectif proche (85%) détectée')

console.log('📊 Opportunity Engine Tests: 2 passed, 0 failed\n')
