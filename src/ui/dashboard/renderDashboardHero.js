import { buildNorthStarDecision } from './northStarDecision.js'
import { bindNorthStarJarvis } from './renderNorthStarJarvis.js'
import { renderNorthStarTrajectory } from './renderNorthStarTrajectory.js'
import { renderNorthStarGoals } from './renderNorthStarGoals.js'
import { renderNorthStarDebts } from './renderNorthStarDebts.js'
import { buildSnapshotFromDashboardMetrics } from '../../jarvis/dashboardMetricsAdapter.js'
import { publishJarvisDecisionContext } from '../../jarvis/jarvisDecisionContext.js'

const toFiniteNumber = (value, fallback = 0) => {
  const number = Number(value)
  return Number.isFinite(number) ? number : fallback
}

const fmt = (value) => {
  const amount = toFiniteNumber(value)
  const fractionDigits = Number.isInteger(amount) ? 0 : 2
  return `${amount.toLocaleString('fr-FR', { minimumFractionDigits: fractionDigits, maximumFractionDigits: fractionDigits })} €`
}

const fmtPct = (value) => {
  const pct = toFiniteNumber(value)
  return `${pct.toFixed(0)}%`
}

const appendText = (parent, tag, className, text) => {
  const element = parent.ownerDocument.createElement(tag)
  element.className = className
  element.textContent = text
  parent.appendChild(element)
  return element
}

const getNexoraOfficialSituation = ({ revReel, solde, tauxCh, variablesPct }) => {
  if (revReel === 0) {
    return { state: 'neutral', label: 'Données limitées', riskLabel: '—' }
  }

  if (solde < 0) {
    return { state: 'danger', label: 'Déficit prévu', riskLabel: 'Élevé' }
  }

  if (solde < revReel * 0.1) {
    return { state: 'warning', label: 'Marge faible', riskLabel: 'Modéré' }
  }

  if (tauxCh > 85) {
    return { state: 'warning', label: 'Charges élevées', riskLabel: 'Modéré' }
  }

  return { state: 'positive', label: 'Situation stable', riskLabel: 'Faible' }
}

function buildSituationCopy({ isHydrating, hasBudgetData, revReel, solde, soldeEstime, tauxCh, variablesPct, totalDepRestant }) {
  if (isHydrating) {
    return {
      tone: 'neutral',
      status: 'Chargement',
      message: 'Restauration du budget en cours.',
      amount: '—'
    }
  }

  if (revReel <= 0 && !hasBudgetData) {
    return {
      tone: 'neutral',
      status: 'Données limitées',
      message: 'Ajoute les revenus et dépenses du mois pour obtenir une lecture fiable.',
      amount: '—'
    }
  }

  if (revReel <= 0) {
    return {
      tone: 'neutral',
      status: 'Synthèse à compléter',
      message: 'Les dépenses existent, mais le revenu manque pour qualifier la situation.',
      amount: fmt(soldeEstime)
    }
  }

  const situation = getNexoraOfficialSituation({ revReel, solde, tauxCh, variablesPct })
  if (situation.state === 'danger') {
    return {
      tone: 'danger',
      status: situation.label,
      message: `Le cycle finit en déficit de ${fmt(Math.abs(solde))} sans correction.`,
      amount: fmt(soldeEstime)
    }
  }

  if (situation.state === 'warning') {
    const driver = solde < revReel * 0.1
      ? `La projection descend à ${fmt(solde)} en fin de cycle.`
      : `Les charges atteignent ${fmtPct(tauxCh)} des revenus.`
    return {
      tone: 'warning',
      status: situation.label,
      message: `${driver} La marge doit rester protégée.`,
      amount: fmt(soldeEstime)
    }
  }

  return {
    tone: 'positive',
    status: situation.label,
    message: totalDepRestant > 0
      ? `Tu gardes ${fmt(solde)} projetés après les dépenses restantes.`
      : `Le cycle reste positif avec ${fmt(solde)} projetés.`,
    amount: fmt(soldeEstime)
  }
}

function buildNorthStarVerdict({ revReel, solde, tauxCh, variablesPct, soldeEstime, safetyMargin = 0 } = {}) {
  if (revReel === 0) {
    return {
      tone: 'neutral',
      label: 'Synthèse à compléter',
      summary: 'Ajoute les revenus et dépenses du mois pour activer le diagnostic Nexora.',
      action: 'Commencer le budget',
      available: '—'
    }
  }

  if (solde < 0) {
    return {
      tone: 'danger',
      label: 'Action nécessaire',
      summary: `Ton solde projeté devient négatif. Réduis les dépenses de ${fmt(Math.abs(solde))} pour équilibrer.`,
      action: 'Réviser le budget',
      available: fmt(Math.max(0, soldeEstime || 0))
    }
  }

  if (solde < revReel * 0.1 || tauxCh > 85) {
    return {
      tone: 'warning',
      label: 'Attention requise',
      summary: `Marge faible de ${fmt(Math.max(0, safetyMargin || soldeEstime))}. Surveille les dépenses variables.`,
      action: 'Optimiser les dépenses',
      available: fmt(Math.max(0, safetyMargin || soldeEstime || 0))
    }
  }

  return {
    tone: 'positive',
    label: 'Situation stable',
    summary: `Fin de cycle estimée : +${fmt(solde)}. Aucune action urgente requise.`,
    action: 'Surveiller la trajectoire',
    available: fmt(Math.max(0, safetyMargin || soldeEstime || 0))
  }
}

function renderNorthStarPanel(rootId, metrics = {}, documentRef, windowRef) {
  if (!rootId || !documentRef) return null
  const root = documentRef.getElementById(rootId)
  if (!root) return null
  const currentValue = Number(metrics.soldeEstime ?? metrics.solde ?? 0)
  const projectedValue = Number(metrics.solde ?? 0)
  const availableValue = Number(metrics.safetyMargin ?? Math.max(0, currentValue))
  const verdict = buildNorthStarVerdict({
    revReel: Number(metrics.revReel || 0),
    solde: projectedValue,
    tauxCh: Number(metrics.tauxCh || 0),
    variablesPct: Number(metrics.variablesPct || 0),
    soldeEstime: currentValue,
    safetyMargin: availableValue
  })

  const existing = root.querySelector('.north-star-panel')
  if (existing) {
    existing.remove()
  }

  const panel = documentRef.createElement('section')
  panel.className = 'north-star-panel'
  panel.setAttribute('aria-label', 'North Star dashboard')
  panel.innerHTML = `
    <div class="north-star-panel__header">
      <span class="north-star-panel__verdict north-star-panel__verdict--${verdict.tone}">${verdict.label}</span>
    </div>
    <p class="north-star-panel__summary">${verdict.summary}</p>
    <div class="north-star-panel__metrics">
      <div class="north-star-metric">
        <span class="north-star-metric__label">Actuel</span>
        <strong class="north-star-metric__value">${fmt(currentValue)}</strong>
      </div>
      <div class="north-star-metric">
        <span class="north-star-metric__label">Projeté</span>
        <strong class="north-star-metric__value">${fmt(projectedValue)}</strong>
      </div>
      <div class="north-star-metric north-star-metric--highlight">
        <span class="north-star-metric__label">Disponible</span>
        <strong class="north-star-metric__value">${fmt(availableValue)}</strong>
      </div>
    </div>
    ${verdict.action ? `<button type="button" class="north-star-panel__action" data-target-section="${verdict.tone === 'neutral' ? 'saisie' : 'saisie'}">${verdict.action}</button>` : ''}
  `

  const actionButton = panel.querySelector('.north-star-panel__action')
  if (actionButton && typeof windowRef?.showSection === 'function') {
    actionButton.addEventListener('click', () => windowRef.showSection('saisie'))
  } else if (actionButton) {
    actionButton.disabled = true
  }

  root.appendChild(panel)
  return panel
}

function renderNorthStarPriority(rootId, metrics = {}, documentRef, windowRef) {
  if (!rootId || !documentRef) return null
  const root = documentRef.getElementById(rootId)
  if (!root) return null
  const decision = buildNorthStarDecision(metrics)

  const panel = documentRef.createElement('section')
  panel.className = `north-star-priority north-star-priority--${decision.tone}`
  panel.setAttribute('aria-label', 'Priorité financière')

  const header = documentRef.createElement('div')
  header.className = 'north-star-priority__header'
  appendText(header, 'span', 'north-star-priority__eyebrow', 'PRIORITÉ')
  appendText(header, 'span', 'north-star-priority__label', decision.label)
  panel.appendChild(header)

  appendText(panel, 'h2', 'north-star-priority__title', decision.title)

  const why = documentRef.createElement('div')
  why.className = 'north-star-priority__why'
  appendText(why, 'span', 'north-star-priority__why-label', 'Pourquoi')
  const list = documentRef.createElement('ul')
  list.className = 'north-star-priority__reasons'
  const reasons = Array.isArray(decision.reasons) && decision.reasons.length
    ? decision.reasons.slice(0, 3)
    : [decision.why]
  reasons.forEach((reason) => appendText(list, 'li', 'north-star-priority__reason', reason))
  why.appendChild(list)
  panel.appendChild(why)

  const action = documentRef.createElement('div')
  action.className = 'north-star-priority__action'
  appendText(action, 'span', 'north-star-priority__action-label', 'Action')
  if (decision.action?.targetSection) {
    const actionButton = appendText(action, 'button', 'north-star-priority__action-button', decision.action.label)
    actionButton.type = 'button'
    actionButton.dataset.targetSection = decision.action.targetSection
    if (typeof windowRef?.showSection === 'function') {
      actionButton.addEventListener('click', () => windowRef.showSection(decision.action.targetSection))
    } else {
      actionButton.disabled = true
    }
  } else if (decision.action?.label) {
    appendText(action, 'strong', 'north-star-priority__action-text', decision.action.label)
  }
  panel.appendChild(action)

  root.replaceChildren(panel)
  return panel
}

/**
 * Renders the premium Hero Card - DOMINANT SITUATION DISPLAY
 * This is the focal point of the entire dashboard
 */
export function renderDashboardHero(rootId, metrics = {}, options = {}) {
  const documentRef = options.documentRef || document
  const windowRef = options.windowRef || (typeof window !== 'undefined' ? window : undefined)
  const root = documentRef.getElementById(rootId)
  if (!root) return

  const isHydrating = metrics.loading === true || metrics.hydrating === true || metrics.isHydrating === true || metrics.hydrationComplete === false
  const hasBudgetData = Boolean(metrics.hasBudgetData || metrics.hasData || metrics.revReel > 0 || metrics.fixReel > 0 || metrics.varReel > 0 || metrics.totalDepRestant > 0)
  const revReel = toFiniteNumber(metrics.revReel)
  const solde = toFiniteNumber(metrics.solde)
  const soldeEstime = toFiniteNumber(metrics.soldeEstime, solde)
  const tauxCh = toFiniteNumber(metrics.tauxCh)
  const variablesPct = toFiniteNumber(metrics.variablesPct)
  const safetyMargin = toFiniteNumber(metrics.safetyMargin, Math.max(0, soldeEstime))
  const totalDepRestant = toFiniteNumber(metrics.totalDepRestant ?? metrics.remainingToSpend)
  const lowestBalance = Number.isFinite(Number(metrics.lowestBalance))
    ? fmt(metrics.lowestBalance)
    : '—'

  const kpiValues = [
    ['kpi-final-balance', hasBudgetData ? fmt(solde) : '—'],
    ['kpi-lowest-balance', lowestBalance],
    ['kpi-income-trend', revReel > 0 ? fmt(revReel) : '—']
  ]
  kpiValues.forEach(([id, value]) => {
    const element = documentRef.getElementById(id)
    if (element) element.textContent = value
  })

  const situation = buildSituationCopy({
    isHydrating,
    hasBudgetData,
    revReel,
    solde,
    soldeEstime,
    tauxCh,
    variablesPct,
    totalDepRestant
  })

  const heroSection = documentRef.createElement('section')
  heroSection.className = `cockpit-hero cockpit-hero--${situation.tone} nx-hero-card nx-hero-card--${situation.tone}`
  heroSection.setAttribute('aria-label', 'Situation financière')

  const header = documentRef.createElement('div')
  header.className = 'cockpit-hero__header nx-hero-card__header'
  const titleGroup = documentRef.createElement('div')
  titleGroup.className = 'cockpit-hero__title-group'
  appendText(titleGroup, 'span', 'cockpit-hero__label nx-hero-card__label', 'Solde actuel')
  appendText(titleGroup, 'span', 'cockpit-hero__context nx-hero-card__context', situation.status)
  header.appendChild(titleGroup)
  appendText(header, 'strong', `cockpit-hero__amount cockpit-hero__amount--${situation.tone} nx-hero-card__amount nx-numeric`, situation.amount)
  heroSection.appendChild(header)

  appendText(heroSection, 'p', 'cockpit-hero__message nx-hero-card__trend', situation.message)

  const metricsRail = documentRef.createElement('div')
  metricsRail.className = 'cockpit-hero__metrics nx-hero-card__sub-metrics'
  ;[
    { label: 'Solde projeté', value: revReel > 0 || hasBudgetData ? fmt(solde) : '—', helper: 'Fin de cycle' },
    { label: 'Disponible', value: revReel > 0 || hasBudgetData ? fmt(Math.max(0, safetyMargin)) : '—', helper: 'Marge utile' },
    { label: 'À payer', value: revReel > 0 || hasBudgetData ? fmt(totalDepRestant) : '—', helper: 'Dépenses restantes' }
  ].forEach((metric) => {
    const item = documentRef.createElement('div')
    item.className = 'cockpit-hero__metric nx-hero-card__sub-metric'
    appendText(item, 'span', 'cockpit-hero__metric-label nx-hero-card__sub-metric-label', metric.label)
    appendText(item, 'strong', 'cockpit-hero__metric-value nx-hero-card__sub-metric-value nx-numeric', metric.value)
    appendText(item, 'span', 'cockpit-hero__metric-helper', metric.helper)
    metricsRail.appendChild(item)
  })
  heroSection.appendChild(metricsRail)

  root.replaceChildren(heroSection)

  const decision = buildNorthStarDecision(metrics)

  // Build V2.1 snapshot from Dashboard metrics and publish to Jarvis
  // This ensures North Star and Jarvis use the EXACT SAME financial data
  const snapshot = buildSnapshotFromDashboardMetrics(metrics, {
    monthKey: metrics.monthKey || null,
    goals: metrics.goals || [],
    debts: metrics.debts || [],
    history: metrics.history || [],
    trajectory: metrics.trajectory || null
  })
  publishJarvisDecisionContext(snapshot, {
    version: Date.now(),
    publishedAt: Date.now()
  })

  renderNorthStarPriority('priority-root', metrics, documentRef, windowRef)
  bindNorthStarJarvis('jarvis-root', decision, documentRef, windowRef, metrics)
  renderNorthStarTrajectory('trajectory-root', metrics, { documentRef, windowRef })
  renderNorthStarGoals('goal-progress-root', metrics, { documentRef, windowRef }).catch?.((err) => {
    console.warn?.('[North Star Goals] render failed', err)
  })
  renderNorthStarDebts('debts-summary-root', metrics, { documentRef, windowRef })
}

export { renderNorthStarPriority, renderNorthStarPanel, bindNorthStarJarvis }

export default renderDashboardHero
