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
 * Render the North Star Debts component - COMPACT VERSION
 * Shows debt summary with minimal footprint
 */
export function renderNorthStarDebts(rootId, metrics = {}, options = {}) {
  const documentRef = options.documentRef || document
  const windowRef = options.windowRef || (typeof window !== 'undefined' ? window : undefined)
  const root = documentRef.getElementById(rootId)
  if (!root) return

  const debtSummary = metrics.debtSummary || { total: 0, monthly: 0 }
  const totalDebt = toFiniteNumber(debtSummary.total)
  const monthlyPayment = toFiniteNumber(debtSummary.monthly)

  // Remove existing debts component
  const existing = root.querySelector('.north-star-debts')
  if (existing) existing.remove()

  // Compact debt display
  const debts = documentRef.createElement('div')
  debts.className = 'north-star-debts'

  if (totalDebt === 0) {
    debts.innerHTML = `
      <span class="north-star-debts__message">Aucune dette enregistrée</span>
    `
  } else {
    debts.innerHTML = `
      <div class="north-star-debts__summary">
        <span class="north-star-debts__total">${formatEuro(totalDebt)}</span>
        <span class="north-star-debts__monthly">${formatEuro(monthlyPayment)}/mois</span>
      </div>
    `
  }

  root.appendChild(debts)
  return debts
}

export default renderNorthStarDebts