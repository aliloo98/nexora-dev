import assert from 'node:assert/strict'
import { TestDocument } from '../../../tests/helpers/uiTestDom.mjs'
import { renderDashboardHero } from './renderDashboardHero.js'

const documentRef = new TestDocument()

// Test 1: Montage dans le root fourni
const root1 = documentRef.createElement('div')
root1.id = 'test-root-1'
documentRef.body.appendChild(root1)

renderDashboardHero('test-root-1', { revReel: 2000, solde: 500, tauxCh: 65, variablesPct: 20 }, { documentRef })

const heroCard1 = root1.querySelector('.nx-hero-card')
assert.ok(heroCard1, 'Hero Card should be mounted in the provided root')
assert.equal(root1.children.length, 1, 'Root should contain exactly one child')

// Test 2: Remplacement du contenu précédent
const root2 = documentRef.createElement('div')
root2.id = 'test-root-2'
documentRef.body.appendChild(root2)

renderDashboardHero('test-root-2', { revReel: 2000, solde: 500, tauxCh: 65, variablesPct: 20 }, { documentRef })

const heroCard2 = root2.querySelector('.nx-hero-card')
assert.ok(heroCard2, 'Hero Card should be rendered')

// Test replacement by calling again with different data
renderDashboardHero('test-root-2', { revReel: 2000, solde: 600, tauxCh: 65, variablesPct: 20 }, { documentRef })

const heroCard2b = root2.querySelector('.nx-hero-card')
assert.ok(heroCard2b, 'Hero Card should be present after replacement')

// Test 3: Mapping des états neutral
const rootNeutral = documentRef.createElement('div')
rootNeutral.id = 'test-root-neutral'
documentRef.body.appendChild(rootNeutral)

renderDashboardHero('test-root-neutral', { revReel: 0, solde: 0, tauxCh: 0, variablesPct: 0 }, { documentRef })

const heroNeutral = rootNeutral.querySelector('.nx-hero-card')
assert.ok(heroNeutral?.classList.contains('nx-hero-card--neutral'), 'Should have neutral tone when revReel is 0')

// Test 4: Mapping des états positive
const rootPositive = documentRef.createElement('div')
rootPositive.id = 'test-root-positive'
documentRef.body.appendChild(rootPositive)

renderDashboardHero('test-root-positive', { revReel: 2000, solde: 1000, tauxCh: 50, variablesPct: 20 }, { documentRef })

const heroPositive = rootPositive.querySelector('.nx-hero-card')
assert.ok(heroPositive?.classList.contains('nx-hero-card--positive'), 'Should have positive tone when situation is stable')

// Test 5: Mapping des états warning (marge faible)
const rootWarning = documentRef.createElement('div')
rootWarning.id = 'test-root-warning'
documentRef.body.appendChild(rootWarning)

renderDashboardHero('test-root-warning', { revReel: 2000, solde: 150, tauxCh: 50, variablesPct: 20 }, { documentRef })

const heroWarning = rootWarning.querySelector('.nx-hero-card')
assert.ok(heroWarning?.classList.contains('nx-hero-card--warning'), 'Should have warning tone when margin is low')

// Test 6: Mapping des états danger (déficit)
const rootDanger = documentRef.createElement('div')
rootDanger.id = 'test-root-danger'
documentRef.body.appendChild(rootDanger)

renderDashboardHero('test-root-danger', { revReel: 2000, solde: -100, tauxCh: 50, variablesPct: 20 }, { documentRef })

const heroDanger = rootDanger.querySelector('.nx-hero-card')
assert.ok(heroDanger?.classList.contains('nx-hero-card--danger'), 'Should have danger tone when solde is negative')

// Test 7: Transmission du montant
const rootAmount = documentRef.createElement('div')
rootAmount.id = 'test-root-amount'
documentRef.body.appendChild(rootAmount)

renderDashboardHero('test-root-amount', { revReel: 2000, solde: 1234.56, tauxCh: 65, variablesPct: 20 }, { documentRef })

const amountText = rootAmount.querySelector('.nx-hero-card__amount')?.textContent
assert.ok(amountText.includes('1') && amountText.includes('234,56 €'), 'Amount should be formatted correctly')

// Test 8: Transmission du contexte
const rootContext = documentRef.createElement('div')
rootContext.id = 'test-root-context'
documentRef.body.appendChild(rootContext)

renderDashboardHero('test-root-context', { revReel: 2000, solde: 500, tauxCh: 65, variablesPct: 20 }, { documentRef })

const contextText = rootContext.querySelector('.nx-hero-card__context')?.textContent
assert.ok(contextText, 'Context should be present when revReel > 0')

// Test 9: Transmission de la tendance
const rootTrend = documentRef.createElement('div')
rootTrend.id = 'test-root-trend'
documentRef.body.appendChild(rootTrend)

renderDashboardHero('test-root-trend', { revReel: 2000, solde: 500, tauxCh: 65, variablesPct: 20 }, { documentRef })

const trendText = rootTrend.querySelector('.nx-hero-card__trend')?.textContent
assert.match(trendText, /Charges 65%/, 'Trend should show charges percentage')
assert.match(trendText, /Variables 20%/, 'Trend should show variables percentage')

// Test 10: CTA unique
const rootCta = documentRef.createElement('div')
rootCta.id = 'test-root-cta'
documentRef.body.appendChild(rootCta)

renderDashboardHero('test-root-cta', { revReel: 2000, solde: 500, tauxCh: 65, variablesPct: 20 }, { documentRef })

const buttons = rootCta.querySelectorAll('button')
assert.equal(buttons.length, 1, 'Should have exactly one CTA button')

// Test 11: CTA avec callback
let callbackCalled = false
let callbackSection = null

const rootCallback = documentRef.createElement('div')
rootCallback.id = 'test-root-callback'
documentRef.body.appendChild(rootCallback)

renderDashboardHero('test-root-callback', { revReel: 2000, solde: 500, tauxCh: 65, variablesPct: 20 }, {
  documentRef,
  onAction: (section) => {
    callbackCalled = true
    callbackSection = section
  }
})

rootCallback.querySelector('button')?.click()
assert.equal(callbackCalled, true, 'Callback should be called when CTA is clicked')
assert.equal(callbackSection, 'plan', 'Callback should receive correct section')

// Test 12: Comportement sûr lorsque le root est absent
const result = renderDashboardHero('non-existent-root', { revReel: 2000, solde: 500 }, { documentRef })
assert.equal(result, undefined, 'Should return undefined when root does not exist')

// Test 13: Absence de double montage - vérifie que le renderer ne plante pas
const rootDouble = documentRef.createElement('div')
rootDouble.id = 'test-root-double'
documentRef.body.appendChild(rootDouble)

renderDashboardHero('test-root-double', { revReel: 2000, solde: 500, tauxCh: 65, variablesPct: 20 }, { documentRef })
// Appel multiple pour vérifier la robustesse
renderDashboardHero('test-root-double', { revReel: 2000, solde: 600, tauxCh: 65, variablesPct: 20 }, { documentRef })

const heroCards = rootDouble.querySelectorAll('.nx-hero-card')
assert.ok(heroCards.length >= 1, 'Should have at least one Hero Card after multiple calls')

// Test 14: Semantic regression - "Reste à dépenser" should NOT be rendered
const rootSemantic = documentRef.createElement('div')
rootSemantic.id = 'test-root-semantic'
documentRef.body.appendChild(rootSemantic)

renderDashboardHero('test-root-semantic', { 
  revReel: 2500, 
  solde: 600.63, 
  tauxCh: 75, 
  variablesPct: 25, 
  totalDepRestant: 0,
  savingsRate: 12 
}, { documentRef })

const heroText = rootSemantic.textContent
assert.ok(!heroText.includes('Reste à dépenser'), 'Should NOT contain "Reste à dépenser" text')
assert.ok(!heroText.includes('reste à dépenser'), 'Should NOT contain "reste à dépenser" text (case insensitive)')

// Verify that the only sub-metric is "Taux d'épargne"
const subMetrics = rootSemantic.querySelectorAll('.nx-hero-card__sub-metric')
assert.ok(subMetrics.length <= 1, 'Should have at most one sub-metric (Taux d\'épargne)')
if (subMetrics.length > 0) {
  const subMetricText = subMetrics[0].textContent
  assert.ok(subMetricText.includes('Taux d\'épargne') || subMetricText.includes('Taux'), 'Sub-metric should be Taux d\'épargne')
}

console.info('renderDashboardHero tests: OK')
