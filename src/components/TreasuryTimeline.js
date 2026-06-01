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
    const badge = item.priority ? `<span class="t-badge">${item.priority}</span>` : ''
    row.innerHTML = `<div class="t-date">${item.date}</div><div class="t-title">${item.title} ${badge}</div><div class="t-amount">${item.amount>0?'+':''}${item.amount}€</div><div class="t-balance">${item.balance}€</div>`
    list.appendChild(row)
  })
  container.appendChild(list)
}

export default renderTreasuryTimeline
