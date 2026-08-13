import { formatCurrency, formatShortDate, escapeAttr } from './planFormatters.js'
import { escapeHtml } from '../utils/htmlEscape.js'
import { buildPlanSteps, buildRecommendedTasks, buildNexoraAdvice, buildPlanDecisionHub } from './planDecisionBuilder.js'
import { buildJudgmentEngine } from '../assistant/judgmentEngine.js'

export const buildPlanRows = (items, options = {}) => {
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

export const buildTodayActionCard = (judgment) => {
  const action = String(judgment?.action || '').trim()
  const why = String(judgment?.why || '').trim()

  if (!action) {
    return `
      <section class="plan-card">
        <div class="plan-card-header"><h3>Ce qu'il faut faire aujourd'hui</h3></div>
        <div class="plan-empty-line">Aucune action prioritaire disponible pour le moment.</div>
      </section>
    `
  }

  const problemKind = judgment?.primaryProblem?.kind || ''
  const isBudgetAction = ['income', 'charges', 'balance', 'buffer'].includes(problemKind)
  const ctaLabel = problemKind === 'income' ? 'Saisir mes revenus' : 'Vérifier mon budget'

  return `
    <section class="plan-card">
      <div class="plan-card-header"><h3>Ce qu'il faut faire aujourd'hui</h3></div>
      <div class="plan-card-body">
        <strong>${escapeHtml(action)}</strong>
        ${why ? `<p>${escapeHtml(why)}</p>` : ''}
        ${isBudgetAction ? `<button class="btn btn-gold" data-plan-action="navigate-budget">${escapeHtml(ctaLabel)}</button>` : ''}
      </div>
    </section>
  `
}

export const buildPlanContent = (data) => {
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
        <div class="plan-card-header"><h3>Priorités d'épargne</h3></div>
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
