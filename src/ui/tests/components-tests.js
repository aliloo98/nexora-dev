import assert from 'node:assert/strict'
import { TestDocument } from '../../../tests/helpers/uiTestDom.mjs'
import {
  createCoachCard,
  createEmptyState,
  createGoalCard,
  createHeroCard,
  createLoadingState,
  createMetricCard,
  createSectionHeader,
  createSkeleton,
  createStatRow
} from '../components/index.js'
import { createAppShell, createCluster, createDivider, createPageHeader, createStack } from '../layout/index.js'

const documentRef = new TestDocument()

let coachCalls = 0
const coach = createCoachCard({
  title: 'Épargne possible',
  description: 'Une recommandation claire.',
  level: 'vigilance',
  actionLabel: 'Agir',
  onAction: () => { coachCalls += 1 }
}, documentRef)
assert.ok(coach.classList.contains('nx-coach-card--vigilance'))
assert.equal(coach.querySelectorAll('button').length, 1, 'CoachCard must expose at most one action')
coach.querySelector('button').click()
assert.equal(coachCalls, 1)

const coachWithoutAction = createCoachCard({
  title: 'Information',
  actionLabel: 'Action incomplète'
}, documentRef)
assert.equal(coachWithoutAction.querySelectorAll('button').length, 0)

const metric = createMetricCard({
  label: 'Reste',
  value: '- 120 €',
  tone: 'critical',
  trend: { label: 'À surveiller' }
}, documentRef)
assert.ok(metric.classList.contains('nx-metric-card--critical'))
assert.equal(metric.querySelectorAll('button').length, 0)
assert.match(metric.textContent, /- 120 €/)

const goal = createGoalCard({
  name: 'Maison',
  currentAmount: '4 000 €',
  targetAmount: '20 000 €',
  percentage: 20,
  percentageLabel: '20 %',
  remaining: '16 000 €',
  deadline: '2030'
}, documentRef)
assert.match(goal.textContent, /4 000 € \/ 20 000 €/)
assert.equal(goal.querySelector('progress').getAttribute('aria-valuenow'), '20')

const sectionHeader = createSectionHeader({ title: 'Synthèse', headingLevel: 4 }, documentRef)
assert.equal(sectionHeader.querySelector('h4').tagName, 'H4')
const safeHeader = createSectionHeader({ title: 'Synthèse', headingLevel: 9 }, documentRef)
assert.equal(safeHeader.querySelector('h2').tagName, 'H2')

let emptyCalls = 0
const empty = createEmptyState({
  title: 'Aucun objectif',
  description: 'Crée un objectif.',
  actionLabel: 'Ajouter',
  onAction: () => { emptyCalls += 1 }
}, documentRef)
empty.querySelector('button').click()
assert.equal(emptyCalls, 1)

assert.equal(createLoadingState({ label: 'Chargement' }, documentRef).getAttribute('role'), 'status')
assert.equal(createSkeleton({ shape: 'circle' }, documentRef).getAttribute('aria-hidden'), 'true')
assert.match(createStatRow({ label: 'Reste', value: '1 000 €' }, documentRef).textContent, /1 000 €/)

const stack = createStack({ gap: 'xl', children: ['A', 'B'] }, documentRef)
assert.ok(stack.classList.contains('nx-stack--gap-xl'))
const cluster = createCluster({ gap: 'xs', align: 'baseline' }, documentRef)
assert.ok(cluster.classList.contains('nx-cluster--align-baseline'))
const shell = createAppShell({ as: 'main', children: stack }, documentRef)
assert.equal(shell.tagName, 'MAIN')
assert.ok(shell.classList.contains('nx-scope'))
const pageHeader = createPageHeader({ title: 'Budget', headingLevel: 1 }, documentRef)
assert.equal(pageHeader.querySelector('h1').textContent, 'Budget')
assert.equal(createDivider({ decorative: true }, documentRef).getAttribute('role'), 'presentation')

// HeroCard tests
const heroNeutral = createHeroCard({
  amount: '1 250 €',
  label: 'Argent restant ce mois-ci',
  tone: 'neutral'
}, documentRef)
assert.ok(heroNeutral.classList.contains('nx-hero-card'))
assert.ok(heroNeutral.classList.contains('nx-hero-card--neutral'))
assert.match(heroNeutral.textContent, /1 250 €/)
assert.match(heroNeutral.textContent, /Argent restant ce mois-ci/)
assert.equal(heroNeutral.querySelector('.nx-hero-card__amount').textContent, '1 250 €')
assert.equal(heroNeutral.querySelector('.nx-hero-card__label').textContent, 'Argent restant ce mois-ci')

const heroPositive = createHeroCard({
  amount: '850 €',
  label: 'Argent restant ce mois-ci',
  context: 'Situation stable',
  tone: 'positive',
  trend: 'Charges 65% · Variables 20%'
}, documentRef)
assert.ok(heroPositive.classList.contains('nx-hero-card--positive'))
assert.match(heroPositive.textContent, /Situation stable/)
assert.match(heroPositive.textContent, /Charges 65% · Variables 20%/)
assert.equal(heroPositive.querySelectorAll('.nx-hero-card__trend').length, 1)

const heroWarning = createHeroCard({
  amount: '85 €',
  label: 'Argent restant ce mois-ci',
  context: 'Marge faible',
  tone: 'warning'
}, documentRef)
assert.ok(heroWarning.classList.contains('nx-hero-card--warning'))
assert.match(heroWarning.textContent, /Marge faible/)

const heroDanger = createHeroCard({
  amount: '-150 €',
  label: 'Argent restant ce mois-ci',
  context: 'Déficit prévu',
  tone: 'danger'
}, documentRef)
assert.ok(heroDanger.classList.contains('nx-hero-card--danger'))
assert.match(heroDanger.textContent, /Déficit prévu/)

const heroWithoutContext = createHeroCard({
  amount: '500 €',
  label: 'Argent restant ce mois-ci',
  tone: 'neutral'
}, documentRef)
assert.equal(heroWithoutContext.querySelectorAll('.nx-hero-card__context').length, 0)

const heroWithoutTrend = createHeroCard({
  amount: '500 €',
  label: 'Argent restant ce mois-ci',
  tone: 'neutral'
}, documentRef)
assert.equal(heroWithoutTrend.querySelectorAll('.nx-hero-card__trend').length, 0)

let heroActionCalls = 0
const heroWithAction = createHeroCard({
  amount: '1 000 €',
  label: 'Argent restant ce mois-ci',
  tone: 'positive',
  actionLabel: 'Voir le plan',
  onAction: () => { heroActionCalls += 1 }
}, documentRef)
assert.equal(heroWithAction.querySelectorAll('button').length, 1)
heroWithAction.querySelector('button').click()
assert.equal(heroActionCalls, 1)

const heroWithoutAction = createHeroCard({
  amount: '500 €',
  label: 'Argent restant ce mois-ci',
  tone: 'neutral'
}, documentRef)
assert.equal(heroWithoutAction.querySelectorAll('button').length, 0)

// Test HTML escaping
const heroWithHtml = createHeroCard({
  amount: '500 €',
  label: '<script>alert("xss")</script>',
  tone: 'neutral'
}, documentRef)
assert.equal(heroWithHtml.querySelector('script'), null)
assert.match(heroWithHtml.querySelector('.nx-hero-card__label').textContent, /<script>/)

// Test accessibility
const heroAccessible = createHeroCard({
  amount: '1 000 €',
  label: 'Argent restant ce mois-ci',
  tone: 'neutral',
  ariaLabel: 'Solde du mois'
}, documentRef)
assert.equal(heroAccessible.getAttribute('aria-label'), 'Solde du mois')
assert.equal(heroAccessible.tagName, 'SECTION')
assert.ok(heroAccessible.classList.contains('nx-card'))

console.info('Nexora UI composed component tests: OK')
