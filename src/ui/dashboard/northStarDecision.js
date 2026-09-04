const toFiniteNumber = (value, fallback = 0) => {
  const number = Number(value)
  return Number.isFinite(number) ? number : fallback
}

const formatEuro = (value) => {
  const amount = toFiniteNumber(value)
  const fractionDigits = Number.isInteger(amount) ? 0 : 2
  return `${amount.toLocaleString('fr-FR', { minimumFractionDigits: fractionDigits, maximumFractionDigits: fractionDigits })} €`
}

const actionFor = (label, targetSection = null) => ({ label, targetSection })

/**
 * Deterministic decision layer for the North Star dashboard.
 * It consumes dashboard metrics already produced by updateAll().
 */
export function buildNorthStarDecision(metrics = {}) {
  const income = toFiniteNumber(metrics.revReel)
  const projected = toFiniteNumber(metrics.solde)
  const current = toFiniteNumber(metrics.soldeEstime, projected)
  const available = toFiniteNumber(metrics.safetyMargin, Math.max(0, current))
  const variableExpenses = Math.max(0, toFiniteNumber(metrics.varReel))
  const variablesPct = Math.max(0, toFiniteNumber(metrics.variablesPct))
  const totalExpenses = Math.max(0, toFiniteNumber(metrics.fixReel) + variableExpenses)
  const hasAnyBudgetData = income > 0 || totalExpenses > 0
  const isHydrating = metrics.loading === true || metrics.hydrating === true || metrics.hydrationComplete === false

  if (isHydrating || !hasAnyBudgetData) {
    return {
      tone: 'neutral',
      label: 'Données insuffisantes',
      title: 'Ajoute les montants qui manquent pour décider.',
      why: 'Nexora a besoin de revenus et de dépenses renseignés pour calculer une priorité fiable.',
      action: actionFor('Compléter le budget', 'saisie'),
      priority: 'data'
    }
  }

  if (projected < 0) {
    const amountToCover = Math.abs(projected)
    const reduction = Math.min(variableExpenses, amountToCover)
    const action = reduction > 0
      ? `Réduire les dépenses variables de ${formatEuro(reduction)}`
      : 'Vérifier les charges prévues'
    return {
      tone: 'danger',
      label: 'Risque immédiat',
      title: 'Ton solde de fin de cycle risque de passer dans le rouge.',
      why: `Les dépenses prévues dépassent ta trajectoire de ${formatEuro(amountToCover)}${variablesPct > 0 ? ` et les variables représentent ${Math.round(variablesPct)} % de tes revenus` : ''}.`,
      action: actionFor(action, 'saisie'),
      priority: 'projected-deficit'
    }
  }

  const marginFloor = income > 0 ? income * 0.1 : 0
  if (available < marginFloor || projected < marginFloor) {
    return {
      tone: 'warning',
      label: 'Attention',
      title: 'Ta marge de sécurité est faible.',
      why: `Il te reste ${formatEuro(Math.max(0, available))} de marge disponible pour ${formatEuro(income)} de revenus.`,
      action: actionFor('Vérifier les dépenses variables', 'saisie'),
      priority: 'low-margin'
    }
  }

  if (variablesPct > 40) {
    return {
      tone: 'warning',
      label: 'Attention',
      title: 'Tes dépenses variables méritent un contrôle.',
      why: `Elles représentent ${Math.round(variablesPct)} % de tes revenus, soit ${formatEuro(variableExpenses)}.`,
      action: actionFor('Revoir les dépenses variables', 'saisie'),
      priority: 'variable-overrun'
    }
  }

  return {
    tone: 'positive',
    label: 'Situation saine',
    title: 'Aucune priorité urgente détectée.',
    why: `Ta trajectoire reste positive avec ${formatEuro(Math.max(0, projected))} projetés en fin de cycle.`,
    action: actionFor('Surveiller la trajectoire'),
    priority: 'healthy'
  }
}

function jarvisMatchesPriority(decision, context) {
  const priorityId = context?.priority?.id
  const riskIds = new Set((context?.risks || []).map((risk) => risk?.id))
  if (decision.priority === 'projected-deficit') {
    return priorityId === 'fix_deficit' || riskIds.has('deficit') || riskIds.has('overdraft_risk')
  }
  if (decision.priority === 'low-margin') {
    return riskIds.has('overdraft_risk') || priorityId === 'fix_deficit'
  }
  if (decision.priority === 'variable-overrun') {
    return priorityId === 'reduce_variable_expenses' || riskIds.has('variable_expenses') || riskIds.has('high_variable_spending')
  }
  if (decision.priority === 'healthy') {
    return !context?.risks?.length && !priorityId
  }
  return decision.priority === 'data' && context?.dataQuality?.isComplete !== true
}

export function buildNorthStarJarvisEnrichment(decision, context = null) {
  if (!context || !jarvisMatchesPriority(decision, context)) return null

  if (context.dataQuality?.isComplete !== true) {
    return {
      tone: 'neutral',
      insight: 'Analyse limitée',
      facts: [],
      recommendation: null
    }
  }

  return {
    tone: decision.tone,
    insight: context.insight || null,
    facts: Array.isArray(context.supportingFacts) ? context.supportingFacts.slice(0, 3) : [],
    recommendation: context.recommendation || null
  }
}

export { formatEuro }
