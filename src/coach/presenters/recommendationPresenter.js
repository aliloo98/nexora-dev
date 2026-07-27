const currencyFormatter = new Intl.NumberFormat('fr-FR', {
  style: 'currency',
  currency: 'EUR',
  minimumFractionDigits: 0,
  maximumFractionDigits: 2
})

const numberFormatter = new Intl.NumberFormat('fr-FR', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2
})

export const formatEuro = value => currencyFormatter.format(Number(value) || 0)
export const formatNumber = value => numberFormatter.format(Number(value) || 0)
export const formatDays = value => `${formatNumber(value)} ${Number(value) === 1 ? 'jour' : 'jours'}`
export const formatRate = value => `${formatNumber(value)} %`

const actionLabels = {
  'coach.action.completeBudget': 'Compléter mon budget',
  'coach.action.reviewBudget': 'Réviser mon budget',
  'coach.action.protectRemainder': 'Protéger mon reste à vivre',
  'coach.action.reviewExpenses': 'Analyser mes dépenses',
  'coach.action.viewGoal': 'Voir mon objectif',
  'coach.action.planSavings': 'Planifier cette épargne',
  'coach.action.keepCourse': 'Voir mon plan'
}

const messagePresenters = {
  'coach.dataCompleteness': (params) => {
    const missing = Array.isArray(params.missingFields) ? params.missingFields : []
    const labels = missing.map(field => field === 'income' ? 'tes revenus' : field === 'expenses' ? 'tes dépenses' : field)
    return {
      title: 'Complète ton budget',
      message: labels.length > 0
        ? `Renseigne ${labels.join(' et ')} pour obtenir une recommandation fiable.`
        : 'Complète les informations essentielles pour obtenir une recommandation fiable.',
      formattedEvidence: labels.map(label => ({ label: 'Donnée manquante', value: label }))
    }
  },

  'coach.projectedDeficit': (params) => ({
    title: 'Évite un solde négatif',
    message: `À ce rythme, le mois se terminera avec un déficit de ${formatEuro(params.deficit)}.`,
    formattedEvidence: [
      { label: 'Déficit projeté', value: formatEuro(params.deficit) }
    ]
  }),

  'coach.criticalRemainder': (params) => ({
    title: 'Protège ton reste à vivre',
    message: `Il te reste ${formatEuro(params.dailyRemainder)} par jour pendant ${formatDays(params.remainingDays)}.`,
    formattedEvidence: [
      { label: 'Disponible par jour', value: formatEuro(params.dailyRemainder) },
      { label: 'Jours restants', value: formatDays(params.remainingDays) }
    ]
  }),

  'coach.expenseRate': (params) => ({
    title: 'Réduis la pression des dépenses',
    message: `Tes dépenses prévues représentent ${formatRate(params.expenseRate)} de tes revenus.`,
    formattedEvidence: [
      { label: 'Dépenses prévues', value: formatEuro(params.plannedExpenses) },
      { label: 'Part des revenus', value: formatRate(params.expenseRate) }
    ]
  }),

  'coach.goalPace': (params) => ({
    title: `Accélère l’objectif ${params.goalName || ''}`.trim(),
    message: `Pour l’atteindre à temps, prévois ${formatEuro(params.requiredDaily)} par jour, soit ${formatEuro(params.requiredMonthly)} par mois.`,
    formattedEvidence: [
      { label: 'Montant restant', value: formatEuro(params.remaining) },
      { label: 'Délai restant', value: formatDays(params.daysRemaining) }
    ]
  }),

  'coach.allocatableSurplus': (params) => ({
    title: 'Transforme ta marge en épargne',
    message: `Tu peux encore affecter ${formatEuro(params.allocatableAmount)} à ton épargne ce mois-ci.`,
    formattedEvidence: [
      { label: 'Marge de sécurité conservée', value: formatEuro(params.securityMargin) },
      { label: 'Solde conservé après allocation', value: formatEuro(params.retainedAfterAllocation) }
    ]
  }),

  'coach.stableForecast': (params) => ({
    title: 'Garde le cap',
    message: `Tu pourrais clôturer ce mois avec ${formatEuro(params.projectedBalance)} disponibles.`,
    formattedEvidence: [
      { label: 'Solde projeté', value: formatEuro(params.projectedBalance) }
    ]
  })
}

export function presentRecommendation(recommendation) {
  const presenter = messagePresenters[recommendation?.messageKey]
  const presented = presenter
    ? presenter(recommendation.messageParams || {})
    : {
        title: 'Recommandation Nexora',
        message: 'Une recommandation financière est disponible.',
        formattedEvidence: []
      }

  return Object.freeze({
    title: presented.title,
    message: presented.message,
    actionLabel: actionLabels[recommendation?.action?.labelKey] || 'Voir mon budget',
    formattedEvidence: Object.freeze(
      presented.formattedEvidence.map(item => Object.freeze({ ...item }))
    )
  })
}

export default { presentRecommendation, formatEuro, formatNumber, formatDays, formatRate }
