const safeNumber = (value, fallback = 0) => {
  const number = Number(value)
  return Number.isFinite(number) ? number : fallback
}

const formatEuro = (value) => `${Math.round(safeNumber(value)).toLocaleString('fr-FR')} €`

const getPrimaryGoalRemaining = (context = {}) => {
  const goal = context.primaryGoal || (Array.isArray(context.goals) ? context.goals.find((item) => item?.isPrimary) || context.goals[0] : null)
  if (!goal) return { goal: null, remaining: 0 }
  return {
    goal,
    remaining: Math.max(0, safeNumber(goal.target) - safeNumber(goal.current))
  }
}

const buildScenario = ({ id, label, savingRate, risk, context, debtBoost = 0, advice }) => {
  const income = safeNumber(context.income)
  const expenses = safeNumber(context.expenses, safeNumber(context.fixedExpenses) + safeNumber(context.variableExpenses))
  const baseBalance = safeNumber(context.projectedBalance, income - expenses)
  const possibleSaving = Math.max(0, Math.round(baseBalance * savingRate))
  const boostedDebtPayment = Math.min(Math.max(0, baseBalance - possibleSaving), debtBoost)
  const plannedOut = possibleSaving + boostedDebtPayment
  const projectedBalance = Math.round(baseBalance - plannedOut)
  const { goal, remaining } = getPrimaryGoalRemaining(context)
  const goalImpact = goal
    ? possibleSaving > 0
      ? `${formatEuro(Math.min(possibleSaving, remaining))} vers ${goal.name || 'l’objectif principal'}`
      : `Aucun versement conseillé sur ${goal.name || 'l’objectif principal'}`
    : possibleSaving > 0
      ? `${formatEuro(possibleSaving)} à placer en épargne de sécurité`
      : 'Aucun objectif principal à alimenter'

  return {
    id,
    label,
    projectedBalance,
    possibleSaving,
    primaryGoalImpact: goalImpact,
    debtImpact: boostedDebtPayment > 0 ? `${formatEuro(boostedDebtPayment)} de remboursement accéléré possible` : 'Pas de remboursement accéléré',
    risk,
    advice
  }
}

export function generateScenarios(context = {}) {
  const income = safeNumber(context.income)
  if (income <= 0) {
    return [
      {
        id: 'prudent',
        label: 'Prudent',
        projectedBalance: 0,
        possibleSaving: 0,
        primaryGoalImpact: 'À compléter',
        debtImpact: 'À compléter',
        risk: 'indéfini',
        advice: 'Données à compléter : renseigne tes revenus pour activer le scénario prudent.'
      },
      {
        id: 'equilibre',
        label: 'Équilibré',
        projectedBalance: 0,
        possibleSaving: 0,
        primaryGoalImpact: 'À compléter',
        debtImpact: 'À compléter',
        risk: 'indéfini',
        advice: 'Données à compléter : ajoute revenus et charges pour le scénario équilibré.'
      },
      {
        id: 'agressif',
        label: 'Agressif',
        projectedBalance: 0,
        possibleSaving: 0,
        primaryGoalImpact: 'À compléter',
        debtImpact: 'À compléter',
        risk: 'indéfini',
        advice: 'Données à compléter : le scénario agressif s’affichera avec un budget complet.'
      }
    ]
  }

  return [
    buildScenario({
      id: 'prudent',
      label: 'Prudent',
      savingRate: 0.25,
      risk: 'faible',
      context,
      advice: 'Garde une marge élevée et avance doucement.'
    }),
    buildScenario({
      id: 'equilibre',
      label: 'Équilibré',
      savingRate: 0.45,
      risk: 'modéré',
      context,
      debtBoost: 25,
      advice: 'Alimente l’objectif tout en gardant les charges couvertes.'
    }),
    buildScenario({
      id: 'agressif',
      label: 'Agressif',
      savingRate: 0.7,
      risk: 'élevé',
      context,
      debtBoost: 75,
      advice: 'Accélère objectif ou dette seulement si aucune échéance proche ne menace ta marge.'
    })
  ]
}

export default { generateScenarios }
