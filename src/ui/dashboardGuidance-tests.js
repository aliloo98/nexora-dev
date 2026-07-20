import assert from 'node:assert/strict'
import { buildDashboardGuidance } from './dashboardGuidance.js'

const guidance = buildDashboardGuidance({
  revReel: 2500,
  solde: 300,
  soldeEstime: 120,
  totalDepRestant: 180,
  tauxEp: 12,
  tauxCh: 78,
  depPayesPct: 40,
  fixesPct: 58,
  variablesPct: 32
})

assert.equal(guidance.actionTitle, 'Mettre à jour les paiements')
assert.match(guidance.actionText, /paiements/)
assert.equal(guidance.watchTitle, 'Charges fixes élevées')
assert.equal(guidance.situationTitle, 'Solde fin de cycle positif : 300 €')

const guidance2 = buildDashboardGuidance({
  revReel: 0,
  solde: 0,
  soldeEstime: 0,
  totalDepRestant: 0,
  tauxEp: 0,
  tauxCh: 0,
  depPayesPct: 0,
  fixesPct: 0,
  variablesPct: 0
})
assert.equal(guidance2.actionTitle, 'Saisir les revenus')
assert.match(guidance2.actionText, /revenus/)
console.log('dashboardGuidance-tests: OK')
