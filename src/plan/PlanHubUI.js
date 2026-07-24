import TreasuryService from '../treasury/treasuryService.js'
import TreasuryAdapter from '../treasury/treasuryAdapter.js'
import { SettingsService } from '../settings/settingsService.js'
import { renderTreasuryTimeline } from '../components/TreasuryTimeline.js'
import { parseFinancialExpression } from '../finance/financialExpression.js'
import { computeCycleBalancesFromMetrics } from '../finance/cycleBalance.js'
import { filterUserFacingRecords } from '../utils/userFacingFilter.js'
import { STORAGE_KEYS } from '../constants/storageKeys.js'
import { readSyncedArray, writeSyncedArray } from '../../js/syncedSettingAccess.js'
import { escapeHtml } from '../utils/htmlEscape.js'
import { buildJudgmentEngine } from '../assistant/judgmentEngine.js'

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

const escapeAttr = escapeHtml

const parseAmount = (value) => {
  const parsed = parseFinancialExpression(value, { fallback: null })
  return parsed === null ? null : parsed
}

const buildEmptyState = () => `
  <div class="empty-state plan-empty-state">
    <p>Le plan du mois n’est pas encore construit</p>
    <p>Ajoute les revenus et les charges pour obtenir un plan de trésorerie clair et prioritaire.</p>
    <button class="btn btn-gold" type="button" onclick="showSection('saisie')">Démarrer le plan</button>
  </div>
`

const readDebts = async () => filterUserFacingRecords(await readSyncedArray(STORAGE_KEYS.debts, []))

const saveDebts = async (debts) => writeSyncedArray(STORAGE_KEYS.debts, debts)

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
    { title: 'Salaire utilisateur', amount: 1700, frequency: 'once', date: '2026-06-05' },
    { title: 'Salaire foyer', amount: 1300, frequency: 'once', date: '2026-06-28' }
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
    projectedEndOfCycle: endingBalance,
    currentBalance: 940,
    baseBalance: 940,
    totalRevenue: 3000,
    totalCharges: 1165,
    totalFixedCharges: 745,
    totalVariableCharges: 420,
    targetSavings: 300,
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
    const scheduleLabel = item.date
      ? `${formatShortDate(item.date)}${item.dateEstimated ? ' · estimé' : ''}`
      : item.priority || 'date estimée'
    return `
      <div class="plan-row">
        <div>
          <strong>${escapeHtml(item.title || (positive ? 'Revenu' : 'Charge'))}</strong>
          <span>${escapeHtml(scheduleLabel)}</span>
        </div>
        <em class="${positive ? 'positive' : 'negative'}">${positive ? '+' : '-'}${formatCurrency(amount)}</em>
      </div>
    `
  }).join('')
}

const buildTodayActionCard = (judgment) => {
  const action = String(judgment?.action || '').trim()
  const why = String(judgment?.why || '').trim()

  if (!action) {
    return `
      <section class="plan-card">
        <div class="plan-card-header"><h3>Ce qu’il faut faire aujourd’hui</h3></div>
        <div class="plan-empty-line">Aucune action prioritaire disponible pour le moment.</div>
      </section>
    `
  }

  return `
    <section class="plan-card">
      <div class="plan-card-header"><h3>Ce qu’il faut faire aujourd’hui</h3></div>
      <div class="plan-card-body">
        <strong>${escapeHtml(action)}</strong>
        ${why ? `<p>${escapeHtml(why)}</p>` : ''}
      </div>
    </section>
  `
}

const buildPlanSteps = ({
  totalRevenue = 0,
  totalCharges = 0,
  totalVariableCharges = 0,
  cycleBalanceDisplay = 0,
  targetSavings = 0,
  toPayNow = []
} = {}) => {
  const savingsTarget = Math.max(0, Number(targetSavings) || 0)
  const hasIncome = Number(totalRevenue) > 0
  const hasCharges = Number(totalCharges) > 0
  const hasVariables = Number(totalVariableCharges) > 0
  const savingsReached = hasIncome && savingsTarget > 0 && Number(cycleBalanceDisplay) >= savingsTarget

  return [
    {
      phase: 'Aujourd’hui',
      title: 'Saisir le salaire',
      detail: hasIncome
        ? `${formatCurrency(totalRevenue)} de revenus pris en compte.`
        : 'Ajoutez au moins un revenu fiable pour activer le jugement.',
      complete: hasIncome
    },
    {
      phase: 'Ensuite',
      title: 'Vérifier les charges',
      detail: hasCharges
        ? `${formatCurrency(totalCharges)} de charges prévues${toPayNow.length ? `, ${toPayNow.length} à traiter maintenant` : ''}.`
        : 'Ajoutez les charges fixes et les échéances du mois.',
      complete: hasCharges
    },
    {
      phase: 'Puis',
      title: 'Prévoir les dépenses variables',
      detail: hasVariables
        ? `${formatCurrency(totalVariableCharges)} de dépenses variables suivies.`
        : 'Renseignez les dépenses flexibles pour fiabiliser la projection.',
      complete: hasVariables
    },
    {
      phase: 'Enfin',
      title: `Épargner ${formatCurrency(savingsTarget)}`,
      detail: savingsReached
        ? 'L’objectif d’épargne du mois est couvert par la projection.'
        : hasIncome
          ? `${formatCurrency(Math.max(0, savingsTarget - Number(cycleBalanceDisplay || 0)))} manquent pour couvrir l’objectif.`
          : 'L’objectif sera calculé dès que les revenus seront saisis.',
      complete: savingsReached
    }
  ]
}

const buildRecommendedTasks = ({ steps = [], toPayNow = [], judgment, goals = [], debts = [], targetSavings = 0, cycleBalanceDisplay = 0 } = {}) => {
  const tasks = []
  const nextStep = steps.find((step) => !step.complete)

  if (nextStep) {
    tasks.push({
      title: nextStep.title,
      detail: nextStep.detail
    })
  }

  if (toPayNow.length) {
    const amount = toPayNow.reduce((sum, item) => sum + Math.abs(Number(item.amount) || 0), 0)
    tasks.push({
      title: 'Traiter les paiements proches',
      detail: `${toPayNow.length} paiement${toPayNow.length > 1 ? 's' : ''} à vérifier, pour ${formatCurrency(amount)}.`
    })
  }

  if (judgment?.primaryProblem?.kind === 'variables') {
    tasks.push({
      title: 'Limiter les variables',
      detail: 'Réduisez les dépenses flexibles avant de financer une nouvelle priorité.'
    })
  }

  const primaryGoal = goals.find((goal) => goal?.isPrimary) || goals[0]
  if (primaryGoal && Number(primaryGoal.target) > Number(primaryGoal.current)) {
    tasks.push({
      title: 'Faire avancer l’objectif principal',
      detail: `${primaryGoal.name || 'Objectif'} : ${formatCurrency(Math.max(0, Number(primaryGoal.target) - Number(primaryGoal.current)))} restants.`
    })
  }

  if (debts.some((debt) => Number(debt.remaining) > 0)) {
    tasks.push({
      title: 'Surveiller les dettes actives',
      detail: 'Gardez la mensualité prévue avant toute allocation supplémentaire.'
    })
  }

  if (Number(targetSavings) > 0 && Number(cycleBalanceDisplay) < Number(targetSavings)) {
    tasks.push({
      title: 'Protéger l’épargne du mois',
      detail: `Objectif mensuel : ${formatCurrency(targetSavings)}.`
    })
  }

  const seen = new Set()
  return tasks.filter((task) => {
    const key = task.title.toLowerCase()
    if (seen.has(key)) return false
    seen.add(key)
    return true
  }).slice(0, 4)
}

const buildNexoraAdvice = ({ judgment, timeline = [], cycleBalanceDisplay = 0, targetSavings = 0 } = {}) => {
  const advice = [
    {
      title: 'Pourquoi maintenant',
      detail: judgment?.why || 'Le plan se met à jour avec les données du mois.'
    },
    {
      title: 'Impact attendu',
      detail: judgment?.impact || 'La projection deviendra plus fiable avec les revenus et charges.'
    }
  ]

  if (timeline.length) {
    advice.push({
      title: 'Lecture du mois',
      detail: `${timeline.length} mouvement${timeline.length > 1 ? 's' : ''} alimentent la timeline de décision.`
    })
  } else {
    advice.push({
      title: 'Timeline',
      detail: 'Ajoutez des échéances pour transformer le plan en calendrier d’action.'
    })
  }

  if (Number(targetSavings) > 0) {
    advice.push({
      title: 'Épargne',
      detail: Number(cycleBalanceDisplay) >= Number(targetSavings)
        ? 'L’objectif mensuel est couvert : gardez la trajectoire.'
        : 'Priorisez la marge avant d’augmenter les allocations.'
    })
  }

  return advice.slice(0, 4)
}

const buildPlanDecisionHub = ({ judgment, steps, tasks, advice, cycleBalanceDisplay, targetSavings }) => {
  const riskClass = cycleBalanceDisplay < 0 ? 'danger' : cycleBalanceDisplay < targetSavings ? 'warning' : 'success'

  return `
    <section class="plan-card plan-decision-card">
      <div class="plan-card-header">
        <h3>Priorité actuelle</h3>
        <span class="plan-status-pill ${riskClass}">${riskClass === 'success' ? 'Sous contrôle' : riskClass === 'warning' ? 'À surveiller' : 'Risque'}</span>
      </div>
      <div class="plan-decision-body">
        <div>
          <strong>${escapeHtml(judgment?.action || 'Construire le plan du mois.')}</strong>
          <p>${escapeHtml(judgment?.diagnostic || 'Le plan devient dynamique dès que les données du mois sont disponibles.')}</p>
        </div>
        <div class="plan-decision-metric">
          <span>Solde projeté</span>
          <strong class="${riskClass === 'danger' ? 'negative' : 'positive'}">${formatCurrency(cycleBalanceDisplay)}</strong>
          <em>Objectif d’épargne : ${formatCurrency(targetSavings)}</em>
        </div>
      </div>
    </section>

    <section class="plan-card plan-steps-card">
      <div class="plan-card-header"><h3>Prochaines étapes</h3></div>
      <div class="plan-step-list" role="list">
        ${steps.map((step) => `
          <div class="plan-step ${step.complete ? 'is-complete' : 'is-pending'}" role="listitem">
            <span>${escapeHtml(step.phase)}</span>
            <i aria-hidden="true">${step.complete ? '✓' : '•'}</i>
            <div>
              <strong>${escapeHtml(step.title)}</strong>
              <p>${escapeHtml(step.detail)}</p>
            </div>
          </div>
        `).join('')}
      </div>
    </section>

    <section class="plan-card plan-tasks-card">
      <div class="plan-card-header"><h3>Tâches recommandées</h3></div>
      <div class="plan-task-list">
        ${tasks.length ? tasks.map((task) => `
          <div class="plan-task">
            <strong>${escapeHtml(task.title)}</strong>
            <span>${escapeHtml(task.detail)}</span>
          </div>
        `).join('') : '<div class="plan-empty-line">Aucune tâche prioritaire supplémentaire.</div>'}
      </div>
    </section>

    <section class="plan-card plan-advice-card">
      <div class="plan-card-header"><h3>Conseils Nexora</h3></div>
      <div class="plan-advice-list">
        ${advice.map((item) => `
          <div class="plan-advice">
            <strong>${escapeHtml(item.title)}</strong>
            <span>${escapeHtml(item.detail)}</span>
          </div>
        `).join('')}
      </div>
    </section>
  `
}

const buildPlanContent = (data) => {
  const {
    timeline = [],
    endingBalance,
    projectedEndOfCycle,
    currentBalance,
    baseBalance,
    totalRevenue,
    totalCharges,
    totalFixedCharges = 0,
    totalVariableCharges = 0,
    targetSavings = 0,
    toPayNow,
    goals = [],
    debts = []
  } = data
  const cycleBalanceDisplay = Number.isFinite(projectedEndOfCycle) ? projectedEndOfCycle : 0
  const currentBalanceDisplay = Number.isFinite(currentBalance) ? currentBalance : baseBalance
  const judgment = buildJudgmentEngine({
    income: Number(totalRevenue) || 0,
    fixedExpenses: Math.max(0, Number(totalFixedCharges) || Math.max(0, Number(totalCharges || 0) - Number(totalVariableCharges || 0))),
    variableExpenses: Math.max(0, Number(totalVariableCharges) || 0),
    expenses: Number(totalCharges) || 0,
    projectedBalance: Number(cycleBalanceDisplay) || 0,
    currentBalance: Number(currentBalanceDisplay) || 0,
    debts,
    goals,
    primaryGoal: goals.find((goal) => goal?.isPrimary) || null,
    settings: { thresholds: { chargesRate: 75, variableRate: 35, minBalance: 150 } }
  })

  const minBalance = Math.max(-99999, timeline.reduce((min, item) => Math.min(min, Number(item.balance) || 0), baseBalance))
  const important = (item) => Math.abs(Number(item.amount) || 0) >= 20 || Number(item.amount) > 0 || ['critique', 'importante'].includes(String(item.priority || '').toLowerCase())
  const upcomingCharges = timeline.filter((item) => item.amount < 0 && important(item))
  const upcomingRevenues = timeline.filter((item) => item.amount > 0 && important(item))
  const netFlow = totalRevenue - totalCharges
  const hasEstimatedDates = timeline.some((item) => item.dateEstimated)
  const steps = buildPlanSteps({
    totalRevenue,
    totalCharges,
    totalVariableCharges,
    cycleBalanceDisplay,
    targetSavings,
    toPayNow
  })
  const tasks = buildRecommendedTasks({
    steps,
    toPayNow,
    judgment,
    goals,
    debts,
    targetSavings,
    cycleBalanceDisplay
  })
  const advice = buildNexoraAdvice({ judgment, timeline, cycleBalanceDisplay, targetSavings })

  const getRiskClass = (bal) => bal < 0 ? 'danger' : bal === 0 ? 'warning' : 'success'
  const getBalanceLabel = (bal) => bal > 0 ? 'Positif' : bal === 0 ? 'Neutre' : 'Négatif'

  return `
    <div class="plan-hub-grid">
      ${buildPlanDecisionHub({ judgment, steps, tasks, advice, cycleBalanceDisplay, targetSavings })}

      <section class="plan-card plan-balance-card">
        <div class="plan-card-header">
          <h3>Solde du mois</h3>
          <span class="plan-status-pill ${getRiskClass(cycleBalanceDisplay)}">${getBalanceLabel(cycleBalanceDisplay)}</span>
        </div>
        <div class="plan-metric-row" style="margin-top:10px;display:grid;gap:8px">
          <div><span class="metric-label">Priorité</span><strong>${escapeHtml(judgment.diagnostic)}</strong></div>
        </div>
        <strong class="plan-balance-value ${getRiskClass(cycleBalanceDisplay)}">${formatCurrency(cycleBalanceDisplay)}</strong>
        <div class="plan-metric-row">
          <div><span class="metric-label">Solde actuel</span><strong>${formatCurrency(currentBalanceDisplay)}</strong></div>
          <div><span class="metric-label">Solde minimum</span><strong>${formatCurrency(minBalance)}</strong></div>
          <div><span class="metric-label">Revenus</span><strong>${formatCurrency(totalRevenue)}</strong></div>
          <div><span class="metric-label">Flux net</span><strong class="${netFlow >= 0 ? 'positive' : 'negative'}">${formatCurrency(netFlow)}</strong></div>
        </div>
        ${hasEstimatedDates ? '<p class="plan-estimate-note">Estimation basée sur vos échéances actuelles.</p>' : ''}
      </section>

      ${buildTodayActionCard(judgment)}

      <section class="plan-card">
        <div class="plan-card-header"><h3>À traiter maintenant</h3></div>
        ${buildPlanRows(toPayNow, { emptyLabel: 'Aucune charge urgente détectée', limit: 3 })}
      </section>

      <section class="plan-card">
        <div class="plan-card-header"><h3>À venir cette semaine</h3></div>
        ${buildPlanRows(upcomingCharges, { emptyLabel: 'Aucune charge cette semaine', limit: 4 })}
      </section>

      <section class="plan-card">
        <div class="plan-card-header"><h3>Entrées prévues</h3></div>
        ${buildPlanRows(upcomingRevenues, { emptyLabel: 'Aucun revenu prévu', positive: true, limit: 4 })}
      </section>

      <section class="plan-card plan-timeline-card">
        <div class="plan-card-header"><h3>Chronologie du mois</h3></div>
        <div id="plan-timeline-root" class="plan-timeline-root">
          ${timeline.length ? '' : '<div class="plan-empty-line">Aucun mouvement daté pour ce mois.</div>'}
        </div>
      </section>

      <section class="plan-card">
        <div class="plan-card-header"><h3>Priorités d’épargne</h3></div>
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
                <label>Cible<input class="budget-input plan-goal-input" data-field="target" value="${target}" type="text"></label>
                <label>Actuel<input class="budget-input plan-goal-input" data-field="current" value="${current}" type="text"></label>
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
          <label class="premium-field" for="plan-new-goal-name"><span>Nouvel objectif</span><input class="budget-input" id="plan-new-goal-name" type="text" placeholder="Ex. Fonds de sécurité"></label>
          <label class="premium-field" for="plan-new-goal-target"><span>Cible</span><input class="budget-input" id="plan-new-goal-target" type="text" placeholder="0 €"></label>
          <button class="btn btn-gold" id="plan-goal-create" type="button">Ajouter</button>
        </div>
      </section>

      <section class="plan-card">
        <div class="plan-card-header"><h3>Dettes à suivre</h3></div>
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
                <label>Initial<input class="budget-input plan-debt-input" data-field="initial" value="${Number(debt.initial) || 0}" type="text"></label>
                <label>Restant<input class="budget-input plan-debt-input" data-field="remaining" value="${Number(debt.remaining) || 0}" type="text"></label>
                <label>Mensualité<input class="budget-input plan-debt-input" data-field="monthly" value="${Number(debt.monthly) || 0}" type="text"></label>
                <label>Échéance<input class="budget-input plan-debt-input" data-field="endDate" value="${escapeAttr(debt.endDate || '')}" type="date"></label>
                <label>Paiement<input class="budget-input plan-debt-payment" value="" type="text" placeholder="Montant"></label>
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
          <label class="premium-field" for="plan-new-debt-name"><span>Nouvelle dette</span><input class="budget-input" id="plan-new-debt-name" type="text" placeholder="Ex. Crédit voiture"></label>
          <label class="premium-field" for="plan-new-debt-remaining"><span>Capital restant</span><input class="budget-input" id="plan-new-debt-remaining" type="text" placeholder="0 €"></label>
          <label class="premium-field" for="plan-new-debt-monthly"><span>Mensualité</span><input class="budget-input" id="plan-new-debt-monthly" type="text" placeholder="0 €"></label>
          <button class="btn btn-gold" id="plan-debt-create" type="button">Ajouter</button>
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
        if (['target', 'current'].includes(field)) {
          const parsed = parseAmount(input.value)
          if (parsed === null) throw new Error('invalid-amount')
          patch[field] = parsed
        } else {
          patch[field] = input.value
        }
      })
      return patch
    }

    item.querySelector('.plan-goal-save')?.addEventListener('click', async () => {
      try {
        await window.GoalsService?.updateGoal?.(goalId, readPatch())
      } catch {
        window.showToast?.('Expression financière invalide')
        return
      }
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
    const target = parseAmount(root.querySelector('#plan-new-goal-target')?.value)
    if (target === null) {
      window.showToast?.('Expression financière invalide')
      return
    }
    if (!name || target <= 0) {
      window.showToast?.('Nom et cible requis')
      return
    }
    await window.GoalsService?.createGoal?.({ name, target, current: 0 })
    window.showToast?.('Objectif créé')
    await renderPlanHub(root.id)
  })

  const saveDebtList = async (debts) => {
    await saveDebts(debts)
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
        patch[field] = ['initial', 'remaining', 'monthly'].includes(field) ? parseAmount(input.value) : input.value
      })
      return patch
    }

    item.querySelector('.plan-debt-save')?.addEventListener('click', async () => {
      const debts = await readDebts()
      debts[index] = { ...debts[index], ...readDebtPatch(), id: debts[index]?.id || makeDebtId() }
      await saveDebtList(debts)
    })
    item.querySelector('.plan-debt-pay')?.addEventListener('click', async () => {
      const payment = parseAmount(item.querySelector('.plan-debt-payment')?.value)
      if (payment === null) {
        window.showToast?.('Expression financière invalide')
        return
      }
      if (payment <= 0) {
        window.showToast?.('Montant de paiement requis')
        return
      }
      const debts = await readDebts()
      const debt = debts[index] || {}
      debts[index] = { ...debt, remaining: Math.max(0, (Number(debt.remaining) || 0) - payment), id: debt.id || makeDebtId() }
      await saveDebtList(debts)
    })
    item.querySelector('.plan-debt-complete')?.addEventListener('click', async () => {
      const debts = await readDebts()
      debts[index] = { ...debts[index], remaining: 0, id: debts[index]?.id || makeDebtId() }
      await saveDebtList(debts)
    })
    item.querySelector('.plan-debt-delete')?.addEventListener('click', async () => {
      const debts = await readDebts()
      debts.splice(index, 1)
      await saveDebts(debts)
      window.showToast?.('Dette supprimée')
      if (typeof window.updateAll === 'function') window.updateAll()
      await renderPlanHub(root.id)
    })
  })

  root.querySelector('#plan-debt-create')?.addEventListener('click', async () => {
    const name = root.querySelector('#plan-new-debt-name')?.value?.trim()
    const remaining = parseAmount(root.querySelector('#plan-new-debt-remaining')?.value)
    const monthly = parseAmount(root.querySelector('#plan-new-debt-monthly')?.value)
    if (remaining === null || monthly === null) {
      window.showToast?.('Expression financière invalide')
      return
    }
    if (!name || remaining <= 0) {
      window.showToast?.('Nom et montant restant requis')
      return
    }
    const debts = await readDebts()
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
    window.GoalsService?.listUserFacingGoals
      ? window.GoalsService.listUserFacingGoals().catch(() => [])
      : filterUserFacingRecords(
        await (window.GoalsService?.listGoals ? window.GoalsService.listGoals().catch(() => []) : []),
        (goal) => goal?.name
      )
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
  const totalCharges = charges.reduce((sum, item) => sum + (Number(item.amount) || 0), 0)
  const { toPayNow } = TreasuryService.suggestPayments({
    baseBalance,
    revenues,
    charges,
    fromDate,
    days: 30
  })

  const monthMetrics = typeof window.getMonthMetrics === 'function'
    ? (window.NexoraMetricsCache?.getCachedMonthMetrics
      ? window.NexoraMetricsCache.getCachedMonthMetrics(monthKey, () => window.getMonthMetrics(monthKey, { fromDom: true }))
      : window.getMonthMetrics(monthKey, { fromDom: true }))
    : { income: Math.max(scheduledRevenue, budgetRevenue), expenses: totalCharges, paidExpenses: 0 }
  const totalRevenue = Number(monthMetrics?.income) || 0
  const totalFixedCharges = Number(monthMetrics?.fixed) || Math.max(0, totalCharges - (Number(monthMetrics?.variable) || 0))
  const totalVariableCharges = Number(monthMetrics?.variable) || 0
  const cycleBalances = computeCycleBalancesFromMetrics(monthMetrics)
  const targetFromBudget = typeof window.getVal === 'function'
    ? Number(window.getVal('target_epargne') || 0)
    : Number(parseAmount(document.querySelector('[data-key="target_epargne"]')?.value || 0) || 0)
  const monthlyGoalContribution = Number(parseAmount(document.getElementById('goal-monthly-contrib')?.value || 0) || 0)
  const targetSavings = targetFromBudget > 0
    ? targetFromBudget
    : monthlyGoalContribution > 0
      ? monthlyGoalContribution
      : totalRevenue > 0
        ? Math.round(totalRevenue * 0.1)
        : 0

  return {
    timeline,
    endingBalance,
    projectedEndOfCycle: cycleBalances.projectedEndOfCycle,
    currentBalance: cycleBalances.currentBalance,
    baseBalance: cycleBalances.currentBalance,
    totalRevenue,
    totalCharges,
    totalFixedCharges,
    totalVariableCharges,
    paidExpenses: Number(monthMetrics?.paidExpenses) || 0,
    targetSavings,
    toPayNow,
    goals,
    debts: await readDebts()
  }
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
    window.NexoraMotion?.animateCards?.(root)
    window.NexoraMotion?.animateTimeline?.(root)
    window.NexoraMotion?.animateKpiNumbers?.(root)
  } catch (error) {
    console.warn('[PlanHub] render failed', error)
    root.innerHTML = buildEmptyState()
  }
}

export async function updatePlanHub(rootId = 'plan-root') {
  await renderPlanHub(rootId)
}

export default { renderPlanHub, updatePlanHub }
