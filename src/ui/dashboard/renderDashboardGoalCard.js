import { createGoalCard } from '../components/GoalCard.js'

const fmt = (value) => {
  const amount = Number(value) || 0
  const fractionDigits = Number.isInteger(amount) ? 0 : 2
  return `${amount.toLocaleString('fr-FR', { minimumFractionDigits: fractionDigits, maximumFractionDigits: fractionDigits })} €`
}

/**
 * Renders the Dashboard Goal Card using V2 createGoalCard component.
 * @param {string} rootId - The ID of the container element
 * @param {Object} goal - Goal data from GoalsService.getPrimaryGoal()
 * @param {Object} options - Additional options (documentRef, windowRef, monthly)
 */
export function renderDashboardGoalCard(rootId, goal = null, options = {}) {
  const documentRef = options.documentRef || document
  const windowRef = options.windowRef || (typeof window !== 'undefined' ? window : undefined)
  const root = documentRef.getElementById(rootId)
  if (!root) return

  // Handle empty state
  if (!goal) {
    root.innerHTML = ''
    root.classList.add('is-empty')
    
    const createBtn = documentRef.createElement('button')
    createBtn.type = 'button'
    createBtn.className = 'btn btn-gold dashboard-goal-create-btn'
    createBtn.textContent = 'Créer un objectif'
    createBtn.onclick = () => {
      if (typeof windowRef?.showSection === 'function') {
        windowRef.showSection('objectifs')
      }
    }
    root.appendChild(createBtn)
    return
  }

  root.classList.remove('is-empty')

  const current = Number(goal.current) || 0
  const target = Number(goal.target) || 0
  const pct = target > 0 ? Math.min(100, Math.max(0, Math.round(current / target * 100))) : 0
  const remaining = Math.max(0, target - current)
  
  const dateLabel = goal.targetDate
    ? new Date(goal.targetDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
    : 'Non définie'

  const monthly = options.monthly || 0
  const estimatedMonths = options.estimatedMonths
  const forecast = options.forecast

  let estimateLabel = 'Non défini'
  if (forecast?.status === 'reached') {
    estimateLabel = 'Objectif atteint'
  } else if (estimatedMonths) {
    estimateLabel = `${estimatedMonths} mois`
    if (forecast?.monthlyEffort) {
      estimateLabel += ` · ${Math.round(forecast.monthlyEffort).toLocaleString('fr-FR')} €/mois conseillé`
    }
  }

  // Determine status label and tone based on percentage
  let statusLabel = null
  let statusTone = 'neutral'
  if (pct >= 100) {
    statusLabel = 'Atteint'
    statusTone = 'success'
  } else if (pct >= 75) {
    statusLabel = 'Dernière ligne droite'
    statusTone = 'info'
  } else if (pct >= 40) {
    statusLabel = 'Bonne progression'
    statusTone = 'info'
  } else if (pct > 0) {
    statusLabel = 'À lancer'
    statusTone = 'warning'
  }

  const goalCard = createGoalCard({
    eyebrow: 'Objectif principal',
    name: `${goal.icon || '🎯'} ${goal.name || 'Objectif'}`,
    currentAmount: fmt(current),
    targetAmount: fmt(target),
    percentage: pct,
    percentageLabel: `${pct}%`,
    remaining: fmt(remaining),
    deadline: dateLabel,
    statusLabel,
    statusTone,
    progressLabel: 'Progression',
    headingLevel: 3
  }, documentRef)

  root.innerHTML = ''
  root.appendChild(goalCard)

  windowRef?.NexoraMotion?.transitionDashboardProgress?.(root)
}

export default renderDashboardGoalCard
