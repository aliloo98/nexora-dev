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
 * Render the North Star Goals component - COMPACT VERSION
 * Shows all goals with minimal footprint, no duplication
 */
export async function renderNorthStarGoals(rootId, metrics = {}, options = {}) {
  const documentRef = options.documentRef || document
  const windowRef = options.windowRef || (typeof window !== 'undefined' ? window : undefined)
  const root = documentRef.getElementById(rootId)
  if (!root) return

  // Get goals data
  const goals = await GoalsService.listUserFacingGoals()
  const monthlyContribution = toFiniteNumber(metrics.solde || metrics.projectedBalance || 0)

  if (!goals || goals.length === 0) {
    // Show compact empty state
    const emptyState = documentRef.createElement('div')
    emptyState.className = 'north-star-goals north-star-goals--empty'
    emptyState.innerHTML = `
      <span class="north-star-goals__message">Aucun objectif défini</span>
    `
    root.replaceChildren(emptyState)
    return emptyState
  }

  // Show all goals compactly
  const goalsComponent = documentRef.createElement('div')
  goalsComponent.className = 'north-star-goals'

  goals.forEach((goal, index) => {
    const goalMetrics = calculateGoalMetrics(goal, {
      asOf: new Date(),
      monthlyContribution
    })

    const progressWidth = Math.min(100, Math.max(0, goalMetrics.progress))

    const goalItem = documentRef.createElement('div')
    goalItem.className = 'north-star-goals__item'
    goalItem.innerHTML = `
      <div class="north-star-goals__name">${goal.icon || '🎯'} ${goal.name || 'Objectif'}</div>
      <div class="north-star-goals__progress-line">
        <span class="north-star-goals__amount">${formatEuro(goalMetrics.current)} / ${formatEuro(goalMetrics.target)}</span>
        <span class="north-star-goals__pct">${formatPercent(goalMetrics.progress)}</span>
      </div>
      <div class="north-star-goals__bar">
        <div class="north-star-goals__fill" style="width: ${progressWidth}%"></div>
      </div>
    `
    goalsComponent.appendChild(goalItem)
  })

  root.replaceChildren(goalsComponent)
  return goalsComponent
}

export default renderNorthStarGoals