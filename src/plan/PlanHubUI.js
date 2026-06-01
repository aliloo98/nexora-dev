import TreasuryService from '../treasury/treasuryService.js'
import TreasuryAdapter from '../treasury/treasuryAdapter.js'
import { SettingsService } from '../settings/settingsService.js'
import { renderTreasuryTimeline } from '../components/TreasuryTimeline.js'

const formatCurrency = (value) => {
  const amount = Number(value) || 0
  return `${amount.toLocaleString('fr-FR')} €`
}

const buildEmptyState = () => `
  <div class="empty-state plan-empty-state">
    <p>Plan financier vide</p>
    <p>Ajoute tes revenus et charges pour générer un plan de trésorerie.</p>
    <button class="btn btn-gold" type="button" onclick="showSection('saisie')">Mettre à jour le budget</button>
  </div>
`

const buildPlanRows = (items, options = {}) => {
  const {
    emptyLabel = 'Aucun mouvement prévu',
    positive = false,
    limit = 4
  } = options

  const visibleItems = items.slice(0, limit)
  if (!visibleItems.length) {
    return `<div class="plan-empty-line">${emptyLabel}</div>`
  }

  return visibleItems.map((item) => {
    const amount = Math.abs(Number(item.amount) || 0)
    return `
      <div class="plan-row">
        <div>
          <strong>${item.title || (positive ? 'Revenu' : 'Charge')}</strong>
          <span>${item.date || item.priority || 'date estimée'}</span>
        </div>
        <em class="${positive ? 'positive' : 'negative'}">${positive ? '+' : '-'}${formatCurrency(amount)}</em>
      </div>
    `
  }).join('')
}

const buildPlanContent = (data) => {
  const { timeline, endingBalance, baseBalance, totalRevenue, totalCharges, toPayNow } = data

  if (!timeline || timeline.length === 0) {
    return buildEmptyState()
  }

  const minBalance = timeline.reduce((min, item) => Math.min(min, Number(item.balance) || 0), baseBalance)
  const upcomingCharges = timeline.filter((item) => item.amount < 0)
  const upcomingRevenues = timeline.filter((item) => item.amount > 0)
  const netFlow = totalRevenue - totalCharges

  const getRiskClass = (bal) => bal < 0 ? 'danger' : bal < 500 ? 'warning' : 'success'

  return `
    <div class="plan-hub-grid">
      <section class="plan-card plan-balance-card">
        <div class="plan-card-header">
          <h3>Projected Balance</h3>
          <span class="plan-status-pill ${getRiskClass(endingBalance)}">${endingBalance >= 0 ? 'Positif' : 'Risque'}</span>
        </div>
        <strong class="plan-balance-value ${getRiskClass(endingBalance)}">${formatCurrency(endingBalance)}</strong>
        <div class="plan-metric-row">
          <div><span class="metric-label">Solde actuel</span><strong>${formatCurrency(baseBalance)}</strong></div>
          <div><span class="metric-label">Solde minimum</span><strong>${formatCurrency(minBalance)}</strong></div>
          <div><span class="metric-label">Revenus</span><strong>${formatCurrency(totalRevenue)}</strong></div>
          <div><span class="metric-label">Flux net</span><strong class="${netFlow >= 0 ? 'positive' : 'negative'}">${formatCurrency(netFlow)}</strong></div>
        </div>
      </section>

      <section class="plan-card">
        <div class="plan-card-header"><h3>Pay Now</h3></div>
        ${buildPlanRows(toPayNow, { emptyLabel: 'Aucune charge urgente détectée', limit: 3 })}
      </section>

      <section class="plan-card">
        <div class="plan-card-header"><h3>This Week</h3></div>
        ${buildPlanRows(upcomingCharges, { emptyLabel: 'Aucune charge cette semaine', limit: 4 })}
      </section>

      <section class="plan-card">
        <div class="plan-card-header"><h3>Upcoming Income</h3></div>
        ${buildPlanRows(upcomingRevenues, { emptyLabel: 'Aucun revenu prévu', positive: true, limit: 4 })}
      </section>

      <section class="plan-card plan-timeline-card">
        <div class="plan-card-header"><h3>Timeline</h3></div>
        <div id="plan-timeline-root" class="plan-timeline-root"></div>
      </section>
    </div>
  `
}

const buildPlanData = async () => {
  const monthKey = new Date().toISOString().slice(0, 7)
  const baseBalance = window.MonthlyBudgetStateService?.getCurrentBalance?.() || 0
  const [recurringIncomes, billSchedules] = await Promise.all([
    SettingsService.loadRecurringIncomes(),
    SettingsService.loadBillSchedules()
  ])

  const { revenues: fetchedRevenues, charges: fetchedCharges } = await TreasuryAdapter.fetchCurrentMonthBudget(monthKey)

  const revenues = [
    ...(fetchedRevenues || []),
    ...(recurringIncomes || []).map((income) => ({
      title: income.name || 'Revenu récurrent',
      amount: Number(income.amount) || 0,
      frequency: income.frequency || 'monthly',
      day: Number(income.day) || 1
    }))
  ]

  const charges = [
    ...(fetchedCharges || []),
    ...(billSchedules || []).map((bill) => ({
      title: bill.name || 'Charge',
      amount: Number(bill.amount) || 0,
      date: bill.date || 1,
      priority: bill.priority || 'standard'
    }))
  ]

  const { timeline, endingBalance } = TreasuryService.buildTimeline({
    baseBalance,
    revenues,
    charges,
    fromDate: new Date(),
    days: 30
  })

  const totalRevenue = revenues.reduce((sum, item) => sum + (Number(item.amount) || 0), 0)
  const totalCharges = charges.reduce((sum, item) => sum + (Number(item.amount) || 0), 0)
  const { toPayNow } = TreasuryService.suggestPayments({
    baseBalance,
    revenues,
    charges,
    fromDate: new Date(),
    days: 30
  })

  return { timeline, endingBalance, baseBalance, totalRevenue, totalCharges, toPayNow }
}

export async function renderPlanHub(rootId) {
  const root = document.getElementById(rootId)
  if (!root) return

  root.innerHTML = '<div style="padding:20px;text-align:center;color:var(--text2);">Chargement du plan...</div>'

  try {
    const planData = await buildPlanData()
    root.innerHTML = buildPlanContent(planData)
    renderTreasuryTimeline('plan-timeline-root', planData.timeline)
  } catch (error) {
    console.warn('[PlanHub] render failed', error)
    root.innerHTML = buildEmptyState()
  }
}

export async function updatePlanHub(rootId = 'plan-root') {
  await renderPlanHub(rootId)
}

export default { renderPlanHub, updatePlanHub }
