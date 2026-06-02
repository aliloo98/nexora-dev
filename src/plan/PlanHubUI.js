import TreasuryService from '../treasury/treasuryService.js'
import TreasuryAdapter from '../treasury/treasuryAdapter.js'
import { SettingsService } from '../settings/settingsService.js'
import { renderTreasuryTimeline } from '../components/TreasuryTimeline.js'

const formatCurrency = (value) => {
  const amount = Number(value) || 0
  return `${amount.toLocaleString('fr-FR', {
    minimumFractionDigits: amount % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2
  })} €`
}

const formatShortDate = (value) => {
  const date = value ? new Date(`${value}T00:00:00`) : null
  if (!date || Number.isNaN(date.getTime())) return 'date estimée'
  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })
}

const escapeAttr = (value) => String(value ?? '')
  .replace(/&/g, '&amp;')
  .replace(/"/g, '&quot;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')

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

const saveDebts = (debts) => {
  localStorage.setItem('nexora_debts_v1', JSON.stringify(Array.isArray(debts) ? debts : []))
}

const makeDebtId = () => `debt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`

const isDemoMode = () => {
  try {
    return window.SafeStorage?.getItem?.('nexora_demo_mode_v1') === 'on' || localStorage.getItem('nexora_demo_mode_v1') === 'on'
  } catch {
    return false
  }
}

const demoPlanData = () => {
  const fromDate = new Date('2026-06-01T00:00:00')
  const revenues = [
    { title: 'Salaire Ali', amount: 1700, frequency: 'once', date: '2026-06-05' },
    { title: 'Salaire Mégane', amount: 1300, frequency: 'once', date: '2026-06-28' }
  ]
  const charges = [
    { title: 'Loyer', amount: 650, date: '2026-06-12', priority: 'critique' },
    { title: 'Électricité', amount: 95, date: '2026-06-18', priority: 'importante' },
    { title: 'Courses', amount: 420, date: '2026-06-20', priority: 'standard' }
  ]
  const { timeline, endingBalance } = TreasuryService.buildTimeline({ baseBalance: 940, revenues, charges, fromDate, days: 30 })
  return {
    timeline,
    endingBalance,
    baseBalance: 940,
    totalRevenue: 3000,
    totalCharges: 1165,
    toPayNow: [],
    goals: [{ id: 'demo_goal', name: 'Coussin de sécurité', target: 1500, current: 450, targetDate: '2026-09-30' }],
    debts: [{ id: 'demo_debt', name: 'Crédit voiture', initial: 2400, remaining: 1800, monthly: 180 }]
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
          <span>${item.date ? `${formatShortDate(item.date)}${item.dateEstimated ? ' · estimé' : ''}` : item.priority || 'date estimée'}</span>
        </div>
        <em class="${positive ? 'positive' : 'negative'}">${positive ? '+' : '-'}${formatCurrency(amount)}</em>
      </div>
    `
  }).join('')
}

const buildPlanContent = (data) => {
  const { timeline = [], endingBalance, baseBalance, totalRevenue, totalCharges, toPayNow, goals = [], debts = [] } = data

  const minBalance = Math.max(-99999, timeline.reduce((min, item) => Math.min(min, Number(item.balance) || 0), baseBalance))
  const important = (item) => Math.abs(Number(item.amount) || 0) >= 20 || Number(item.amount) > 0 || ['critique', 'importante'].includes(String(item.priority || '').toLowerCase())
  const upcomingCharges = timeline.filter((item) => item.amount < 0 && important(item))
  const upcomingRevenues = timeline.filter((item) => item.amount > 0 && important(item))
  const netFlow = totalRevenue - totalCharges
  const hasEstimatedDates = timeline.some((item) => item.dateEstimated)

  const getRiskClass = (bal) => bal < 0 ? 'danger' : bal === 0 ? 'warning' : 'success'
  const getBalanceLabel = (bal) => bal > 0 ? 'Positif' : bal === 0 ? 'Neutre' : 'Négatif'

  return `
    <div class="plan-hub-grid">
      <section class="plan-card plan-balance-card">
        <div class="plan-card-header">
          <h3>Solde prévisionnel</h3>
          <span class="plan-status-pill ${getRiskClass(endingBalance)}">${getBalanceLabel(endingBalance)}</span>
        </div>
        <strong class="plan-balance-value ${getRiskClass(endingBalance)}">${formatCurrency(endingBalance)}</strong>
        <div class="plan-metric-row">
          <div><span class="metric-label">Solde actuel</span><strong>${formatCurrency(baseBalance)}</strong></div>
          <div><span class="metric-label">Solde minimum</span><strong>${formatCurrency(minBalance)}</strong></div>
          <div><span class="metric-label">Revenus</span><strong>${formatCurrency(totalRevenue)}</strong></div>
          <div><span class="metric-label">Flux net</span><strong class="${netFlow >= 0 ? 'positive' : 'negative'}">${formatCurrency(netFlow)}</strong></div>
        </div>
        ${hasEstimatedDates ? '<p class="plan-estimate-note">Estimation basée sur vos échéances actuelles.</p>' : ''}
      </section>

      <section class="plan-card">
        <div class="plan-card-header"><h3>À payer maintenant</h3></div>
        ${buildPlanRows(toPayNow, { emptyLabel: 'Aucune charge urgente détectée', limit: 3 })}
      </section>

      <section class="plan-card">
        <div class="plan-card-header"><h3>Cette semaine</h3></div>
        ${buildPlanRows(upcomingCharges, { emptyLabel: 'Aucune charge cette semaine', limit: 4 })}
      </section>

      <section class="plan-card">
        <div class="plan-card-header"><h3>Revenus à venir</h3></div>
        ${buildPlanRows(upcomingRevenues, { emptyLabel: 'Aucun revenu prévu', positive: true, limit: 4 })}
      </section>

      <section class="plan-card plan-timeline-card">
        <div class="plan-card-header"><h3>Ligne de temps</h3></div>
        <div id="plan-timeline-root" class="plan-timeline-root">
          ${timeline.length ? '' : '<div class="plan-empty-line">Aucun mouvement daté pour ce mois.</div>'}
        </div>
      </section>

      <section class="plan-card">
        <div class="plan-card-header"><h3>Objectifs</h3></div>
        <div class="plan-edit-list">
        ${goals.length ? goals.map((goal) => {
          const current = Number(goal.current) || 0
          const target = Number(goal.target) || 0
          const remaining = Math.max(0, target - current)
          return `
            <div class="plan-edit-item" data-goal-id="${escapeAttr(goal.id)}">
              <div class="plan-edit-summary">
                <strong>${escapeAttr(goal.name || 'Objectif')}</strong>
                <span>${goal.isPrimary ? 'Objectif principal · ' : ''}${target > 0 ? `${formatCurrency(remaining)} restants` : 'Montant cible non défini'}</span>
                <em>${target > 0 ? `${Math.min(100, Math.round(current / target * 100))}%` : '—'}</em>
              </div>
              <div class="plan-edit-grid">
                <label>Nom<input class="budget-input plan-goal-input" data-field="name" value="${escapeAttr(goal.name || '')}" type="text"></label>
                <label>Cible<input class="budget-input plan-goal-input" data-field="target" value="${target}" type="number" min="0"></label>
                <label>Actuel<input class="budget-input plan-goal-input" data-field="current" value="${current}" type="number" min="0"></label>
                <label>Échéance<input class="budget-input plan-goal-input" data-field="targetDate" value="${escapeAttr(goal.targetDate || '')}" type="date"></label>
              </div>
              <div class="plan-edit-actions">
                <button class="${goal.isPrimary ? 'btn btn-gold' : 'btn btn-outline'} plan-goal-primary" type="button" ${goal.isPrimary ? 'disabled' : ''}>${goal.isPrimary ? 'Objectif principal' : 'Définir comme principal'}</button>
                <button class="btn btn-gold plan-goal-save" type="button">Enregistrer</button>
                <button class="btn btn-outline plan-goal-complete" type="button" ${target > 0 && current < target ? '' : 'disabled'}>Marquer atteint</button>
                <button class="btn btn-danger plan-goal-delete" type="button">Supprimer</button>
              </div>
            </div>
          `
        }).join('') : '<div class="plan-empty-line">Aucun objectif configuré.</div>'}
        </div>
        <div class="plan-create-form" id="plan-goal-create-form">
          <input class="budget-input" id="plan-new-goal-name" type="text" placeholder="Nouvel objectif">
          <input class="budget-input" id="plan-new-goal-target" type="number" min="0" placeholder="Cible">
          <button class="btn btn-gold" id="plan-goal-create" type="button">Créer</button>
        </div>
      </section>

      <section class="plan-card">
        <div class="plan-card-header"><h3>Dettes</h3></div>
        <div class="plan-edit-list">
        ${debts.length ? debts.map((debt, index) => `
          <div class="plan-edit-item" data-debt-index="${index}">
              <div class="plan-edit-summary">
                <strong>${escapeAttr(debt.name || 'Dette')}</strong>
                <span>${Number(debt.monthly) > 0 ? `${formatCurrency(debt.monthly)} / mois` : 'Mensualité non définie'}</span>
                <em class="negative">${formatCurrency(debt.remaining || 0)}</em>
              </div>
              <div class="plan-edit-grid">
                <label>Nom<input class="budget-input plan-debt-input" data-field="name" value="${escapeAttr(debt.name || '')}" type="text"></label>
                <label>Initial<input class="budget-input plan-debt-input" data-field="initial" value="${Number(debt.initial) || 0}" type="number" min="0"></label>
                <label>Restant<input class="budget-input plan-debt-input" data-field="remaining" value="${Number(debt.remaining) || 0}" type="number" min="0"></label>
                <label>Mensualité<input class="budget-input plan-debt-input" data-field="monthly" value="${Number(debt.monthly) || 0}" type="number" min="0"></label>
                <label>Échéance<input class="budget-input plan-debt-input" data-field="endDate" value="${escapeAttr(debt.endDate || '')}" type="date"></label>
                <label>Paiement<input class="budget-input plan-debt-payment" value="" type="number" min="0" placeholder="Montant"></label>
              </div>
              <div class="plan-edit-actions">
                <button class="btn btn-gold plan-debt-save" type="button">Enregistrer</button>
                <button class="btn btn-outline plan-debt-pay" type="button">Ajouter paiement</button>
                <button class="btn btn-outline plan-debt-complete" type="button" ${Number(debt.remaining) > 0 ? '' : 'disabled'}>Marquer remboursée</button>
                <button class="btn btn-danger plan-debt-delete" type="button">Supprimer</button>
              </div>
            </div>
        `).join('') : '<div class="plan-empty-line">Aucune dette enregistrée.</div>'}
        </div>
        <div class="plan-create-form" id="plan-debt-create-form">
          <input class="budget-input" id="plan-new-debt-name" type="text" placeholder="Nouvelle dette">
          <input class="budget-input" id="plan-new-debt-remaining" type="number" min="0" placeholder="Restant">
          <input class="budget-input" id="plan-new-debt-monthly" type="number" min="0" placeholder="Mensualité">
          <button class="btn btn-gold" id="plan-debt-create" type="button">Créer</button>
        </div>
      </section>
    </div>
  `
}

const attachPlanEditors = (root, planData) => {
  root.querySelectorAll('.plan-edit-item[data-goal-id]').forEach((item) => {
    const goalId = item.dataset.goalId
    const readPatch = () => {
      const patch = {}
      item.querySelectorAll('.plan-goal-input').forEach((input) => {
        const field = input.dataset.field
        patch[field] = input.type === 'number' ? Number(input.value) || 0 : input.value
      })
      return patch
    }

    item.querySelector('.plan-goal-save')?.addEventListener('click', async () => {
      await window.GoalsService?.updateGoal?.(goalId, readPatch())
      window.showToast?.('Objectif mis à jour')
      await renderPlanHub(root.id)
    })
    item.querySelector('.plan-goal-primary')?.addEventListener('click', async () => {
      await window.GoalsService?.setPrimaryGoal?.(goalId)
      window.showToast?.('Objectif principal mis à jour')
      if (typeof window.updateDashboardPrimaryGoal === 'function') await window.updateDashboardPrimaryGoal()
      await renderPlanHub(root.id)
    })
    item.querySelector('.plan-goal-complete')?.addEventListener('click', async () => {
      const goal = (planData.goals || []).find((entry) => String(entry.id) === String(goalId))
      await window.GoalsService?.updateGoal?.(goalId, { current: Number(goal?.target) || 0 })
      window.showToast?.('Objectif marqué comme atteint')
      await renderPlanHub(root.id)
    })
    item.querySelector('.plan-goal-delete')?.addEventListener('click', async () => {
      await window.GoalsService?.deleteGoal?.(goalId)
      window.showToast?.('Objectif supprimé')
      await renderPlanHub(root.id)
    })
  })

  root.querySelector('#plan-goal-create')?.addEventListener('click', async () => {
    const name = root.querySelector('#plan-new-goal-name')?.value?.trim()
    const target = Number(root.querySelector('#plan-new-goal-target')?.value) || 0
    if (!name || target <= 0) {
      window.showToast?.('Nom et cible requis')
      return
    }
    await window.GoalsService?.createGoal?.({ name, target, current: 0 })
    window.showToast?.('Objectif créé')
    await renderPlanHub(root.id)
  })

  const saveDebtList = async (debts) => {
    saveDebts(debts)
    window.showToast?.('Dette mise à jour')
    if (typeof window.updateAll === 'function') window.updateAll()
    await renderPlanHub(root.id)
  }

  root.querySelectorAll('.plan-edit-item[data-debt-index]').forEach((item) => {
    const index = Number(item.dataset.debtIndex)
    const readDebtPatch = () => {
      const patch = {}
      item.querySelectorAll('.plan-debt-input').forEach((input) => {
        const field = input.dataset.field
        patch[field] = input.type === 'number' ? Number(input.value) || 0 : input.value
      })
      return patch
    }

    item.querySelector('.plan-debt-save')?.addEventListener('click', async () => {
      const debts = readDebts()
      debts[index] = { ...debts[index], ...readDebtPatch(), id: debts[index]?.id || makeDebtId() }
      await saveDebtList(debts)
    })
    item.querySelector('.plan-debt-pay')?.addEventListener('click', async () => {
      const payment = Number(item.querySelector('.plan-debt-payment')?.value) || 0
      if (payment <= 0) {
        window.showToast?.('Montant de paiement requis')
        return
      }
      const debts = readDebts()
      const debt = debts[index] || {}
      debts[index] = { ...debt, remaining: Math.max(0, (Number(debt.remaining) || 0) - payment), id: debt.id || makeDebtId() }
      await saveDebtList(debts)
    })
    item.querySelector('.plan-debt-complete')?.addEventListener('click', async () => {
      const debts = readDebts()
      debts[index] = { ...debts[index], remaining: 0, id: debts[index]?.id || makeDebtId() }
      await saveDebtList(debts)
    })
    item.querySelector('.plan-debt-delete')?.addEventListener('click', async () => {
      const debts = readDebts()
      debts.splice(index, 1)
      saveDebts(debts)
      window.showToast?.('Dette supprimée')
      if (typeof window.updateAll === 'function') window.updateAll()
      await renderPlanHub(root.id)
    })
  })

  root.querySelector('#plan-debt-create')?.addEventListener('click', async () => {
    const name = root.querySelector('#plan-new-debt-name')?.value?.trim()
    const remaining = Number(root.querySelector('#plan-new-debt-remaining')?.value) || 0
    const monthly = Number(root.querySelector('#plan-new-debt-monthly')?.value) || 0
    if (!name || remaining <= 0) {
      window.showToast?.('Nom et montant restant requis')
      return
    }
    const debts = readDebts()
    debts.push({ id: makeDebtId(), name, initial: remaining, remaining, monthly })
    await saveDebtList(debts)
  })
}

const buildPlanData = async () => {
  if (isDemoMode()) return demoPlanData()

  const monthKey = typeof window.getMonth === 'function' ? window.getMonth() : new Date().toISOString().slice(0, 7)
  const fromDate = /^\d{4}-\d{2}$/.test(monthKey) ? new Date(`${monthKey}-01T00:00:00`) : new Date()

  // Calculate current balance from budget data
  let baseBalance = 0
  try {
    if (window.MonthlyBudgetStateService?.getCurrentBalance && typeof window.MonthlyBudgetStateService.getCurrentBalance === 'function') {
      baseBalance = await window.MonthlyBudgetStateService.getCurrentBalance(monthKey)
    }
  } catch (err) {
    console.warn('[PlanHubUI] calculateBalance failed, using 0:', err)
  }

  const [recurringIncomes, billSchedules, goals] = await Promise.all([
    SettingsService.loadRecurringIncomes(),
    SettingsService.loadBillSchedules(),
    window.GoalsService?.listGoals ? window.GoalsService.listGoals().catch(() => []) : []
  ])

  const { revenues: fetchedRevenues, charges: fetchedCharges } = await TreasuryAdapter.fetchCurrentMonthBudget(monthKey)

  const normalizedRecurringIncomes = (recurringIncomes || []).map((income) => ({
      title: income.name || 'Revenu récurrent',
      amount: Number(income.amount) || 0,
      frequency: income.frequency || 'monthly',
      day: Number(income.day) || 1
    }))
    .filter((income) => income.amount > 0 && Number.isFinite(income.day) && income.day >= 1 && income.day <= 31)

  const revenues = normalizedRecurringIncomes.length > 0
    ? normalizedRecurringIncomes
    : (fetchedRevenues || []).filter((income) => income && income.dateEstimated !== true)

  const scheduleByKey = new Map()
  const scheduleByName = new Map()
  ;(billSchedules || []).forEach((bill) => {
    const normalized = {
      title: bill.name || 'Charge',
      amount: Number(bill.amount) || 0,
      date: Number(bill.day || bill.date) || 1,
      priority: bill.priority || 'standard',
      linkedCharge: bill.linkedCharge || ''
    }
    if (normalized.linkedCharge) scheduleByKey.set(normalized.linkedCharge, normalized)
    scheduleByName.set(normalized.title.toLowerCase(), normalized)
  })

  const linkedScheduleNames = new Set()
  const charges = (fetchedCharges || []).map((charge) => {
    const schedule = scheduleByKey.get(charge.sourceKey) || scheduleByName.get(String(charge.title || '').toLowerCase())
    if (!schedule) return charge
    linkedScheduleNames.add(schedule.title.toLowerCase())
    return {
      ...charge,
      date: schedule.date,
      priority: schedule.priority,
      dateEstimated: false
    }
  })

  ;(billSchedules || []).forEach((bill) => {
    const title = bill.name || 'Charge'
    const key = title.toLowerCase()
    const linkedCharge = bill.linkedCharge || ''
    if (linkedCharge && (fetchedCharges || []).some((charge) => charge.sourceKey === linkedCharge)) return
    if (linkedScheduleNames.has(key)) return
    charges.push({
      title,
      amount: Number(bill.amount) || 0,
      date: Number(bill.day || bill.date) || 1,
      priority: bill.priority || 'standard'
    })
  })

  const { timeline, endingBalance } = TreasuryService.buildTimeline({
    baseBalance,
    revenues,
    charges,
    fromDate,
    days: 30
  })

  const scheduledRevenue = revenues.reduce((sum, item) => sum + (Number(item.amount) || 0), 0)
  const budgetRevenue = (fetchedRevenues || []).reduce((sum, item) => sum + (Number(item.amount) || 0), 0)
  const totalRevenue = Math.max(scheduledRevenue, budgetRevenue)
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
    attachPlanEditors(root, planData)
  } catch (error) {
    console.warn('[PlanHub] render failed', error)
    root.innerHTML = buildEmptyState()
  }
}

export async function updatePlanHub(rootId = 'plan-root') {
  await renderPlanHub(rootId)
}

export default { renderPlanHub, updatePlanHub }
