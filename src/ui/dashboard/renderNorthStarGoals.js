import { GoalsService } from '../../goals/goalsService.js'
import { selectPrimaryGoal, calculateGoalMetrics } from '../../goals/goalMetrics.js'

const toFiniteNumber = (value, fallback = 0) => {
  const number = Number(value)
  return Number.isFinite(number) ? number : fallback
}

const formatEuro = (value) => {
  const amount = toFiniteNumber(value)
  const fractionDigits = Number.isInteger(amount) ? 0 : 2
  return `${amount.toLocaleString('fr-FR', { minimumFractionDigits: fractionDigits, maximumFractionDigits: fractionDigits })} €`
}

const formatPercent = (value) => {
  const pct = toFiniteNumber(value)
  return `${Math.round(pct)}%`
}

/**
 * Render the North Star Goals component
 * Shows primary goal with actionable progress
 */
export async function renderNorthStarGoals(rootId, metrics = {}, options = {}) {
  const documentRef = options.documentRef || document
  const windowRef = options.windowRef || (typeof window !== 'undefined' ? window : undefined)
  const root = documentRef.getElementById(rootId)
  if (!root) return

  // Remove existing goals component
  const existing = root.querySelector('.north-star-goals')
  if (existing) existing.remove()

  // Get goals data
  const goals = await GoalsService.listUserFacingGoals()
  const primaryGoal = selectPrimaryGoal(goals)
  const monthlyContribution = toFiniteNumber(metrics.solde || metrics.projectedBalance || 0)

  if (!primaryGoal) {
    // Show empty state
    const emptyState = documentRef.createElement('section')
    emptyState.className = 'north-star-goals north-star-goals--empty'
    emptyState.setAttribute('aria-label', 'Objectifs financiers')
    emptyState.innerHTML = `
      <div class="north-star-goals__header">
        <span class="north-star-goals__eyebrow">Objectifs</span>
        <span class="north-star-goals__status">Non défini</span>
      </div>
      <p class="north-star-goals__message">Définissez un objectif d'épargne pour suivre votre progression.</p>
      <button type="button" class="north-star-goals__action" data-target-section="objectifs">Créer un objectif</button>
    `
    
    const actionButton = emptyState.querySelector('.north-star-goals__action')
    if (actionButton && typeof windowRef?.showSection === 'function') {
      actionButton.addEventListener('click', () => windowRef.showSection('objectifs'))
    } else if (actionButton) {
      actionButton.disabled = true
    }
    
    root.appendChild(emptyState)
    return emptyState
  }

  // Calculate goal metrics
  const goalMetrics = calculateGoalMetrics(primaryGoal, { 
    asOf: new Date(), 
    monthlyContribution 
  })

  // Determine goal status
  let goalTone = 'positive'
  let goalStatus = 'En cours'
  
  if (goalMetrics.isReached) {
    goalTone = 'positive'
    goalStatus = 'Atteint'
  } else if (goalMetrics.status === 'behind' || goalMetrics.status === 'late') {
    goalTone = 'warning'
    goalStatus = 'En retard'
  } else if (goalMetrics.status === 'ahead') {
    goalTone = 'positive'
    goalStatus = 'En avance'
  }

  const goalsComponent = documentRef.createElement('section')
  goalsComponent.className = `north-star-goals north-star-goals--${goalTone}`
  goalsComponent.setAttribute('aria-label', 'Objectif financier principal')
  
  const progressWidth = Math.min(100, Math.max(0, goalMetrics.progress))
  
  goalsComponent.innerHTML = `
    <div class="north-star-goals__header">
      <span class="north-star-goals__eyebrow">Objectif</span>
      <span class="north-star-goals__status north-star-goals__status--${goalTone}">${goalStatus}</span>
    </div>
    <div class="north-star-goals__content">
      <h3 class="north-star-goals__title">${primaryGoal.name || 'Objectif sans nom'}</h3>
      <div class="north-star-goals__progress">
        <div class="north-star-goals__progress-bar">
          <div class="north-star-goals__progress-fill" style="width: ${progressWidth}%"></div>
        </div>
        <span class="north-star-goals__progress-text">${formatPercent(goalMetrics.progress)}</span>
      </div>
      <div class="north-star-goals__metrics">
        <div class="north-star-goal-metric">
          <span class="north-star-goal-metric__label">Reste</span>
          <strong class="north-star-goal-metric__value">${formatEuro(goalMetrics.remaining)}</strong>
        </div>
        <div class="north-star-goal-metric">
          <span class="north-star-goal-metric__label">Objectif</span>
          <strong class="north-star-goal-metric__value">${formatEuro(goalMetrics.target)}</strong>
        </div>
      </div>
      ${goalMetrics.projectedMonths ? `<p class="north-star-goals__projection">${goalMetrics.projectedMonths} mois restants</p>` : ''}
    </div>
    <button type="button" class="north-star-goals__action" data-target-section="objectifs">Gérer</button>
  `
  
  const actionButton = goalsComponent.querySelector('.north-star-goals__action')
  if (actionButton && typeof windowRef?.showSection === 'function') {
    actionButton.addEventListener('click', () => windowRef.showSection('objectifs'))
  } else if (actionButton) {
    actionButton.disabled = true
  }
  
  root.appendChild(goalsComponent)
  return goalsComponent
}

export default renderNorthStarGoals