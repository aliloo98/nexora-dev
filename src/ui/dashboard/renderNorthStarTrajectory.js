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

const formatMonth = (date) => {
  if (!date) return '—'
  const value = date instanceof Date ? date : new Date(date)
  if (isNaN(value.getTime())) return '—'
  return value.toLocaleDateString('fr-FR', { month: 'long' })
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
export function buildTrajectoryEvents(metrics = {}) {
  const events = []
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const hasValue = (keys) => keys.some((key) => metrics[key] !== undefined && metrics[key] !== null && Number.isFinite(Number(metrics[key])))
  const hasCurrentBalance = hasValue(['soldeEstime', 'currentBalance'])
  const hasProjectedBalance = hasValue(['solde', 'projectedBalance', 'projectedEndOfCycle'])
  const hasRemainingExpenses = hasValue(['totalDepRestant', 'remainingExpenses', 'remainingToSpend'])
  const hasIncome = hasValue(['revReel', 'income', 'totalRevenue'])
  const currentBalance = toFiniteNumber(metrics.soldeEstime ?? metrics.currentBalance)
  const projectedBalance = toFiniteNumber(metrics.solde ?? metrics.projectedBalance ?? metrics.projectedEndOfCycle)
  const remainingExpenses = toFiniteNumber(metrics.totalDepRestant ?? metrics.remainingExpenses ?? metrics.remainingToSpend)
  const income = toFiniteNumber(metrics.revReel ?? metrics.income ?? metrics.totalRevenue)

  if (!hasCurrentBalance && !hasProjectedBalance && !hasRemainingExpenses && !hasIncome) return events

  // 1. Today's position
  if (hasCurrentBalance) {
    events.push({
      type: 'today',
      date: today,
      label: "Aujourd'hui",
      amount: currentBalance,
      context: currentBalance < 0 ? 'Situation à surveiller.' : 'Situation maîtrisée.',
      isCurrent: true,
      displaySign: true
    })
  }

  // 2. Next significant expense (if data available)
  if (hasRemainingExpenses && remainingExpenses > 0 && metrics.nextExpenseDate) {
    const nextExpenseDate = new Date(metrics.nextExpenseDate)
    if (!isNaN(nextExpenseDate.getTime()) && nextExpenseDate > today) {
      const daysUntil = getDaysUntil(nextExpenseDate)
      if (daysUntil !== null && daysUntil <= 30) {
        events.push({
          type: 'expense',
          date: nextExpenseDate,
          label: 'Prochaine dépense',
          amount: -Math.min(remainingExpenses, toFiniteNumber(metrics.nextExpenseAmount || remainingExpenses)),
          context: daysUntil === 1 ? 'Demain' : `Dans ${daysUntil} jours`,
          explanation: 'Charge identifiée à venir.',
          isRisk: currentBalance - remainingExpenses < 0,
          displaySign: true
        })
      }
    }
  }

  // 3. Next income (if data available)
  if (metrics.nextIncomeDate && hasIncome && income > 0) {
    const nextIncomeDate = new Date(metrics.nextIncomeDate)
    if (!isNaN(nextIncomeDate.getTime()) && nextIncomeDate > today) {
      const daysUntil = getDaysUntil(nextIncomeDate)
      if (daysUntil !== null && daysUntil <= 30) {
        events.push({
          type: 'income',
          date: nextIncomeDate,
          label: 'Prochaine rentrée',
          amount: toFiniteNumber(metrics.nextIncomeAmount || income),
          context: daysUntil === 1 ? 'Demain' : `Dans ${daysUntil} jours`,
          explanation: 'Revenu planifié.',
          displaySign: true
        })
      }
    }
  }

  if (hasRemainingExpenses && remainingExpenses > 0 && !events.some((event) => event.type === 'expense')) {
    events.push({
      type: 'upcoming',
      date: new Date(today),
      label: 'À venir',
      amount: remainingExpenses,
      secondaryAmount: hasIncome && income > 0 ? income : null,
      secondaryLabel: hasIncome && income > 0 ? 'Revenus du cycle' : null,
      context: 'Charges restantes',
      explanation: `${formatEuro(remainingExpenses)} restent à couvrir avant la fin du cycle.`,
      isRisk: hasCurrentBalance && currentBalance - remainingExpenses < 0
    })
  }

  // 4. End of cycle projection (if date available)
  if (hasProjectedBalance && metrics.cycleEndDate) {
    const cycleEndDate = new Date(metrics.cycleEndDate)
    if (!isNaN(cycleEndDate.getTime()) && cycleEndDate > today) {
      const daysUntil = getDaysUntil(cycleEndDate)
      events.push({
        type: 'cycle_end',
        date: cycleEndDate,
        label: 'Fin de cycle',
        amount: projectedBalance,
        context: projectedBalance < 0 ? 'Risque de découvert.' : 'Mois terminé dans le positif.',
        isRisk: projectedBalance < 0,
        displaySign: true
      })
    }
  } else if (hasProjectedBalance) {
    // 4b. Projection without explicit date - still show the conclusion
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0)
    events.push({
      type: 'cycle_end',
      date: endOfMonth,
      label: 'Fin de cycle',
      amount: projectedBalance,
      context: projectedBalance < 0 ? 'Risque de découvert.' : 'Mois terminé dans le positif.',
      explanation: 'Projection estimée à partir des données du cycle.',
      isRisk: projectedBalance < 0,
      displaySign: true
    })
  }

  return events
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
  const hasData = events.length > 0 && events.some((event) => event.type === 'cycle_end' || event.type === 'upcoming')

  // Remove existing trajectory
  const existing = root.querySelector('.north-star-trajectory')
  if (existing) existing.remove()

  if (!hasData) {
    // Show compact limited state if insufficient data
    const limitedState = documentRef.createElement('div')
    limitedState.className = 'north-star-trajectory north-star-trajectory--limited'
    limitedState.innerHTML = `
      <div class="north-star-trajectory__compact">
        <span class="north-star-trajectory__label">COMMENT VA FINIR MON MOIS ?</span>
        <strong class="north-star-trajectory__limited-title">Analyse partielle</strong>
        <span class="north-star-trajectory__status">Complète ton budget pour obtenir une projection fiable.</span>
      </div>
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
        <div class="north-star-trajectory__marker"></div>
        <div class="north-star-trajectory__content">
          <div class="north-star-trajectory__meta">
            <span class="north-star-trajectory__label-text">${event.label}</span>
            <strong class="north-star-trajectory__date">${event.type === 'upcoming' ? formatMonth(event.date) : formatDate(event.date)}</strong>
            <div class="north-star-trajectory__line" aria-hidden="true"></div>
          </div>
          <div class="north-star-trajectory__summary">
            <div class="north-star-trajectory__labels">
              <strong class="north-star-trajectory__event-title">${event.type === 'today' ? 'Solde actuel' : event.type === 'upcoming' ? event.context : 'Projection'}</strong>
              <span class="north-star-trajectory__context-text">${event.explanation || event.context}</span>
            </div>
            <strong class="north-star-trajectory__amount ${amountClass}">${event.displaySign && event.amount >= 0 ? '+' : ''}${formatEuro(event.amount)}</strong>
          </div>
          ${event.secondaryAmount !== null && event.secondaryAmount !== undefined ? `<span class="north-star-trajectory__secondary">${formatEuro(event.secondaryAmount)} ${event.secondaryLabel}</span>` : ''}
        </div>
      </div>
    `
  }).join('')

  const trajectory = documentRef.createElement('div')
  trajectory.className = 'north-star-trajectory'
  trajectory.innerHTML = `
    <div class="north-star-trajectory__header">
      <span class="north-star-trajectory__title">COMMENT VA FINIR MON MOIS ?</span>
      <span class="north-star-trajectory__status">${events.some((event) => event.isRisk) ? 'À surveiller' : 'Projection positive'}</span>
    </div>
    <div class="north-star-trajectory__timeline">
      ${timelineEvents}
    </div>
  `

  root.appendChild(trajectory)
  return trajectory
}

export default renderNorthStarTrajectory