import assert from 'node:assert/strict'
import { TestDocument } from '../../../tests/helpers/uiTestDom.mjs'
import { renderDashboardHero } from './renderDashboardHero.js'

const doc = new TestDocument()
const root = doc.createElement('div')
root.id = 'hydration-root'
doc.body.appendChild(root)

const renderLoading = () => renderDashboardHero('hydration-root', {
  revReel: 0,
  solde: 0,
  tauxCh: 0,
  variablesPct: 0,
  loading: true
}, { documentRef: doc })

const renderLoadedEmpty = () => renderDashboardHero('hydration-root', {
  revReel: 0,
  solde: 0,
  tauxCh: 0,
  variablesPct: 0,
  hydrationComplete: true,
  hasBudgetData: false
}, { documentRef: doc })

const renderLoadedReal = () => renderDashboardHero('hydration-root', {
  revReel: 2500,
  solde: 680,
  tauxCh: 52,
  variablesPct: 16,
  hydrationComplete: true,
  hasBudgetData: true
}, { documentRef: doc })

renderLoading()
assert.ok(root.textContent.includes('Argent restant ce mois-ci'), 'loading state should still render the neutral layout')
assert.ok(!root.textContent.includes('Synthèse à compléter'), 'loading state should not show the semantic empty-month message')

renderLoadedEmpty()
const emptyText = root.textContent
assert.ok(emptyText.includes('Synthèse à compléter'), 'genuine empty month should still show the semantic empty state')

renderLoadedReal()
assert.ok(root.textContent.includes('Situation stable') || root.textContent.includes('Charges 52%') || root.textContent.includes('Voir le plan'), 'hydrated real month should render real financial state')
assert.ok(!root.textContent.includes('Saisir le mois'), 'real month should not show the empty month CTA')
assert.ok(root.textContent.includes('Voir le plan'), 'hydrated real month should offer the plan action')

console.info('loading-vs-empty hydration regression tests: OK')
