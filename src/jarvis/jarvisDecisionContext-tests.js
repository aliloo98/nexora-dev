import assert from 'node:assert/strict'
import {
  clearJarvisDecisionContext,
  createJarvisDecisionContext,
  getJarvisDecisionContext,
  publishJarvisDecisionContext,
  subscribeToJarvisDecisionContext
} from './jarvisDecisionContext.js'

const healthyViewModel = {
  headline: 'Ta trajectoire reste saine.',
  priority: null,
  priorityCta: null,
  risks: [],
  dataQuality: { isComplete: true, issues: [] },
  trajectory: {
    finalBalance: 500,
    lowestBalance: 200,
    lowestBalanceDay: 15,
    overdraftRisk: 'NONE',
    trendsAvailable: false
  }
}

const riskyViewModel = {
  headline: 'Un déficit est projeté.',
  priority: { id: 'fix_deficit', label: 'Réduire les dépenses', rank: 1, severity: 'critical' },
  priorityCta: { label: 'Corriger le budget', target: 'saisie' },
  risks: [
    { id: 'deficit', label: 'Déficit mensuel', domain: 'cashflow', severity: 'critical', evidence: { deficit: -300, ignored: 'not-a-number' } },
    { id: 'overdraft_risk', label: 'Risque de découvert', domain: 'cashflow', severity: 'high', evidence: { lowestBalance: -50 } },
    { id: 'third', label: 'Third', domain: 'budget', severity: 'medium', evidence: {} },
    { id: 'fourth', label: 'Fourth', domain: 'budget', severity: 'low', evidence: {} }
  ],
  dataQuality: { isComplete: false, issues: [{ code: 'INSUFFICIENT_HISTORY', severity: 'medium' }] },
  trajectory: {
    finalBalance: -300,
    lowestBalance: -350,
    lowestBalanceDay: 28,
    overdraftRisk: 'HIGH',
    trendsAvailable: false
  }
}

clearJarvisDecisionContext()
let notificationCount = 0
const unsubscribe = subscribeToJarvisDecisionContext(() => { notificationCount += 1 })
const published = publishJarvisDecisionContext(riskyViewModel, { version: 2, publishedAt: 200 })
assert.equal(published, true, 'A valid ViewModel should be published')
assert.equal(notificationCount, 1, 'A valid publication should notify consumers')
const latest = getJarvisDecisionContext()
assert.equal(latest.priority.id, 'fix_deficit', 'North Star should consume the latest priority')
assert.equal(latest.risks.length, 3, 'Only three risks should cross the contract')
assert.equal(latest.risks[0].evidence.deficit, -300, 'Numeric evidence should be preserved')
assert.equal(latest.risks[0].evidence.ignored, undefined, 'Invalid evidence should be discarded')
assert.equal(latest.recommendation.target, 'saisie', 'Existing Jarvis CTA should cross the contract')

latest.priority.label = 'mutated'
assert.equal(getJarvisDecisionContext().priority.label, 'Réduire les dépenses', 'Consumers should receive an isolated context copy')

const stalePublished = publishJarvisDecisionContext(healthyViewModel, { version: 1, publishedAt: 300 })
assert.equal(stalePublished, false, 'An older ViewModel must not overwrite a newer context')
assert.equal(getJarvisDecisionContext().priority.id, 'fix_deficit', 'The newer context must remain active')
assert.equal(notificationCount, 1, 'A stale publication should not notify consumers')

const incomplete = createJarvisDecisionContext({ dataQuality: { isComplete: false }, risks: null }, { version: 3 })
assert.equal(incomplete.priority, null, 'Incomplete ViewModels should remain safe')
assert.deepEqual(incomplete.risks, [], 'Missing risks should become an empty list')
assert.equal(incomplete.trajectory.finalBalance, null, 'Missing trajectory values should remain null')

clearJarvisDecisionContext()
assert.equal(notificationCount, 2, 'Clearing the context should notify consumers with null')
unsubscribe()
assert.equal(getJarvisDecisionContext(), null, 'North Star must work with no Jarvis context')
assert.deepEqual(createJarvisDecisionContext(healthyViewModel, { version: 4 }), createJarvisDecisionContext(healthyViewModel, { version: 4 }), 'Same input should produce the same context')
assert.equal(createJarvisDecisionContext(healthyViewModel).publishedAt, null, 'Missing metadata should not generate a variable timestamp')
assert.deepEqual(createJarvisDecisionContext(healthyViewModel), createJarvisDecisionContext(healthyViewModel), 'Same input should produce deterministic context values')

console.info('jarvisDecisionContext tests: OK')
