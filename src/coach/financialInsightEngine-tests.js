import assert from 'node:assert/strict'
import { generateFinancialInsights, getTopFinancialInsight } from './financialInsightEngine.js'

console.log('\n🧪 Running Financial Insight Engine Tests')

// 1. Profil 1 : Utilisateur Prudent (Épargne > 20%)
const prudentMetrics = { revReel: 3000, fixReel: 1000, varReel: 500 }
const prudentTop = getTopFinancialInsight(prudentMetrics)
assert.equal(prudentTop.id, 'insight_prudent_saver')
assert.equal(prudentTop.humanIndicator, '🎉 Mois idéal')
assert.ok(prudentTop.confidence >= 90)
console.log('✓ [Profil 1] Utilisateur prudent : Insight "Mois idéal" correctement généré')

// 2. Profil 2 : Utilisateur en Déficit
const deficitMetrics = { revReel: 1500, fixReel: 1200, varReel: 600 }
const deficitTop = getTopFinancialInsight(deficitMetrics)
assert.equal(deficitTop.id, 'insight_deficit')
assert.equal(deficitTop.humanIndicator, '🔴 Action recommandée')
assert.equal(deficitTop.priority, 100)
console.log('✓ [Profil 2] Utilisateur en déficit : Priorité 100 "Action recommandée" attribuée')

// 3. Profil 3 : Utilisateur qui progresse (Dépenses en baisse de 18% vs mois précédent)
const progressMetrics = { revReel: 2500, fixReel: 1000, varReel: 500 } // Total: 1500 €
const history = [{ fixReel: 1250, varReel: 580, revReel: 2500 }] // Total précédent: 1830 € -> baisse de 18%
const progressTop = getTopFinancialInsight(progressMetrics, history)
assert.equal(progressTop.id, 'insight_spending_reduced')
assert.ok(progressTop.headline.includes('18% de moins'))
console.log('✓ [Profil 3] Utilisateur qui progresse : Détection exacte de la baisse de 18% vs mois précédent')

// 4. Profil 4 : Utilisateur avec charges fixes trop élevées
const highFixedMetrics = { revReel: 2000, fixReel: 1200, varReel: 400 } // Taux charges: 60%
const highFixedTop = getTopFinancialInsight(highFixedMetrics)
assert.equal(highFixedTop.id, 'insight_high_fixed_charges')
assert.equal(highFixedTop.humanIndicator, '🟠 À surveiller')
console.log('✓ [Profil 4] Dépenses trop élevées : Alerte abonnements & frais fixes déclenchée')

// 5. Profil 5 : Utilisateur qui atteint son objectif
const goalMetrics = { revReel: 2500, fixReel: 1000, varReel: 500 }
const goals = [{ id: 'g1', title: 'Vacances d\'été', targetAmount: 1000, currentAmount: 1000 }]
const goalTop = getTopFinancialInsight(goalMetrics, [], goals)
assert.equal(goalTop.id, 'insight_goal_reached')
assert.equal(goalTop.humanIndicator, '🎯 Objectif accompli')
console.log('✓ [Profil 5] Objectif atteint : Célébration "Objectif accompli" générée')

console.log('📊 Financial Insight Engine Tests: 5 passed, 0 failed\n')
