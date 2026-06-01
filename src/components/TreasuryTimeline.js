/**
 * Simple DOM renderer for treasury timeline (mobile-first minimal)
 */
export function renderTreasuryTimeline(containerId, timeline = []) {
  const container = (typeof document !== 'undefined') ? document.getElementById(containerId) : null
  if (!container) return
  container.innerHTML = ''
  const list = document.createElement('div')
  list.className = 'treasury-timeline'
  timeline.forEach(item => {
    const row = document.createElement('div')
    row.className = 'treasury-row'
    const priority = item.priority || item.priority === 0 ? item.priority : (item.priority === undefined ? 'standard' : item.priority)
    const badge = `<span class="t-badge">${priority}</span>`
    const amount = (typeof item.amount === 'number' && Number.isFinite(item.amount)) ? item.amount : 0
    const balance = (typeof item.balance === 'number' && Number.isFinite(item.balance)) ? item.balance : 0
    const dateLabel = item.date || (item.dateEstimated ? `${item.date} (date estimée)` : 'date inconnue')
    row.innerHTML = `<div class="t-date">${dateLabel}</div><div class="t-title">${item.title || 'Événement'} ${badge}</div><div class="t-amount">${amount>0?'+':''}${amount}€</div><div class="t-balance">${balance}€</div>`
    list.appendChild(row)
  })
  container.appendChild(list)
}

export default renderTreasuryTimeline
