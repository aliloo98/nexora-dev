const toFiniteNumber = (value, fallback = 0) => {
  const number = Number(value)
  return Number.isFinite(number) ? number : fallback
}

const formatEuro = (value) => {
  const amount = toFiniteNumber(value)
  const fractionDigits = Number.isInteger(amount) ? 0 : 2
  return `${amount.toLocaleString('fr-FR', { minimumFractionDigits: fractionDigits, maximumFractionDigits: fractionDigits })} €`
}

/**
 * Render the North Star Debts component
 * Shows debt summary with actionable insights
 */
export function renderNorthStarDebts(rootId, metrics = {}, options = {}) {
  const documentRef = options.documentRef || document
  const windowRef = options.windowRef || (typeof window !== 'undefined' ? window : undefined)
  const root = documentRef.getElementById(rootId)
  if (!root) return

  const debtSummary = metrics.debtSummary || { total: 0, monthly: 0 }
  const totalDebt = toFiniteNumber(debtSummary.total)
  const monthlyPayment = toFiniteNumber(debtSummary.monthly)
  const income = toFiniteNumber(metrics.revReel || metrics.income)

  // Remove existing debts component
  const existing = root.querySelector('.north-star-debts')
  if (existing) existing.remove()

  // Determine debt health
  let debtHealth = 'none'
  let debtMessage = 'Aucune dette enregistrée'
  let debtTone = 'positive'

  if (totalDebt > 0) {
    const debtToIncomeRatio = income > 0 ? (monthlyPayment / income) * 100 : 0
    
    if (debtToIncomeRatio > 40) {
      debtHealth = 'critical'
      debtMessage = `Taux d'endettement élevé (${Math.round(debtToIncomeRatio)}% des revenus)`
      debtTone = 'danger'
    } else if (debtToIncomeRatio > 25) {
      debtHealth = 'warning'
      debtMessage = `Taux d'endettement modéré (${Math.round(debtToIncomeRatio)}% des revenus)`
      debtTone = 'warning'
    } else {
      debtHealth = 'healthy'
      debtMessage = 'Endettement maîtrisé'
      debtTone = 'positive'
    }
  }

  const debts = documentRef.createElement('section')
  debts.className = `north-star-debts north-star-debts--${debtTone}`
  debts.setAttribute('aria-label', 'Synthèse des dettes')
  
  if (totalDebt === 0) {
    debts.innerHTML = `
      <div class="north-star-debts__header">
        <span class="north-star-debts__eyebrow">Dettes</span>
        <span class="north-star-debts__status north-star-debts__status--positive">Aucune</span>
      </div>
      <p class="north-star-debts__message">${debtMessage}</p>
    `
  } else {
    debts.innerHTML = `
      <div class="north-star-debts__header">
        <span class="north-star-debts__eyebrow">Dettes</span>
        <span class="north-star-debts__status north-star-debts__status--${debtTone}">${debtHealth === 'critical' ? 'Élevé' : debtHealth === 'warning' ? 'Modéré' : 'Maîtrisé'}</span>
      </div>
      <div class="north-star-debts__grid">
        <article class="north-star-debt-stat">
          <span class="north-star-debt-stat__label">Total</span>
          <strong class="north-star-debt-stat__value">${formatEuro(totalDebt)}</strong>
        </article>
        <article class="north-star-debt-stat">
          <span class="north-star-debt-stat__label">Mensualités</span>
          <strong class="north-star-debt-stat__value">${formatEuro(monthlyPayment)}/mois</strong>
        </article>
      </div>
      <p class="north-star-debts__message">${debtMessage}</p>
      ${debtHealth !== 'healthy' ? `<button type="button" class="north-star-debts__action" data-target-section="dettes">Voir le plan</button>` : ''}
    `
    
    const actionButton = debts.querySelector('.north-star-debts__action')
    if (actionButton && typeof windowRef?.showSection === 'function') {
      actionButton.addEventListener('click', () => windowRef.showSection('dettes'))
    } else if (actionButton) {
      actionButton.disabled = true
    }
  }

  root.appendChild(debts)
  return debts
}

export default renderNorthStarDebts