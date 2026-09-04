import assert from 'node:assert/strict'
import { buildNorthStarDecision, buildNorthStarJarvisEnrichment } from './northStarDecision.js'

const assertDecision = (metrics, expected) => {
  const decision = buildNorthStarDecision(metrics)
  assert.equal(decision.priority, expected.priority)
  assert.equal(decision.tone, expected.tone)
  assert.match(`${decision.label} ${decision.title} ${decision.why} ${decision.action.label}`, /^(?!.*(?:NaN|Infinity|undefined))/)
  return decision
}

assertDecision({ revReel: 3000, solde: 900, soldeEstime: 1600, safetyMargin: 1700, varReel: 300, variablesPct: 10 }, {
  priority: 'healthy',
  tone: 'positive'
})

assertDecision({ revReel: 3000, solde: -240, soldeEstime: 500, safetyMargin: 800, varReel: 300, variablesPct: 10 }, {
  priority: 'projected-deficit',
  tone: 'danger'
})

assertDecision({ revReel: 3000, solde: 120, soldeEstime: 600, safetyMargin: 80, varReel: 300, variablesPct: 10 }, {
  priority: 'low-margin',
  tone: 'warning'
})

assertDecision({ revReel: 3000, solde: 900, soldeEstime: 1200, safetyMargin: 900, varReel: 1500, variablesPct: 50 }, {
  priority: 'variable-overrun',
  tone: 'warning'
})

assertDecision({ revReel: 0, solde: 0, soldeEstime: 0, safetyMargin: 0 }, {
  priority: 'data',
  tone: 'neutral'
})

assertDecision({}, {
  priority: 'data',
  tone: 'neutral'
})

const deficitDecision = buildNorthStarDecision({ revReel: 3000, solde: -240, varReel: 300, variablesPct: 10 })
const coherentJarvis = buildNorthStarJarvisEnrichment(deficitDecision, {
  priority: { id: 'fix_deficit', label: 'Réduire les dépenses' },
  risks: [{ id: 'deficit' }],
  dataQuality: { isComplete: true },
  insight: 'Un déficit est projeté.',
  supportingFacts: [{ label: 'Solde projeté', value: -240 }, { label: 'Marge', value: 80 }, { label: 'Extra', value: 1 }, { label: 'Ignoré', value: 2 }],
  recommendation: { label: 'Corriger le budget', target: 'saisie' }
})
assert.equal(coherentJarvis.facts.length, 3, 'Jarvis enrichment should expose at most three facts')
assert.equal(coherentJarvis.recommendation.target, 'saisie', 'Coherent Jarvis CTA should be exposed')
assert.equal(buildNorthStarJarvisEnrichment(deficitDecision, { priority: { id: 'capture_opportunity' }, risks: [], dataQuality: { isComplete: true } }), null, 'Incoherent Jarvis context should be ignored')
assert.equal(buildNorthStarJarvisEnrichment(deficitDecision, null), null, 'Missing Jarvis context should be ignored')
const limitedJarvis = buildNorthStarJarvisEnrichment(deficitDecision, { priority: { id: 'fix_deficit' }, risks: [{ id: 'deficit' }], dataQuality: { isComplete: false }, insight: 'Incomplete' })
assert.equal(limitedJarvis.insight, 'Analyse limitée', 'Incomplete Jarvis data should be presented as limited')
assert.equal(limitedJarvis.recommendation, null, 'Incomplete Jarvis data should not make a recommendation')

assertDecision({ revReel: 3000, solde: -1, soldeEstime: -20, safetyMargin: -10 }, {
  priority: 'projected-deficit',
  tone: 'danger'
})

console.info('northStarDecision tests: OK')
