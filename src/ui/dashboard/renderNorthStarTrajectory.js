const toFiniteNumber = (value, fallback = 0) => {
  const number = Number(value)
  return Number.isFinite(number) ? number : fallback
}

const formatEuro = (value) => {
  const amount = toFiniteNumber(value)
  const fractionDigits = Number.isInteger(amount) ? 0 : 2
  return `${amount.toLocaleString('fr-FR', { minimumFractionDigits: fractionDigits, maximumFractionDigits: fractionDigits })} €`
}

const formatDate = (date) => {
  if (!date) return '—'
  const d = date instanceof Date ? date : new Date(date)
  if (isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
}

const getDaysUntil = (date) => {
  if (!date) return null
  const d = date instanceof Date ? date : new Date(date)
  if (isNaN(d.getTime())) return null
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  d.setHours(0, 0, 0, 0)
  const diff = Math.ceil((d - today) / (1000 * 60 * 60 * 24))
  return diff
}

/**
 * Build trajectory events from available financial data
 * Only uses real data that exists - never fabricates events
 */
function buildTrajectoryEvents(metrics = {}) {
  const events = []
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const currentBalance = toFiniteNumber(metrics.soldeEstime || metrics.currentBalance)
  const projectedBalance = toFiniteNumber(metrics.solde || metrics.projectedBalance)
  const remainingExpenses = toFiniteNumber(metrics.totalDepRestant || metrics.remainingExpenses)
  const income = toFiniteNumber(metrics.revReel || metrics.income)

  // 1. Today's position
  events.push({
    type: 'today',
    date: today,
    label: "Aujourd'hui",
    amount: currentBalance,
    context: 'Solde actuel',
    isCurrent: true
  })

  // 2. Next significant expense (if data available)
  if (remainingExpenses > 0 && metrics.nextExpenseDate) {
    const nextExpenseDate = new Date(metrics.nextExpenseDate)
    if (!isNaN(nextExpenseDate.getTime()) && nextExpenseDate > today) {
      const daysUntil = getDaysUntil(nextExpenseDate)
      if (daysUntil !== null && daysUntil <= 30) {
        events.push({
          type: 'expense',
          date: nextExpenseDate,
          label: 'Prochaine dépense',
          amount: -Math.min(remainingExpenses, toFiniteNumber(metrics.nextExpenseAmount || remainingExpenses)),
          context: daysUntil === 1 ? 'Demain' : daysUntil === 0 ? "Aujourd'hui" : `Dans ${daysUntil} jours`,
          isRisk: currentBalance - remainingExpenses < 0
        })
      }
    }
  }

  // 3. Next income (if data available)
  if (metrics.nextIncomeDate && income > 0) {
    const nextIncomeDate = new Date(metrics.nextIncomeDate)
    if (!isNaN(nextIncomeDate.getTime()) && nextIncomeDate > today) {
      const daysUntil = getDaysUntil(nextIncomeDate)
      if (daysUntil !== null && daysUntil <= 30) {
        events.push({
          type: 'income',
          date: nextIncomeDate,
          label: 'Prochaine rentrée',
          amount: toFiniteNumber(metrics.nextIncomeAmount || income),
          context: daysUntil === 1 ? 'Demain' : daysUntil === 0 ? "Aujourd'hui" : `Dans ${daysUntil} jours`
        })
      }
    }
  }

  // 4. End of cycle projection
  if (metrics.cycleEndDate) {
    const cycleEndDate = new Date(metrics.cycleEndDate)
    if (!isNaN(cycleEndDate.getTime()) && cycleEndDate > today) {
      const daysUntil = getDaysUntil(cycleEndDate)
      events.push({
        type: 'cycle_end',
        date: cycleEndDate,
        label: 'Fin de cycle',
        amount: projectedBalance,
        context: daysUntil === 1 ? 'Demain' : daysUntil === 0 ? "Aujourd'hui" : `Dans ${daysUntil} jours`,
        isRisk: projectedBalance < 0
      })
    }
  }

  // Sort events by date
  events.sort((a, b) => a.date - b.date)

  // Limit to 4-6 events max
  return events.slice(0, 6)
}

/**
 * Render the North Star Trajectory component
 * Shows financial timeline with real events only
 */
export function renderNorthStarTrajectory(rootId, metrics = {}, options = {}) {
  const documentRef = options.documentRef || document
  const windowRef = options.windowRef || (typeof window !== 'undefined' ? window : undefined)
  const root = documentRef.getElementById(rootId)
  if (!root) return

  const events = buildTrajectoryEvents(metrics)
  const hasData = events.length > 1

  // Remove existing trajectory
  const existing = root.querySelector('.north-star-trajectory')
  if (existing) existing.remove()

  if (!hasData) {
    // Show limited state if insufficient data
    const limitedState = documentRef.createElement('section')
    limitedState.className = 'north-star-trajectory north-star-trajectory--limited'
    limitedState.setAttribute('aria-label', 'Trajectoire financière')
    limitedState.innerHTML = `
      <div class="north-star-trajectory__header">
        <span class="north-star-trajectory__eyebrow">Trajectoire</span>
        <span class="north-star-trajectory__status">Données limitées</span>
      </div>
      <p class="north-star-trajectory__message">Complétez votre budget pour obtenir une projection fiable.</p>
    `
    root.appendChild(limitedState)
    return
  }

  // Build timeline HTML
  const timelineEvents = events.map((event, index) => {
    const isRisk = event.isRisk === true
    const amountClass = event.amount >= 0 ? 'positive' : 'negative'
    const amountSign = event.amount >= 0 ? '+' : ''
    
    return `
      <div class="north-star-trajectory__item ${event.isCurrent ? 'is-current' : ''} ${isRisk ? 'is-risk' : ''}">
        <div class="north-star-trajectory__date">
          <strong>${formatDate(event.date)}</strong>
          <span>${event.context}</span>
        </div>
        <div class="north-star-trajectory__marker"></div>
        <div class="north-star-trajectory__event">
          <strong>${event.label}</strong>
          <span class="${amountClass}">${amountSign}${formatEuro(event.amount)}</span>
          ${isRisk ? '<em class="risk-indicator">⚠ Point de tension</em>' : ''}
        </div>
      </div>
    `
  }).join('')

  const trajectory = documentRef.createElement('section')
  trajectory.className = 'north-star-trajectory'
  trajectory.setAttribute('aria-label', 'Trajectoire financière')
  trajectory.innerHTML = `
    <div class="north-star-trajectory__header">
      <span class="north-star-trajectory__eyebrow">Trajectoire</span>
      <span class="north-star-trajectory__count">${events.length} événements</span>
    </div>
    <div class="north-star-trajectory__timeline">
      ${timelineEvents}
    </div>
  `

  root.appendChild(trajectory)
  return trajectory
}

export default renderNorthStarTrajectory