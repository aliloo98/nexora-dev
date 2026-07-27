import { createCoachCard, createGoalCard, createMetricCard } from '../components/index.js'
import { getDocument } from '../internal/dom.js'
import { createAppShell, createCluster, createPageHeader, createStack } from '../layout/index.js'
import { createButton, createCard } from '../primitives/index.js'

const setId = (element, id) => {
  if (element) element.id = id
  return element
}

const createModeSelector = ({ onModeChange }, document) => {
  const complete = createButton({
    label: 'Complet',
    variant: 'ghost',
    size: 'compact',
    onClick: () => onModeChange?.('complete')
  }, document)
  complete.id = 'home-mode-complete-btn'

  const simplified = createButton({
    label: 'Simplifié',
    variant: 'ghost',
    size: 'compact',
    onClick: () => onModeChange?.('simple')
  }, document)
  simplified.id = 'home-mode-simple-btn'

  const selector = createCluster({
    gap: '2xs',
    align: 'center',
    children: [complete, simplified]
  }, document)
  selector.classList.add('nx-dashboard-v2__mode-selector')
  selector.setAttribute('aria-label', 'Mode d’affichage')
  return selector
}

const createRemainingHero = (document) => {
  const eyebrow = document.createElement('p')
  eyebrow.className = 'nx-dashboard-v2__eyebrow'
  eyebrow.textContent = 'Argent restant'

  const value = document.createElement('strong')
  value.id = 'simple-restant-value'
  value.className = 'nx-dashboard-v2__hero-value nx-numeric'
  value.textContent = '0 €'

  const context = document.createElement('p')
  context.id = 'simple-restant-sub'
  context.className = 'nx-dashboard-v2__hero-context'
  context.textContent = 'Disponible ce mois'

  const copy = createStack({
    gap: 'xs',
    children: [eyebrow, value, context]
  }, document)
  copy.classList.add('nx-dashboard-v2__hero-copy')

  const hero = createCard({
    as: 'article',
    variant: 'elevated',
    padding: 'comfortable',
    ariaLabel: 'Argent restant ce mois',
    children: copy
  }, document)
  hero.id = 'simple-card-restant'
  hero.classList.add('nx-dashboard-v2__hero')
  hero.setAttribute('data-dashboard-region', 'remaining')
  return hero
}

const createCoachRegion = (document) => {
  const host = document.createElement('div')
  host.id = 'dashboard-master-root'
  host.className = 'nx-dashboard-v2__coach-host'

  const region = document.createElement('section')
  region.id = 'dashboard-coach-card'
  region.className = 'nx-dashboard-v2__coach'
  region.setAttribute('data-dashboard-region', 'coach')
  region.setAttribute('aria-label', 'Coach Nexora')
  region.appendChild(host)
  return region
}

const createMetricsRegion = (document) => {
  const income = createMetricCard({
    label: 'Revenus',
    value: '0 €',
    context: 'Ce mois',
    tone: 'positive'
  }, document)
  income.id = 'dashboard-v2-income-card'
  setId(income.querySelector('.nx-metric-card__value'), 'simple-entrant-value')

  const expenses = createMetricCard({
    label: 'Dépenses',
    value: '0 €',
    context: 'Ce mois',
    tone: 'neutral'
  }, document)
  expenses.id = 'dashboard-v2-expenses-card'
  setId(expenses.querySelector('.nx-metric-card__value'), 'simple-sortant-value')

  const region = document.createElement('section')
  region.className = 'nx-dashboard-v2__metrics'
  region.setAttribute('data-dashboard-region', 'metrics')
  region.setAttribute('aria-label', 'Revenus et dépenses')
  region.append(income, expenses)
  return region
}

const createPrimaryGoal = ({ onNavigate }, document) => {
  const goal = createGoalCard({
    eyebrow: 'Objectif principal',
    name: 'Aucun objectif configuré',
    currentAmount: '—',
    targetAmount: '—',
    percentage: 0,
    percentageLabel: '—',
    remaining: '—',
    deadline: '—',
    actionLabel: 'Créer un objectif',
    onAction: () => onNavigate?.('objectifs')
  }, document)
  goal.id = 'dashboard-primary-goal'
  goal.setAttribute('data-dashboard-region', 'goal')
  goal.setAttribute('data-dashboard-version', '2')

  setId(goal.querySelector('.nx-goal-card__title'), 'dashboard-primary-goal-name')
  setId(goal.querySelector('.nx-progress__value'), 'dashboard-primary-goal-pct')
  setId(goal.querySelector('progress'), 'dashboard-primary-goal-bar')

  const amounts = goal.querySelector('.nx-goal-card__amounts')
  const current = document.createElement('span')
  current.id = 'dashboard-primary-goal-current'
  current.textContent = '—'
  const target = document.createElement('span')
  target.id = 'dashboard-primary-goal-target'
  target.textContent = '—'
  amounts?.replaceChildren(current, document.createTextNode(' / '), target)

  const metadataItems = goal.querySelectorAll('.nx-goal-card__metadata-item')
  setId(metadataItems[0]?.querySelector('dd'), 'dashboard-primary-goal-remaining')
  setId(metadataItems[1]?.querySelector('dd'), 'dashboard-primary-goal-date')

  const actions = goal.querySelector('.nx-goal-card__actions')
  setId(actions?.querySelector('button'), 'dashboard-goal-create-btn')
  return goal
}

const createSecondaryActions = ({ onNavigate }, document) => {
  const heading = document.createElement('div')
  heading.className = 'nx-dashboard-v2__secondary-copy'
  const title = document.createElement('h2')
  title.className = 'nx-dashboard-v2__secondary-title'
  title.textContent = 'Actions rapides'
  const description = document.createElement('p')
  description.textContent = 'Accédez aux détails uniquement lorsque vous en avez besoin.'
  heading.append(title, description)

  const plan = createButton({
    label: 'Voir le plan',
    variant: 'primary',
    icon: 'arrowRight',
    iconPosition: 'end',
    onClick: () => onNavigate?.('plan')
  }, document)
  plan.id = 'dashboard-synthesis-primary'

  const budget = createButton({
    label: 'Saisir le mois',
    variant: 'secondary',
    onClick: () => onNavigate?.('saisie')
  }, document)
  budget.id = 'dashboard-v2-budget-action'

  const goals = createButton({
    label: 'Voir les objectifs',
    variant: 'ghost',
    onClick: () => onNavigate?.('objectifs')
  }, document)
  goals.id = 'dashboard-v2-goals-action'

  const actions = createCluster({
    gap: 'sm',
    align: 'center',
    children: [plan, budget, goals]
  }, document)
  actions.classList.add('nx-dashboard-v2__secondary-buttons')

  const content = createStack({
    gap: 'md',
    children: [heading, actions]
  }, document)

  const region = createCard({
    as: 'section',
    padding: 'default',
    ariaLabel: 'Actions secondaires',
    children: content
  }, document)
  region.classList.add('nx-dashboard-v2__secondary')
  region.setAttribute('data-dashboard-region', 'secondary-actions')
  return region
}

/**
 * Creates the presentation-only Dashboard V2 structure.
 * Financial values are populated by the existing Dashboard presenters.
 */
export function createDashboardV2(options = {}, documentRef) {
  const document = getDocument(documentRef)
  const header = createPageHeader({
    headingLevel: 2,
    title: options.title || 'Tableau de bord',
    description: options.description || 'Votre situation financière en un regard.',
    action: createModeSelector(options, document)
  }, document)

  const flow = createStack({
    gap: 'xl',
    children: [
      header,
      createRemainingHero(document),
      createCoachRegion(document),
      createMetricsRegion(document),
      createPrimaryGoal(options, document),
      createSecondaryActions(options, document)
    ]
  }, document)
  flow.classList.add('nx-dashboard-v2__flow')

  const shell = createAppShell({
    as: 'section',
    id: 'dashboard-v2-shell',
    ariaLabel: 'Tableau de bord financier',
    children: flow
  }, document)
  shell.classList.add('nx-dashboard-v2')
  return shell
}

export function renderDashboardV2(rootId, options = {}, documentRef) {
  const document = getDocument(documentRef)
  const root = typeof rootId === 'string' ? document.getElementById(rootId) : rootId
  if (!root) return null
  const dashboard = createDashboardV2(options, document)
  root.replaceChildren(dashboard)
  return dashboard
}

export function createDashboardCoachCard(decision, options = {}, documentRef) {
  const document = getDocument(documentRef)
  const card = createCoachCard({
    title: decision.title,
    description: decision.situation,
    level: 'neutral',
    actionLabel: options.actionLabel,
    onAction: options.onAction
  }, document)
  card.setAttribute('data-recommendation-source', decision.source)
  card.classList.add('nx-dashboard-v2__coach-card')
  return card
}
