import { createHeroCard } from '../components/HeroCard.js'
import { buildNorthStarDecision } from './northStarDecision.js'
import { bindNorthStarJarvis } from './renderNorthStarJarvis.js'

const fmt = (value) => {
  const amount = Number(value) || 0
  const fractionDigits = Number.isInteger(amount) ? 0 : 2
  return `${amount.toLocaleString('fr-FR', { minimumFractionDigits: fractionDigits, maximumFractionDigits: fractionDigits })} €`
}

const fmtPct = (value) => {
  const pct = Number(value) || 0
  return `${pct.toFixed(0)}%`
}

const getNexoraOfficialSituation = ({ revReel, solde, tauxCh, variablesPct }) => {
  if (revReel === 0) {
    return { state: 'neutral', label: 'Synthèse à compléter', riskLabel: '—' }
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

function buildNorthStarVerdict({ revReel, solde, tauxCh, variablesPct, soldeEstime, safetyMargin = 0 } = {}) {
  if (revReel === 0) {
    return {
      tone: 'neutral',
      label: 'Synthèse à compléter',
      summary: 'Ajoute les revenus et dépenses du mois pour activer le diagnostic Nexora.',
      available: '—'
    }
  }

  if (solde < 0) {
    return {
      tone: 'danger',
      label: 'Situation à risque',
      summary: `Ton solde projeté devient négatif avant la fin du cycle. Il reste ${fmt(Math.abs(solde))} à couvrir.`,
      available: fmt(Math.max(0, soldeEstime || 0))
    }
  }

  if (solde < revReel * 0.1 || tauxCh > 85) {
    return {
      tone: 'warning',
      label: 'Situation fragile',
      summary: `Ton budget reste positif mais la marge est faible. La sécurité du mois dépend de tes prochaines dépenses.`,
      available: fmt(Math.max(0, safetyMargin || soldeEstime || 0))
    }
  }

  return {
    tone: 'positive',
    label: 'Situation stable',
    summary: `Ton mois est sous contrôle. Tu devrais terminer le cycle avec ${fmt(solde)} de marge.`,
    available: fmt(Math.max(0, safetyMargin || soldeEstime || 0))
  }
}

function renderNorthStarPanel(root, metrics = {}, documentRef) {
  if (!root || !documentRef) return null
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
      <span class="north-star-panel__eyebrow">North Star</span>
      <span class="north-star-panel__verdict north-star-panel__verdict--${verdict.tone}">${verdict.label}</span>
    </div>
    <p class="north-star-panel__summary">${verdict.summary}</p>
    <div class="north-star-panel__grid">
      <article class="north-star-stat" data-role="north-star-current">
        <span class="north-star-stat__label">Solde actuel</span>
        <strong class="north-star-stat__value">${fmt(currentValue)}</strong>
      </article>
      <article class="north-star-stat" data-role="north-star-projected">
        <span class="north-star-stat__label">Solde projeté</span>
        <strong class="north-star-stat__value">${fmt(projectedValue)}</strong>
      </article>
      <article class="north-star-stat north-star-stat--accent" data-role="north-star-available">
        <span class="north-star-stat__label">Disponible</span>
        <strong class="north-star-stat__value">${fmt(availableValue)}</strong>
      </article>
    </div>
  `
  root.appendChild(panel)
  return panel
}

function renderNorthStarPriority(root, metrics = {}, documentRef, windowRef) {
  if (!root || !documentRef) return null
  const decision = buildNorthStarDecision(metrics)
  const existing = root.querySelector('.north-star-priority')
  if (existing) existing.remove()

  const panel = documentRef.createElement('section')
  panel.className = `north-star-priority north-star-priority--${decision.tone}`
  panel.setAttribute('aria-label', 'Priorité financière')
  panel.innerHTML = `
    <div class="north-star-priority__header">
      <span class="north-star-priority__eyebrow">Priorité</span>
      <span class="north-star-priority__label">${decision.label}</span>
    </div>
    <h3 class="north-star-priority__title">${decision.title}</h3>
    <p class="north-star-priority__why"><strong>Pourquoi ?</strong> ${decision.why}</p>
    <div class="north-star-priority__action">
      <span class="north-star-priority__action-label">Action recommandée</span>
      <button type="button" class="north-star-priority__action-button"${decision.action.targetSection ? ` data-target-section="${decision.action.targetSection}"` : ''}>→ ${decision.action.label}</button>
    </div>
  `
  const actionButton = panel.querySelector('.north-star-priority__action-button')
  if (actionButton && decision.action.targetSection && typeof windowRef?.showSection === 'function') {
    actionButton.addEventListener('click', () => windowRef.showSection(decision.action.targetSection))
  } else if (actionButton) {
    actionButton.disabled = true
  }
  root.appendChild(panel)
  return panel
}

/**
 * Renders the premium Hero Card using V2 components with sub-metrics.
 * @param {string} rootId - The ID of the container element
 * @param {Object} metrics - Financial metrics (revReel, solde, tauxCh, variablesPct, totalDepRestant, savingsRate)
 * @param {Object} options - Additional options (documentRef, onAction)
 */
export function renderDashboardHero(rootId, metrics = {}, options = {}) {
  const documentRef = options.documentRef || document
  const windowRef = options.windowRef || (typeof window !== 'undefined' ? window : undefined)
  const root = documentRef.getElementById(rootId)
  if (!root) return

  const isHydrating = metrics.loading === true || metrics.hydrating === true || metrics.isHydrating === true || metrics.hydrationComplete === false
  const hasBudgetData = Boolean(metrics.hasBudgetData || metrics.hasData || metrics.revReel > 0 || metrics.fixReel > 0 || metrics.varReel > 0 || metrics.totalDepRestant > 0)
  const revReel = Number(metrics.revReel || 0)
  const solde = Number(metrics.solde || 0)
  const tauxCh = Number(metrics.tauxCh || 0)
  const variablesPct = Number(metrics.variablesPct || 0)
  const totalDepRestant = Number(metrics.totalDepRestant || 0)
  const savingsRate = Number(metrics.savingsRate || 0)

  let tone = 'neutral'
  let context = isHydrating ? 'Chargement du budget' : 'Synthèse à compléter'
  let trend = null
  let subMetrics = []

  if (isHydrating) {
    tone = 'neutral'
    trend = null
    subMetrics = []
  } else if (revReel > 0) {
    const situation = getNexoraOfficialSituation({ revReel, solde, tauxCh, variablesPct })
    tone = situation.state
    context = situation.label
    trend = `Charges ${tauxCh}% · Variables ${variablesPct}%`

    subMetrics = [
      { label: 'Taux d\'épargne', value: fmtPct(savingsRate) }
    ]
  } else if (hasBudgetData) {
    context = 'Synthèse à compléter'
  }

  const isActionable = !isHydrating && revReel > 0
  const heroCard = createHeroCard({
    amount: isHydrating || revReel === 0 ? '—' : fmt(solde),
    label: 'Argent restant ce mois-ci',
    context,
    trend,
    subMetrics,
    tone,
    actionLabel: isHydrating ? 'Chargement…' : isActionable ? 'Voir le plan' : 'Saisir le mois',
    onAction: () => {
      if (typeof options.onAction === 'function') {
        options.onAction(isHydrating ? 'dashboard' : isActionable ? 'plan' : 'saisie')
      } else if (typeof windowRef !== 'undefined' && typeof windowRef.showSection === 'function') {
        windowRef.showSection(isHydrating ? 'dashboard' : isActionable ? 'plan' : 'saisie')
      }
    },
    ariaLabel: 'Solde du mois'
  }, documentRef)

  root.innerHTML = ''
  const decision = buildNorthStarDecision(metrics)
  renderNorthStarPriority(root, metrics, documentRef, windowRef)
  bindNorthStarJarvis(root, decision, documentRef, windowRef)
  renderNorthStarPanel(root, metrics, documentRef)
  root.appendChild(heroCard)
}

export default renderDashboardHero
