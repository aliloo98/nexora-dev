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
export async function renderNorthStarDebts(rootId, metrics = {}, options = {}) {
  const documentRef = options.documentRef || document
  const windowRef = options.windowRef || (typeof window !== 'undefined' ? window : undefined)
  const root = documentRef.getElementById(rootId)
  if (!root) return

  // Fetch real debts data
  let debtsData = []
  try {
    const { readDebts } = await import('../../plan/planDataBuilder.js')
    debtsData = await readDebts()
  } catch (err) {
    console.error('Failed to load individual debts', err)
  }

  // Remove existing debts component
  const existing = root.querySelector('.north-star-debts')
  if (existing) existing.remove()

  // Compact debt display
  const debtsComponent = documentRef.createElement('div')
  debtsComponent.className = 'north-star-debts'

  if (!debtsData || debtsData.length === 0) {
    debtsComponent.innerHTML = `
      <span class="north-star-debts__message">Aucun engagement</span>
    `
  } else {
    const items = debtsData.map(debt => `
      <div class="north-star-debts__item">
        <div class="north-star-debts__name">${escapeHtml(debt.name || 'Dette')}</div>
        <div class="north-star-debts__details">
          <span class="north-star-debts__remaining">${formatEuro(debt.remaining)} restants</span>
          <span class="north-star-debts__monthly-pay">${formatEuro(debt.monthly)}/mois</span>
        </div>
      </div>
    `).join('')

    debtsComponent.innerHTML = `
      <div class="north-star-debts__list">
        ${items}
      </div>
    `
  }

  root.appendChild(debtsComponent)
  return debtsComponent
}

function escapeHtml(str) {
  return String(str || '').replace(/[&<>'"]/g, match => {
    const escape = { '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }
    return escape[match]
  })
}

export default renderNorthStarDebts