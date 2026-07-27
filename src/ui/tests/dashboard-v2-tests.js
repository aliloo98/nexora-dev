import assert from 'node:assert/strict'
import { TestDocument } from '../../../tests/helpers/uiTestDom.mjs'
import { createDashboardCoachCard, createDashboardV2 } from '../dashboard/DashboardV2.js'

const documentRef = new TestDocument()
const navigation = []
const modes = []
const dashboard = createDashboardV2({
  onNavigate: (section) => navigation.push(section),
  onModeChange: (mode) => modes.push(mode)
}, documentRef)

assert.ok(dashboard.classList.contains('nx-app-shell'))
assert.ok(dashboard.classList.contains('nx-scope'))

const regions = dashboard.querySelectorAll('[data-dashboard-region]')
assert.deepEqual(
  regions.map((region) => region.getAttribute('data-dashboard-region')),
  ['remaining', 'coach', 'metrics', 'goal', 'secondary-actions']
)
assert.equal(dashboard.querySelectorAll('.nx-metric-card').length, 2)
assert.equal(dashboard.querySelectorAll('.nx-goal-card').length, 1)
assert.ok(dashboard.querySelector('#dashboard-master-root'))

dashboard.querySelector('#home-mode-simple-btn').click()
dashboard.querySelector('#home-mode-complete-btn').click()
assert.deepEqual(modes, ['simple', 'complete'])

dashboard.querySelector('#dashboard-synthesis-primary').click()
dashboard.querySelector('#dashboard-v2-budget-action').click()
dashboard.querySelector('#dashboard-goal-create-btn').click()
assert.deepEqual(navigation, ['plan', 'saisie', 'objectifs'])

const coach = createDashboardCoachCard({
  source: 'coach',
  title: 'Garde le cap',
  situation: 'Le budget du mois reste positif.'
}, {
  actionLabel: 'Voir le plan',
  onAction: () => navigation.push('coach-plan')
}, documentRef)

assert.ok(coach.classList.contains('nx-coach-card'))
assert.equal(coach.getAttribute('data-recommendation-source'), 'coach')
assert.equal(coach.querySelectorAll('button').length, 1)
coach.querySelector('button').click()
assert.equal(navigation.at(-1), 'coach-plan')

console.info('Nexora Dashboard V2 structure tests: OK')
