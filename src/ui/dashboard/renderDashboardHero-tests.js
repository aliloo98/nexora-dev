import assert from 'node:assert/strict'
import { TestDocument } from '../../../tests/helpers/uiTestDom.mjs'
import { renderDashboardHero } from './renderDashboardHero.js'

const documentRef = new TestDocument()

function setupDashboardDOM(doc, suffix = '') {
  const heroRoot = doc.createElement('div')
  heroRoot.id = `hero-root${suffix}`
  doc.body.appendChild(heroRoot)

  const priorityRoot = doc.createElement('div')
  priorityRoot.id = `priority-root${suffix}`
  doc.body.appendChild(priorityRoot)

  const jarvisRoot = doc.createElement('div')
  jarvisRoot.id = `jarvis-root${suffix}`
  doc.body.appendChild(jarvisRoot)

  const trajectoryRoot = doc.createElement('div')
  trajectoryRoot.id = `trajectory-root${suffix}`
  doc.body.appendChild(trajectoryRoot)

  return { heroRoot, priorityRoot, jarvisRoot, trajectoryRoot }
}

// Test 1: Montage dans le root fourni
const { heroRoot: heroRoot1 } = setupDashboardDOM(documentRef, '-1')

renderDashboardHero('hero-root-1', { revReel: 2000, solde: 500, tauxCh: 65, variablesPct: 20 }, { documentRef })

const heroCard1 = heroRoot1.querySelector('.nx-hero-card')
assert.ok(heroCard1, 'Hero Card should be mounted in the provided root')
assert.ok(heroRoot1.children.length >= 1, 'Root should contain at least one child (Hero Card)')

// Test 2: Remplacement du contenu précédent
const { heroRoot: heroRoot2 } = setupDashboardDOM(documentRef, '-2')

renderDashboardHero('hero-root-2', { revReel: 2000, solde: 500, tauxCh: 65, variablesPct: 20 }, { documentRef })

const heroCard2 = heroRoot2.querySelector('.nx-hero-card')
assert.ok(heroCard2, 'Hero Card should be rendered')

// Test replacement by calling again with different data
renderDashboardHero('hero-root-2', { revReel: 2000, solde: 600, tauxCh: 65, variablesPct: 20 }, { documentRef })

const heroCard2b = heroRoot2.querySelector('.nx-hero-card')
assert.ok(heroCard2b, 'Hero Card should be present after replacement')

// Test 3: Mapping des états neutral
const { heroRoot: heroRootNeutral } = setupDashboardDOM(documentRef, '-neutral')

renderDashboardHero('hero-root-neutral', { revReel: 0, solde: 0, tauxCh: 0, variablesPct: 0 }, { documentRef })

const heroNeutral = heroRootNeutral.querySelector('.nx-hero-card')
assert.ok(heroNeutral?.classList.contains('nx-hero-card--neutral'), 'Should have neutral tone when revReel is 0')

// Test 4: Mapping des états positive
const { heroRoot: heroRootPositive } = setupDashboardDOM(documentRef, '-positive')

renderDashboardHero('hero-root-positive', { revReel: 2000, solde: 1000, tauxCh: 50, variablesPct: 20 }, { documentRef })

const heroPositive = heroRootPositive.querySelector('.nx-hero-card')
assert.ok(heroPositive?.classList.contains('nx-hero-card--positive'), 'Should have positive tone when situation is stable')

// Test 5: Mapping des états warning (marge faible)
const { heroRoot: heroRootWarning } = setupDashboardDOM(documentRef, '-warning')

renderDashboardHero('hero-root-warning', { revReel: 2000, solde: 150, tauxCh: 50, variablesPct: 20 }, { documentRef })

const heroWarning = heroRootWarning.querySelector('.nx-hero-card')
assert.ok(heroWarning?.classList.contains('nx-hero-card--warning'), 'Should have warning tone when margin is low')

// Test 6: Mapping des états danger (déficit)
const { heroRoot: heroRootDanger } = setupDashboardDOM(documentRef, '-danger')

renderDashboardHero('hero-root-danger', { revReel: 2000, solde: -100, tauxCh: 50, variablesPct: 20 }, { documentRef })

const heroDanger = heroRootDanger.querySelector('.nx-hero-card')
assert.ok(heroDanger?.classList.contains('nx-hero-card--danger'), 'Should have danger tone when solde is negative')

// Test 7: Transmission du montant
const { heroRoot: heroRootAmount } = setupDashboardDOM(documentRef, '-amount')

renderDashboardHero('hero-root-amount', { revReel: 2000, solde: 1234.56, tauxCh: 65, variablesPct: 20 }, { documentRef })

const amountText = heroRootAmount.querySelector('.nx-hero-card__amount')?.textContent
assert.ok(amountText.includes('1') && amountText.includes('234,56 €'), 'Amount should be formatted correctly')

// Test 8: Transmission du contexte
const { heroRoot: heroRootContext } = setupDashboardDOM(documentRef, '-context')

renderDashboardHero('hero-root-context', { revReel: 2000, solde: 500, tauxCh: 65, variablesPct: 20 }, { documentRef })

const contextText = heroRootContext.querySelector('.nx-hero-card__context')?.textContent
assert.ok(contextText, 'Context should be present when revReel > 0')

// Test 9: Transmission de la tendance
const { heroRoot: heroRootTrend } = setupDashboardDOM(documentRef, '-trend')

renderDashboardHero('hero-root-trend', { revReel: 2000, solde: 500, tauxCh: 65, variablesPct: 20 }, { documentRef })

const trendText = heroRootTrend.querySelector('.nx-hero-card__trend')?.textContent
assert.match(trendText, /cycle reste positif/, 'Trend should show the projected positive trajectory')

// Test 10: The hero owns situation only; the action lives in Priority.
const { heroRoot: heroRootCta } = setupDashboardDOM(documentRef, '-cta')

renderDashboardHero('hero-root-cta', { revReel: 2000, solde: 500, tauxCh: 65, variablesPct: 20 }, { documentRef })

const buttons = heroRootCta.querySelectorAll('button')
assert.equal(buttons.length, 0, 'Hero should not duplicate the Priority action')

// Test 11: Comportement sûr lorsque le root est absent
const result = renderDashboardHero('non-existent-root', { revReel: 2000, solde: 500 }, { documentRef })
assert.equal(result, undefined, 'Should return undefined when root does not exist')

// Test 12: Absence de double montage - vérifie que le renderer ne plante pas
const { heroRoot: heroRootDouble } = setupDashboardDOM(documentRef, '-double')

renderDashboardHero('hero-root-double', { revReel: 2000, solde: 500, tauxCh: 65, variablesPct: 20 }, { documentRef })
// Appel multiple pour vérifier la robustesse
renderDashboardHero('hero-root-double', { revReel: 2000, solde: 600, tauxCh: 65, variablesPct: 20 }, { documentRef })

const heroCards = heroRootDouble.querySelectorAll('.nx-hero-card')
assert.ok(heroCards.length >= 1, 'Should have at least one Hero Card after multiple calls')

// Test 13: Semantic regression - "Reste à dépenser" should NOT be rendered
const { heroRoot: heroRootSemantic } = setupDashboardDOM(documentRef, '-semantic')

renderDashboardHero('hero-root-semantic', {
  revReel: 2500,
  solde: 600.63,
  tauxCh: 75,
  variablesPct: 25,
  totalDepRestant: 0,
  savingsRate: 12
}, { documentRef })

const heroText = heroRootSemantic.textContent
assert.ok(!heroText.includes('Reste à dépenser'), 'Should NOT contain "Reste à dépenser" text')
assert.ok(!heroText.includes('reste à dépenser'), 'Should NOT contain "reste à dépenser" text (case insensitive)')

// Verify that the V2 hero exposes its three financial sub-metrics.
const subMetrics = heroRootSemantic.querySelectorAll('.nx-hero-card__sub-metric')
assert.equal(subMetrics.length, 3, 'Should expose projected balance, available margin, and remaining expenses')
const subMetricText = [...subMetrics].map((metric) => metric.textContent).join(' ')
assert.match(subMetricText, /Solde projeté/)
assert.match(subMetricText, /Disponible/)
assert.match(subMetricText, /À payer/)

console.info('renderDashboardHero tests: OK')
