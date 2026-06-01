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

const readDebts = () => {
  try {
    const raw = localStorage.getItem('nexora_debts_v1') || '[]'
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

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
  const { timeline = [], endingBalance, baseBalance, totalRevenue, totalCharges, toPayNow, goals = [], debts = [] } = data

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
        <div id="plan-timeline-root" class="plan-timeline-root">
          ${timeline.length ? '' : '<div class="plan-empty-line">Aucun mouvement daté pour ce mois.</div>'}
        </div>
      </section>

      <section class="plan-card">
        <div class="plan-card-header"><h3>Objectifs</h3></div>
        ${goals.length ? goals.slice(0, 3).map((goal) => {
          const current = Number(goal.current) || 0
          const target = Number(goal.target) || 0
          const remaining = Math.max(0, target - current)
          return `
            <div class="plan-row">
              <div>
                <strong>${goal.name || 'Objectif'}</strong>
                <span>${target > 0 ? `${formatCurrency(remaining)} restants` : 'Montant cible non défini'}</span>
              </div>
              <em>${target > 0 ? `${Math.min(100, Math.round(current / target * 100))}%` : '—'}</em>
            </div>
          `
        }).join('') : '<div class="plan-empty-line">Aucun objectif configuré.</div>'}
      </section>

      <section class="plan-card">
        <div class="plan-card-header"><h3>Dettes</h3></div>
        ${debts.length ? debts.slice(0, 3).map((debt) => `
          <div class="plan-row">
            <div>
              <strong>${debt.name || 'Dette'}</strong>
              <span>${Number(debt.monthly) > 0 ? `${formatCurrency(debt.monthly)} / mois` : 'Mensualité non définie'}</span>
            </div>
            <em class="negative">${formatCurrency(debt.remaining || 0)}</em>
          </div>
        `).join('') : '<div class="plan-empty-line">Aucune dette enregistrée.</div>'}
      </section>
    </div>
  `
}

const buildPlanData = async () => {
  const monthKey = typeof window.getMonth === 'function' ? window.getMonth() : new Date().toISOString().slice(0, 7)
  const fromDate = /^\d{4}-\d{2}$/.test(monthKey) ? new Date(`${monthKey}-01T00:00:00`) : new Date()
  const baseBalance = window.MonthlyBudgetStateService?.getCurrentBalance?.() || 0
  const [recurringIncomes, billSchedules, goals] = await Promise.all([
    SettingsService.loadRecurringIncomes(),
    SettingsService.loadBillSchedules(),
    window.GoalsService?.listGoals ? window.GoalsService.listGoals().catch(() => []) : []
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
    fromDate,
    days: 30
  })

  const totalRevenue = revenues.reduce((sum, item) => sum + (Number(item.amount) || 0), 0)
  const totalCharges = charges.reduce((sum, item) => sum + (Number(item.amount) || 0), 0)
  const { toPayNow } = TreasuryService.suggestPayments({
    baseBalance,
    revenues,
    charges,
    fromDate,
    days: 30
  })

  return { timeline, endingBalance, baseBalance, totalRevenue, totalCharges, toPayNow, goals, debts: readDebts() }
}

export async function renderPlanHub(rootId) {
  const root = document.getElementById(rootId)
  if (!root) return

  root.innerHTML = '<div style="padding:20px;text-align:center;color:var(--text2);">Chargement du plan...</div>'

  try {
    const planData = await buildPlanData()
    root.innerHTML = buildPlanContent(planData)
    if (planData.timeline.length) renderTreasuryTimeline('plan-timeline-root', planData.timeline)
  } catch (error) {
    console.warn('[PlanHub] render failed', error)
    root.innerHTML = buildEmptyState()
  }
}

export async function updatePlanHub(rootId = 'plan-root') {
  await renderPlanHub(rootId)
}

export default { renderPlanHub, updatePlanHub }
