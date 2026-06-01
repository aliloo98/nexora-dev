import TreasuryService from '../treasury/treasuryService.js'

export async function renderTreasuryPlanner(rootId, options = {}) {
  const root = document.getElementById(rootId)
  if (!root) return
  root.classList.add('dash-mini-card', 'fade-in')
  root.innerHTML = `<div style="display:flex;flex-direction:column;gap:8px"><div style="display:flex;justify-content:space-between;align-items:center"><strong>Planificateur de trésorerie</strong><button id="tp-close" class="btn btn-outline">Fermer</button></div><div id="tp-summary"></div><div id="tp-timeline"></div></div>`

  root.querySelector('#tp-close').addEventListener('click', () => { root.innerHTML = '' })

  const monthKey = options.monthKey || (new Date().toISOString().slice(0,7))
  const baseBalance = (window?.MonthlyBudgetStateService?.getCurrentBalance && typeof window.MonthlyBudgetStateService.getCurrentBalance === 'function') ? window.MonthlyBudgetStateService.getCurrentBalance() : 0

  const { timeline, endingBalance } = await TreasuryService.buildTimelineFromCurrentMonth({ monthKey, baseBalance, fromDate: new Date(), days: 30 })

  const summaryEl = root.querySelector('#tp-summary')
  // derive toPayNow from charges present in the timeline
  const chargesFromTimeline = (timeline || []).filter(t => t.amount < 0).map(t => ({ amount: Math.abs(t.amount), date: t.date, title: t.title, priority: t.priority || 'standard' }))
  const toPayNow = (await TreasuryService.suggestPayments({ baseBalance, revenues: [], charges: chargesFromTimeline, fromDate: new Date(), days: 30 })).toPayNow || []
  summaryEl.innerHTML = `<div style="display:flex;justify-content:space-between"><div><strong>Solde prévu</strong><div style="font-size:18px">${endingBalance} €</div></div><div><strong>À payer maintenant</strong><div style="font-size:14px">${toPayNow.length} éléments</div></div></div>`

  const timelineEl = root.querySelector('#tp-timeline')
  timelineEl.innerHTML = ''
  if (!timeline || timeline.length === 0) {
    timelineEl.innerHTML = '<div style="padding:12px;color:var(--text2)"><strong>Pas d’événements prévisionnels</strong><div>Ajoutez vos revenus et dépenses pour générer un plan.</div></div>'
    return
  }

  const list = document.createElement('div')
  list.className = 'treasury-timeline'
  timeline.forEach(item => {
    const row = document.createElement('div')
    row.className = 'treasury-row'
    const priority = item.priority || 'standard'
    const amount = (typeof item.amount === 'number' && Number.isFinite(item.amount)) ? item.amount : 0
    const balance = (typeof item.balance === 'number' && Number.isFinite(item.balance)) ? item.balance : 0
    const dateLabel = item.date || (item.dateEstimated ? `${item.date || ''} (date estimée)` : 'date inconnue')
    row.innerHTML = `<div class="t-date">${dateLabel}</div><div class="t-title">${item.title || 'Événement'} <span class="t-badge">${priority}</span></div><div class="t-amount">${amount>0?'+':''}${amount}€</div><div class="t-balance">${balance}€</div>`
    list.appendChild(row)
  })
  timelineEl.appendChild(list)
}

export default renderTreasuryPlanner
