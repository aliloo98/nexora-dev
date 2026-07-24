import { formatCurrency } from './planFormatters.js'
import { escapeHtml } from '../utils/htmlEscape.js'

export const buildPlanSteps = ({
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
      phase: "Aujourd'hui",
      title: "Saisir le salaire",
      detail: hasIncome
        ? `${formatCurrency(totalRevenue)} de revenus pris en compte.`
        : "Ajoutez au moins un revenu fiable pour activer le jugement.",
      complete: hasIncome
    },
    {
      phase: 'Ensuite',
      title: "Vérifier les charges",
      detail: hasCharges
        ? `${formatCurrency(totalCharges)} de charges prévues${toPayNow.length ? `, ${toPayNow.length} à traiter maintenant` : ''}.`
        : "Ajoutez les charges fixes et les échéances du mois.",
      complete: hasCharges
    },
    {
      phase: 'Puis',
      title: "Prévoir les dépenses variables",
      detail: hasVariables
        ? `${formatCurrency(totalVariableCharges)} de dépenses variables suivies.`
        : "Renseignez les dépenses flexibles pour fiabiliser la projection.",
      complete: hasVariables
    },
    {
      phase: 'Enfin',
      title: `Épargner ${formatCurrency(savingsTarget)}`,
      detail: savingsReached
        ? "L'objectif d'épargne du mois est couvert par la projection."
        : hasIncome
          ? `${formatCurrency(Math.max(0, savingsTarget - Number(cycleBalanceDisplay || 0)))} manquent pour couvrir l'objectif.`
          : "L'objectif sera calculé dès que les revenus seront saisis.",
      complete: savingsReached
    }
  ]
}

export const buildRecommendedTasks = ({ steps = [], toPayNow = [], judgment, goals = [], debts = [], targetSavings = 0, cycleBalanceDisplay = 0 } = {}) => {
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
      title: "Traiter les paiements proches",
      detail: `${toPayNow.length} paiement${toPayNow.length > 1 ? 's' : ''} à vérifier, pour ${formatCurrency(amount)}.`
    })
  }

  if (judgment?.primaryProblem?.kind === 'variables') {
    tasks.push({
      title: "Limiter les variables",
      detail: 'Réduisez les dépenses flexibles avant de financer une nouvelle priorité.'
    })
  }

  const primaryGoal = goals.find((goal) => goal?.isPrimary) || goals[0]
  if (primaryGoal && Number(primaryGoal.target) > Number(primaryGoal.current)) {
    tasks.push({
      title: "Faire avancer l'objectif principal",
      detail: `${primaryGoal.name || 'Objectif'} : ${formatCurrency(Math.max(0, Number(primaryGoal.target) - Number(primaryGoal.current)))} restants.`
    })
  }

  if (debts.some((debt) => Number(debt.remaining) > 0)) {
    tasks.push({
      title: "Surveiller les dettes actives",
      detail: 'Gardez la mensualité prévue avant toute allocation supplémentaire.'
    })
  }

  if (Number(targetSavings) > 0 && Number(cycleBalanceDisplay) < Number(targetSavings)) {
    tasks.push({
      title: "Protéger l'épargne du mois",
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

export const buildNexoraAdvice = ({ judgment, timeline = [], cycleBalanceDisplay = 0, targetSavings = 0 } = {}) => {
  const advice = [
    {
      title: "Pourquoi maintenant",
      detail: judgment?.why || 'Le plan se met à jour avec les données du mois.'
    },
    {
      title: "Impact attendu",
      detail: judgment?.impact || 'La projection deviendra plus fiable avec les revenus et charges.'
    }
  ]

  if (timeline.length) {
    advice.push({
      title: "Lecture du mois",
      detail: `${timeline.length} mouvement${timeline.length > 1 ? 's' : ''} alimentent la timeline de décision.`
    })
  } else {
    advice.push({
      title: 'Timeline',
      detail: "Ajoutez des échéances pour transformer le plan en calendrier d'action."
    })
  }

  if (Number(targetSavings) > 0) {
    advice.push({
      title: 'Épargne',
      detail: Number(cycleBalanceDisplay) >= Number(targetSavings)
        ? "L'objectif mensuel est couvert : gardez la trajectoire."
        : "Priorisez la marge avant d'augmenter les allocations."
    })
  }

  return advice.slice(0, 4)
}

export const buildPlanDecisionHub = ({ judgment, steps, tasks, advice, cycleBalanceDisplay, targetSavings }) => {
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
          <em>Objectif d'épargne : ${formatCurrency(targetSavings)}</em>
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
