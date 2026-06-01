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
  const toPayNow = (await TreasuryService.suggestPayments({ baseBalance, revenues: [], charges: [], fromDate: new Date(), days: 30 })).toPayNow || []
  summaryEl.innerHTML = `<div style="display:flex;justify-content:space-between"><div><strong>Solde prévu</strong><div style="font-size:18px">${endingBalance} €</div></div><div><strong>À payer maintenant</strong><div style="font-size:14px">${toPayNow.length} éléments</div></div></div>`

  const timelineEl = root.querySelector('#tp-timeline')
  timelineEl.innerHTML = ''
  const list = document.createElement('div')
  list.className = 'treasury-timeline'
  timeline.forEach(item => {
    const row = document.createElement('div')
    row.className = 'treasury-row'
    row.innerHTML = `<div class="t-date">${item.date}</div><div class="t-title">${item.title}</div><div class="t-amount">${item.amount>0?'+':''}${item.amount}€</div><div class="t-balance">${item.balance}€</div>`
    list.appendChild(row)
  })
  timelineEl.appendChild(list)
}

export default renderTreasuryPlanner
