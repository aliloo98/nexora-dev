import assert from 'node:assert/strict'
import { buildNorthStarDecision } from './northStarDecision.js'

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

assertDecision({ revReel: 3000, solde: -1, soldeEstime: -20, safetyMargin: -10 }, {
  priority: 'projected-deficit',
  tone: 'danger'
})

console.info('northStarDecision tests: OK')
