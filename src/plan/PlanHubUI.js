import TreasuryService from '../treasury/treasuryService.js'
import TreasuryAdapter from '../treasury/treasuryAdapter.js'
import { SettingsService } from '../settings/settingsService.js'
import { renderTreasuryTimeline } from '../components/TreasuryTimeline.js'

const formatCurrency = (value) => {
  const amount = Number(value) || 0
  return `${amount.toLocaleString('fr-FR')} €`
}

const priorityBadge = (priority) => {
  if (!priority) return 'Standard'
  if (priority === 'critique') return 'Critique'
  if (priority === 'importante') return 'Importante'
  return 'Standard'
}

const getRiskLevel = (balance, minBalance) => {
  if (minBalance < 0) return { text: 'Haut risque', tone: 'danger' }
  if (balance < 500) return { text: 'Risque moyen', tone: 'warning' }
  return { text: 'Stable', tone: 'success' }
}

const extractRowCount = (timeline, isExpense) => timeline.filter((item) => (isExpense ? item.amount < 0 : item.amount > 0)).length

const buildEventItems = (events) => {
  if (!events || events.length === 0) {
    return '<div class="empty-state">Aucun événement prévisionnel trouvé.</div>'
  }
  return events.map((item) => `
    <div class="plan-event-row">
      <div>
        <strong>${item.title || 'Événement'}</strong>
        <div style="font-size:12px;color:var(--text2);margin-top:4px">${item.date || 'Date estimée'}</div>
      </div>
      <div style="text-align:right">
        <div>${item.amount > 0 ? '+' : ''}${Math.abs(item.amount).toLocaleString('fr-FR')} €</div>
        <div style="font-size:12px;color:var(--text2)">${priorityBadge(item.priority)}</div>
      </div>
    </div>
  `).join('')
}

const buildPlanContent = ({
  timeline,
  endingBalance,
  baseBalance,
  totalRevenue,
  totalCharges,
  toPayNow,
  upcomingExpenses,
  upcomingRevenues,
  minBalance
}) => {
  const risk = getRiskLevel(endingBalance, minBalance)
  return `
    <div class="plan-hub-grid">
      <div class="plan-card plan-summary-card">
        <div class="plan-card-header">
          <h3>Vue d’ensemble</h3>
          <button class="btn btn-outline" type="button" onclick="window.refreshPlanHub()">Rafraîchir</button>
        </div>
        <div class="plan-metric-row">
          <div>
            <span class="metric-label">Solde actuel</span>
            <strong>${formatCurrency(baseBalance)}</strong>
          </div>
          <div>
            <span class="metric-label">Solde projeté</span>
            <strong>${formatCurrency(endingBalance)}</strong>
          </div>
        </div>
        <div class="plan-metric-row">
          <div>
            <span class="metric-label">Revenus prévus</span>
            <strong>${formatCurrency(totalRevenue)}</strong>
          </div>
          <div>
            <span class="metric-label">Charges planifiées</span>
            <strong>${formatCurrency(totalCharges)}</strong>
          </div>
        </div>
        <div class="plan-risk-banner plan-risk-${risk.tone}">
          <strong>${risk.text}</strong>
          <span>Solde minimum anticipé : ${formatCurrency(minBalance)}</span>
        </div>
      </div>

      <div class="plan-card plan-actions-card">
        <h3>Actions prioritaires</h3>
        ${toPayNow.length > 0 ? toPayNow.map((item) => `
          <div class="plan-action-row">
            <div>${item.title}</div>
            <div>${formatCurrency(Math.abs(item.amount))}</div>
          </div>
        `).join('') : '<div class="empty-state">Aucune charge urgente détectée.</div>'}
        <div style="margin-top:16px;display:flex;gap:10px;flex-wrap:wrap;">
          <button class="btn btn-outline" type="button" onclick="showSection('saisie')">Mettre à jour le budget</button>
          <button class="btn btn-outline" type="button" onclick="showSection('dettes')">Voir dettes</button>
          <button class="btn btn-outline" type="button" onclick="showSection('objectifs')">Voir objectifs</button>
        </div>
      </div>

      <div class="plan-card">
        <h3>Revenus à venir</h3>
        ${buildEventItems(upcomingRevenues)}
      </div>

      <div class="plan-card">
        <h3>Charges à venir</h3>
        ${buildEventItems(upcomingExpenses)}
      </div>

      <div class="plan-card plan-timeline-card">
        <h3>Timeline de trésorerie</h3>
        <div id="plan-timeline-root"></div>
      </div>
    </div>
  `
}

const normalizeBudgetValue = (value) => {
  const amount = Number(value)
  return Number.isFinite(amount) ? amount : 0
}

const buildPlanData = async () => {
  const monthKey = new Date().toISOString().slice(0, 7)
  const baseBalance = (window.MonthlyBudgetStateService?.getCurrentBalance?.() || 0)
  const [recurringIncomes, billSchedules] = await Promise.all([
    SettingsService.loadRecurringIncomes(),
    SettingsService.loadBillSchedules()
  ])

  const { revenues: fetchedRevenues, charges: fetchedCharges } = await TreasuryAdapter.fetchCurrentMonthBudget(monthKey)

  const revenues = [
    ...(fetchedRevenues || []),
    ...(recurringIncomes || []).map((income) => ({
      title: income.name || 'Revenu récurrent',
      amount: normalizeBudgetValue(income.amount),
      frequency: income.frequency || 'monthly',
      day: Number(income.day) || 1
    }))
  ]

  const charges = [
    ...(fetchedCharges || []),
    ...(billSchedules || []).map((bill) => ({
      title: bill.name || 'Charge',
      amount: normalizeBudgetValue(bill.amount),
      date: bill.date || 1,
      priority: bill.priority || 'standard',
      dateEstimated: !bill.date
    }))
  ]

  const totalRevenue = revenues.reduce((sum, item) => sum + (Number(item.amount) || 0), 0)
  const totalCharges = charges.reduce((sum, item) => sum + (Number(item.amount) || 0), 0)

  const { timeline, endingBalance } = TreasuryService.buildTimeline({
    baseBalance,
    revenues,
    charges,
    fromDate: new Date(),
    days: 30
  })

  const minBalance = timeline.reduce((min, item) => Math.min(min, Number(item.balance) || 0), baseBalance)
  const upcomingRevenues = timeline.filter((item) => item.amount > 0).slice(0, 4)
  const upcomingExpenses = timeline.filter((item) => item.amount < 0).slice(0, 4)
  const { toPayNow } = TreasuryService.suggestPayments({
    baseBalance,
    revenues,
    charges,
    fromDate: new Date(),
    days: 30
  })

  return {
    timeline,
    endingBalance,
    baseBalance,
    totalRevenue,
    totalCharges,
    toPayNow,
    upcomingExpenses,
    upcomingRevenues,
    minBalance
  }
}

export async function renderPlanHub(rootId) {
  const root = document.getElementById(rootId)
  if (!root) return

  root.innerHTML = `
    <div id="plan-hub-content">
      <div class="loader">Chargement du plan...</div>
    </div>
  `

  await updatePlanHub(rootId)
}

export async function updatePlanHub(rootId) {
  const root = document.getElementById(rootId)
  if (!root) return
  const contentRoot = root.querySelector('#plan-hub-content')
  if (!contentRoot) return

  contentRoot.innerHTML = '<div class="loader">Analyse en cours…</div>'

  try {
    const planData = await buildPlanData()
    contentRoot.innerHTML = buildPlanContent(planData)
    renderTreasuryTimeline('plan-timeline-root', planData.timeline)
  } catch (error) {
    console.warn('[PlanHubUI] plan render failed', error)
    contentRoot.innerHTML = '<div class="empty-state">Impossible de charger le plan pour le moment.</div>'
  }
}
