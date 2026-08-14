import { INTENTS, SCENARIO_TYPES } from './jarvisIntentParser.js'
import { simulateJarvisScenario } from './jarvisScenarioEngine.js'

const STATUS_LABELS = {
  no_income: 'Revenus manquants',
  critical: 'Situation critique',
  fragile: 'Situation fragile',
  stable: 'Situation stable',
  balanced: 'Situation équilibrée',
  strong: 'Situation saine',
  unknown: 'Analyse limitée'
}

const RISK_LABELS = {
  deficit: 'Déficit projeté',
  no_income: 'Revenus absents',
  overdraft_risk: 'Risque de découvert'
}

const SCENARIO_LABELS = {
  [SCENARIO_TYPES.ADD_EXPENSE]: 'Dépense supplémentaire',
  [SCENARIO_TYPES.REDUCE_EXPENSE]: 'Réduction de dépenses',
  [SCENARIO_TYPES.ADD_SAVINGS]: 'Épargne supplémentaire',
  [SCENARIO_TYPES.DEBT_EXTRA_PAYMENT]: 'Remboursement de dette'
}

function toFiniteNumber(value, fallback = 0) {
  const number = Number(value)
  return Number.isFinite(number) ? number : fallback
}

function isKnownNumber(value) {
  return Number.isFinite(Number(value))
}

function money(label, value, source) {
  return {
    label,
    value: toFiniteNumber(value),
    unit: 'EUR',
    source
  }
}

function percent(label, value, source) {
  return {
    label,
    value: toFiniteNumber(value),
    unit: 'PERCENT',
    source
  }
}

function fact(label, value, source) {
  return {
    label,
    value,
    unit: 'TEXT',
    source
  }
}

function hasIncome(snapshot) {
  return toFiniteNumber(snapshot?.cashflow?.income) > 0 || snapshot?.dataQuality?.hasIncome === true
}

function topRisk(snapshot) {
  const risks = Array.isArray(snapshot?.risks) ? snapshot.risks : []
  return risks[0] || null
}

function topPriority(snapshot) {
  const priorities = Array.isArray(snapshot?.priorities) ? snapshot.priorities : []
  return priorities[0] || null
}

function getDataQualityLimits(snapshot) {
  const issues = Array.isArray(snapshot?.dataQuality?.issues) ? snapshot.dataQuality.issues : []
  return issues.map(issue => {
    if (issue.code === 'NO_INCOME') return 'revenus non renseignés'
    if (issue.code === 'NO_EXPENSES') return 'dépenses insuffisantes'
    if (issue.code === 'INSUFFICIENT_HISTORY') return 'historique insuffisant'
    if (issue.code === 'NO_GOAL_DATA') return 'objectifs indisponibles'
    if (issue.code === 'NO_DEBT_DATA') return 'dettes indisponibles'
    return 'donnée partielle'
  })
}

function baseResponse(intent, overrides = {}) {
  return {
    id: `jarvis-${String(intent).toLowerCase()}`,
    intent,
    entity: overrides.entity || null,
    amount: typeof overrides.amount === 'number' ? overrides.amount : null,
    verdict: overrides.verdict || 'Analyse',
    title: overrides.title || 'Analyse Jarvis',
    summary: overrides.summary || '',
    tone: overrides.tone || 'neutral',
    evidence: overrides.evidence || [],
    impact: overrides.impact || [],
    actions: overrides.actions || defaultActions(),
    scenario: overrides.scenario || null,
    dataQuality: {
      limits: overrides.dataQuality?.limits || [],
      blocking: overrides.dataQuality?.blocking === true
    }
  }
}

function defaultActions() {
  return [
    { label: 'Voir la priorité', intent: INTENTS.PRIORITY },
    { label: 'Analyser les dépenses', intent: INTENTS.EXPENSE_ANALYSIS },
    { label: 'Simuler une dépense', intent: INTENTS.AFFORDABILITY }
  ]
}

function responseFacts(response) {
  const facts = [...(response.evidence || []), ...(response.impact || [])]
  if (response.scenario?.before) {
    for (const [key, value] of Object.entries(response.scenario.before)) {
      if (isKnownNumber(value)) facts.push(money(`Avant ${key}`, value, `scenario.before.${key}`))
    }
  }
  if (response.scenario?.after) {
    for (const [key, value] of Object.entries(response.scenario.after)) {
      if (isKnownNumber(value)) facts.push(money(`Après ${key}`, value, `scenario.after.${key}`))
    }
  }
  return facts
}

function withTrace(response) {
  return {
    ...response,
    financialFacts: responseFacts(response)
  }
}

function composeGlobalStatus(snapshot) {
  const risk = topRisk(snapshot)
  const priority = topPriority(snapshot)
  const status = snapshot?.health?.status || 'unknown'
  const margin = toFiniteNumber(snapshot?.cashflow?.projected)
  const evidence = [
    money('Revenus', snapshot?.cashflow?.income, 'snapshot.cashflow.income'),
    money('Dépenses prévues', snapshot?.cashflow?.expenses, 'snapshot.cashflow.expenses'),
    money('Marge projetée', margin, 'snapshot.cashflow.projected')
  ]

  if (risk?.evidence?.deficit) evidence.push(money('Déficit', risk.evidence.deficit, 'snapshot.risks[0].evidence.deficit'))
  if (snapshot?.forecast?.finalBalance !== undefined) {
    evidence.push(money('Fin de mois estimée', snapshot.forecast.finalBalance, 'snapshot.forecast.finalBalance'))
  }

  if (!hasIncome(snapshot)) {
    return baseResponse(INTENTS.GLOBAL_STATUS, {
      verdict: 'Analyse limitée',
      title: 'Il manque les revenus du mois.',
      summary: 'Je peux lire tes dépenses, mais je ne peux pas juger correctement la trajectoire sans revenu renseigné.',
      tone: 'warning',
      evidence,
      dataQuality: { limits: getDataQualityLimits(snapshot), blocking: true },
      actions: [
        { label: 'Saisir les revenus', target: 'saisie' },
        { label: 'Voir la priorité', intent: INTENTS.PRIORITY }
      ]
    })
  }

  return baseResponse(INTENTS.GLOBAL_STATUS, {
    verdict: STATUS_LABELS[status] || 'Analyse disponible',
    title: priority?.action || STATUS_LABELS[status] || 'Point budget',
    summary: risk
      ? `Le point principal à surveiller est ${RISK_LABELS[risk.id] || risk.id}.`
      : 'Aucun risque majeur ne ressort du snapshot actuel.',
    tone: status === 'critical' ? 'critical' : status === 'fragile' ? 'warning' : 'stable',
    entity: risk?.id || priority?.id || null,
    evidence,
    actions: [
      { label: 'Pourquoi ?', intent: INTENTS.WHY_STATUS },
      { label: 'Voir le risque', intent: INTENTS.TOP_RISK },
      { label: 'Simuler une dépense', intent: INTENTS.AFFORDABILITY }
    ],
    dataQuality: { limits: getDataQualityLimits(snapshot) }
  })
}

function composeWhyStatus(snapshot, context = {}) {
  const risk = topRisk(snapshot)
  const facts = []
  const reasons = []
  const fixed = toFiniteNumber(snapshot?.budget?.fixed)
  const variable = toFiniteNumber(snapshot?.budget?.variable)
  const income = toFiniteNumber(snapshot?.cashflow?.income)
  const projected = toFiniteNumber(snapshot?.cashflow?.projected)

  if (!hasIncome(snapshot)) {
    reasons.push('les revenus du mois ne sont pas renseignés')
    facts.push(money('Revenus', income, 'snapshot.cashflow.income'))
  }
  if (projected < 0) {
    reasons.push('la marge projetée passe sous zéro')
    facts.push(money('Marge projetée', projected, 'snapshot.cashflow.projected'))
  }
  if (income > 0 && fixed / income > 0.7) {
    reasons.push('les charges fixes pèsent fortement sur le revenu')
    facts.push(money('Charges fixes', fixed, 'snapshot.budget.fixed'))
    facts.push(money('Revenus', income, 'snapshot.cashflow.income'))
  }
  if (risk?.id === 'overdraft_risk') {
    reasons.push('le forecast signale un point bas sensible')
    facts.push(money('Point bas estimé', snapshot.forecast.lowestBalance, 'snapshot.forecast.lowestBalance'))
  }
  if (variable > fixed && variable > 0) {
    reasons.push('les dépenses variables dépassent les charges fixes')
    facts.push(money('Dépenses variables', variable, 'snapshot.budget.variable'))
    facts.push(money('Charges fixes', fixed, 'snapshot.budget.fixed'))
  }

  if (reasons.length === 0) {
    reasons.push('le snapshot ne montre pas de facteur négatif dominant')
    facts.push(money('Marge projetée', projected, 'snapshot.cashflow.projected'))
  }

  return baseResponse(INTENTS.WHY_STATUS, {
    verdict: 'Explication',
    title: context.lastIntent === INTENTS.TOP_RISK && risk
      ? `Ce risque vient de ${RISK_LABELS[risk.id] || risk.id}.`
      : 'Voici ce qui pèse le plus dans l’analyse.',
    summary: reasons.slice(0, 3).join(' ; ') + '.',
    tone: projected < 0 || !hasIncome(snapshot) ? 'warning' : 'neutral',
    entity: risk?.id || null,
    evidence: facts,
    actions: [
      { label: 'Action prioritaire', intent: INTENTS.PRIORITY },
      { label: 'Prévision', intent: INTENTS.FORECAST }
    ],
    dataQuality: { limits: getDataQualityLimits(snapshot) }
  })
}

function composeTopRisk(snapshot) {
  const risk = topRisk(snapshot)
  if (!risk) {
    return baseResponse(INTENTS.TOP_RISK, {
      verdict: 'Risque faible',
      title: 'Aucun risque prioritaire n’est détecté.',
      summary: 'Je reste limité par la qualité des données disponibles si certaines sources sont absentes.',
      tone: 'stable',
      evidence: [money('Marge projetée', snapshot?.cashflow?.projected, 'snapshot.cashflow.projected')],
      dataQuality: { limits: getDataQualityLimits(snapshot) }
    })
  }

  const evidence = []
  for (const [key, value] of Object.entries(risk.evidence || {})) {
    if (isKnownNumber(value)) evidence.push(money(key, value, `snapshot.risks[0].evidence.${key}`))
  }

  return baseResponse(INTENTS.TOP_RISK, {
    verdict: risk.severity === 'critical' ? 'Risque critique' : 'Point de vigilance',
    title: RISK_LABELS[risk.id] || risk.id,
    summary: 'C’est le signal le plus important dans la hiérarchie J4 actuelle.',
    tone: risk.severity === 'critical' ? 'critical' : 'warning',
    entity: risk.id,
    evidence,
    actions: [
      { label: 'Pourquoi ?', intent: INTENTS.EXPLAIN_RECOMMENDATION },
      { label: 'Que faire ?', intent: INTENTS.PRIORITY }
    ],
    dataQuality: { limits: getDataQualityLimits(snapshot) }
  })
}

function composePriority(snapshot) {
  const priority = topPriority(snapshot)
  if (!priority) {
    return baseResponse(INTENTS.PRIORITY, {
      verdict: 'Pas d’action urgente',
      title: 'Aucune priorité forte n’est détectée.',
      summary: 'Le snapshot ne remonte pas de risque ou d’opportunité qui demande une action immédiate.',
      tone: 'stable',
      evidence: [money('Marge projetée', snapshot?.cashflow?.projected, 'snapshot.cashflow.projected')],
      dataQuality: { limits: getDataQualityLimits(snapshot) }
    })
  }

  return baseResponse(INTENTS.PRIORITY, {
    verdict: 'Priorité',
    title: priority.action || 'Priorité actuelle',
    summary: 'Cette action est issue de la priorité la mieux classée par J4.',
    tone: priority.severity === 'critical' ? 'critical' : priority.severity === 'high' ? 'warning' : 'neutral',
    entity: priority.id,
    evidence: [
      fact('Domaine', priority.domain || 'budget', 'snapshot.priorities[0].domain'),
      fact('Sévérité', priority.severity || 'normal', 'snapshot.priorities[0].severity'),
      money('Marge projetée', snapshot?.cashflow?.projected, 'snapshot.cashflow.projected')
    ],
    actions: [
      { label: 'Pourquoi ?', intent: INTENTS.EXPLAIN_RECOMMENDATION },
      { label: 'Simuler une dépense', intent: INTENTS.AFFORDABILITY }
    ],
    dataQuality: { limits: getDataQualityLimits(snapshot) }
  })
}

function composeScenarioResponse(intent, snapshot, parsed) {
  const scenario = simulateJarvisScenario(snapshot, {
    type: parsed.scenarioType || SCENARIO_TYPES.ADD_EXPENSE,
    amount: parsed.amount
  })

  if (!scenario.ok) {
    return baseResponse(intent, {
      verdict: 'Simulation impossible',
      title: scenario.reason === 'missing_amount' ? 'Il me manque le montant.' : 'Les données de dette sont insuffisantes.',
      summary: 'Je peux simuler une dépense, une réduction de dépenses ou une épargne dès que le montant est clair.',
      tone: 'warning',
      amount: parsed.amount || null,
      dataQuality: { limits: getDataQualityLimits(snapshot), blocking: true }
    })
  }

  const afterRisk = scenario.risk.after
  const isPositive = scenario.after.margin >= 0
  const title = parsed.scenarioType === SCENARIO_TYPES.ADD_EXPENSE
    ? (isPositive ? 'Possible, avec impact sur ta marge.' : 'À éviter : la marge passerait sous zéro.')
    : `${SCENARIO_LABELS[scenario.type]} simulée.`

  return baseResponse(intent, {
    verdict: isPositive ? 'Simulation viable' : 'Simulation risquée',
    title,
    summary: 'Voici l’impact avant/après, sans modification de tes données.',
    tone: afterRisk === 'critical' ? 'critical' : afterRisk === 'high' ? 'warning' : 'stable',
    amount: scenario.amount,
    scenario,
    evidence: [
      money('Montant demandé', scenario.amount, 'user.request.amount'),
      money('Marge avant', scenario.before.margin, 'scenario.before.margin'),
      money('Marge après', scenario.after.margin, 'scenario.after.margin')
    ],
    impact: [
      money('Impact marge', scenario.diff.margin, 'scenario.diff.margin'),
      money('Fin de mois après', scenario.after.forecastFinalBalance, 'scenario.after.forecastFinalBalance')
    ],
    actions: [
      { label: 'Tester un autre montant', intent, scenarioType: scenario.type },
      { label: 'Voir la priorité', intent: INTENTS.PRIORITY }
    ],
    dataQuality: { limits: getDataQualityLimits(snapshot) }
  })
}

function composeRemainingSpend(snapshot) {
  return baseResponse(INTENTS.REMAINING_SPEND, {
    verdict: 'Marge prévisionnelle',
    title: 'Je distingue marge et solde bancaire.',
    summary: 'La marge correspond à ce qu’il reste après les dépenses prévues du mois.',
    tone: toFiniteNumber(snapshot?.cashflow?.projected) < 0 ? 'warning' : 'stable',
    evidence: [
      money('Marge projetée', snapshot?.cashflow?.projected, 'snapshot.cashflow.projected'),
      money('Dépenses restantes prévues', snapshot?.cashflow?.remaining, 'snapshot.cashflow.remaining'),
      money('Solde courant estimé', snapshot?.cashflow?.current, 'snapshot.cashflow.current')
    ],
    actions: [
      { label: 'Simuler une dépense', intent: INTENTS.AFFORDABILITY },
      { label: 'Prévision fin de mois', intent: INTENTS.FORECAST }
    ],
    dataQuality: { limits: getDataQualityLimits(snapshot) }
  })
}

function composeSavings(snapshot) {
  const amount = toFiniteNumber(snapshot?.savings?.amount)
  return baseResponse(INTENTS.SAVINGS, {
    verdict: amount > 0 ? 'Épargne possible' : 'Épargne fragile',
    title: amount > 0 ? 'Ton épargne dépend de la marge projetée.' : 'Le mois ne dégage pas encore de marge.',
    summary: 'J’utilise l’épargne calculée par J4, pas une cible inventée.',
    tone: amount > 0 ? 'stable' : 'warning',
    evidence: [
      money('Épargne projetée', snapshot?.savings?.amount, 'snapshot.savings.amount'),
      percent('Taux d’épargne', snapshot?.savings?.rate, 'snapshot.savings.rate'),
      money('Marge projetée', snapshot?.cashflow?.projected, 'snapshot.cashflow.projected')
    ],
    actions: [
      { label: 'Et si j’épargne plus ?', intent: INTENTS.WHAT_IF, scenarioType: SCENARIO_TYPES.ADD_SAVINGS },
      { label: 'Objectif', intent: INTENTS.GOAL }
    ],
    dataQuality: { limits: getDataQualityLimits(snapshot) }
  })
}

function composeExpenseAnalysis(snapshot) {
  const categories = Array.isArray(snapshot?.budget?.categories) ? snapshot.budget.categories : []
  const expenses = categories
    .filter(item => item && item.type !== 'income' && toFiniteNumber(item.amount) > 0)
    .sort((a, b) => toFiniteNumber(b.amount) - toFiniteNumber(a.amount))

  if (expenses.length > 0) {
    const top = expenses[0]
    return baseResponse(INTENTS.EXPENSE_ANALYSIS, {
      verdict: 'Poste principal',
      title: top.name || top.id || 'Dépense principale',
      summary: 'Je me limite aux catégories réellement présentes dans ton budget.',
      tone: 'neutral',
      entity: top.id || null,
      evidence: expenses.slice(0, 3).map((item, index) => money(
        item.name || item.id || `Poste ${index + 1}`,
        item.amount,
        `snapshot.budget.categories[${index}].amount`
      )),
      actions: [
        { label: 'Simuler une réduction', intent: INTENTS.WHAT_IF, scenarioType: SCENARIO_TYPES.REDUCE_EXPENSE },
        { label: 'Voir la priorité', intent: INTENTS.PRIORITY }
      ],
      dataQuality: { limits: getDataQualityLimits(snapshot) }
    })
  }

  return baseResponse(INTENTS.EXPENSE_ANALYSIS, {
    verdict: 'Analyse par grands postes',
    title: 'Le détail par catégorie n’est pas disponible dans ce snapshot.',
    summary: 'Je peux seulement distinguer charges fixes et dépenses variables.',
    tone: 'neutral',
    evidence: [
      money('Charges fixes', snapshot?.budget?.fixed, 'snapshot.budget.fixed'),
      money('Dépenses variables', snapshot?.budget?.variable, 'snapshot.budget.variable'),
      money('Dépenses totales', snapshot?.budget?.total, 'snapshot.budget.total')
    ],
    dataQuality: { limits: [...getDataQualityLimits(snapshot), 'catégories détaillées absentes'] }
  })
}

function composeHistory(snapshot) {
  const trends = snapshot?.trends || {}
  if (trends.available !== true) {
    return baseResponse(INTENTS.HISTORY_COMPARE, {
      verdict: 'Historique insuffisant',
      title: 'Je ne peux pas comparer proprement avec le mois dernier.',
      summary: 'Il faut au moins deux points historiques exploitables pour éviter une fausse tendance.',
      tone: 'warning',
      evidence: [],
      dataQuality: { limits: [...getDataQualityLimits(snapshot), 'comparaison historique indisponible'], blocking: true }
    })
  }

  const comparison = trends.comparison || {}
  return baseResponse(INTENTS.HISTORY_COMPARE, {
    verdict: 'Comparaison disponible',
    title: `Revenus ${trends.income}, dépenses ${trends.expenses}.`,
    summary: 'Cette comparaison utilise uniquement l’historique disponible dans le contrat J4.',
    tone: trends.expenses === 'up' ? 'warning' : 'neutral',
    evidence: [
      money('Revenus actuels', comparison.income?.current, 'snapshot.trends.comparison.income.current'),
      money('Revenus précédents', comparison.income?.previous, 'snapshot.trends.comparison.income.previous'),
      money('Dépenses actuelles', comparison.expenses?.current, 'snapshot.trends.comparison.expenses.current'),
      money('Dépenses précédentes', comparison.expenses?.previous, 'snapshot.trends.comparison.expenses.previous')
    ],
    dataQuality: { limits: getDataQualityLimits(snapshot) }
  })
}

function composeGoal(snapshot) {
  const goal = snapshot?.goal
  if (!goal) {
    return baseResponse(INTENTS.GOAL, {
      verdict: 'Objectif absent',
      title: 'Aucun objectif exploitable n’est présent dans le snapshot.',
      summary: 'Je peux t’aider dès qu’un objectif avec cible existe.',
      tone: 'neutral',
      dataQuality: { limits: [...getDataQualityLimits(snapshot), 'objectif absent'] },
      actions: [{ label: 'Voir les objectifs', target: 'objectifs' }]
    })
  }

  return baseResponse(INTENTS.GOAL, {
    verdict: goal.isReached ? 'Objectif atteint' : 'Objectif en cours',
    title: goal.status === 'late' ? 'Le rythme actuel semble insuffisant.' : 'Le suivi objectif est disponible.',
    summary: 'Je m’appuie sur la cible, le montant actuel et l’effort calculé.',
    tone: goal.status === 'late' ? 'warning' : 'stable',
    evidence: [
      money('Cible', goal.target, 'snapshot.goal.target'),
      money('Actuel', goal.current, 'snapshot.goal.current'),
      money('Restant', goal.remaining, 'snapshot.goal.remaining'),
      percent('Progression', goal.progress, 'snapshot.goal.progress'),
      money('Effort mensuel', goal.monthlyEffort, 'snapshot.goal.monthlyEffort')
    ],
    actions: [
      { label: 'Et si j’épargne plus ?', intent: INTENTS.WHAT_IF, scenarioType: SCENARIO_TYPES.ADD_SAVINGS },
      { label: 'Voir les objectifs', target: 'objectifs' }
    ],
    dataQuality: { limits: getDataQualityLimits(snapshot) }
  })
}

function composeDebt(snapshot) {
  const debt = snapshot?.debt
  if (!debt) {
    return baseResponse(INTENTS.DEBT, {
      verdict: 'Aucune dette active',
      title: 'Je ne détecte pas de dette exploitable.',
      summary: 'Je ne vais pas inventer de remboursement sans donnée de dette.',
      tone: 'stable',
      dataQuality: { limits: getDataQualityLimits(snapshot) }
    })
  }

  return baseResponse(INTENTS.DEBT, {
    verdict: 'Dette détectée',
    title: 'La priorité de remboursement dépend du total et des mensualités.',
    summary: 'La simulation J4 utilise la méthode avalanche lorsque les données le permettent.',
    tone: 'warning',
    evidence: [
      money('Dette totale', debt.total, 'snapshot.debt.total'),
      money('Mensualités', debt.monthlyTotal, 'snapshot.debt.monthlyTotal'),
      fact('Durée estimée', debt.payoffMonths, 'snapshot.debt.payoffMonths'),
      money('Intérêts estimés', debt.totalInterest, 'snapshot.debt.totalInterest')
    ],
    actions: [
      { label: 'Simuler un remboursement', intent: INTENTS.WHAT_IF, scenarioType: SCENARIO_TYPES.DEBT_EXTRA_PAYMENT },
      { label: 'Voir les dettes', target: 'dettes' }
    ],
    dataQuality: { limits: getDataQualityLimits(snapshot) }
  })
}

function composeForecast(snapshot) {
  const forecast = snapshot?.forecast || {}
  if (forecast.finalBalance === undefined || forecast.finalBalance === null) {
    return baseResponse(INTENTS.FORECAST, {
      verdict: 'Prévision indisponible',
      title: 'Je n’ai pas assez de données pour projeter la fin de mois.',
      summary: 'Je préfère ne pas fabriquer de forecast.',
      tone: 'warning',
      dataQuality: { limits: [...getDataQualityLimits(snapshot), 'forecast insuffisant'], blocking: true }
    })
  }

  return baseResponse(INTENTS.FORECAST, {
    verdict: forecast.overdraftRisk === 'HIGH' ? 'Risque de découvert' : 'Prévision disponible',
    title: 'Cette projection reste une estimation.',
    summary: 'Elle vient du forecast J4 et peut changer si le budget change.',
    tone: forecast.overdraftRisk === 'HIGH' || toFiniteNumber(forecast.finalBalance) < 0 ? 'warning' : 'stable',
    evidence: [
      money('Fin de mois estimée', forecast.finalBalance, 'snapshot.forecast.finalBalance'),
      money('Point le plus bas', forecast.lowestBalance, 'snapshot.forecast.lowestBalance'),
      fact('Risque découvert', forecast.overdraftRisk || 'NONE', 'snapshot.forecast.overdraftRisk')
    ],
    dataQuality: { limits: getDataQualityLimits(snapshot) }
  })
}

function composeExplain(snapshot, context = {}) {
  const previous = context.lastIntent
  if (previous === INTENTS.TOP_RISK) return composeWhyStatus(snapshot, context)
  if (previous === INTENTS.AFFORDABILITY || previous === INTENTS.WHAT_IF) {
    return baseResponse(INTENTS.EXPLAIN_RECOMMENDATION, {
      verdict: 'Justification',
      title: 'Je compare la marge avant/après et le forecast.',
      summary: 'La recommandation vient de l’impact simulé sur ta marge, pas d’une règle arbitraire.',
      tone: 'neutral',
      evidence: [
        money('Marge projetée', snapshot?.cashflow?.projected, 'snapshot.cashflow.projected'),
        money('Fin de mois estimée', snapshot?.forecast?.finalBalance, 'snapshot.forecast.finalBalance')
      ],
      dataQuality: { limits: getDataQualityLimits(snapshot) }
    })
  }

  if (previous === INTENTS.PRIORITY) {
    return baseResponse(INTENTS.EXPLAIN_RECOMMENDATION, {
      verdict: 'Justification',
      title: 'La priorité vient de la hiérarchie J4.',
      summary: 'J4 classe d’abord les risques critiques, puis les opportunités utiles.',
      tone: 'neutral',
      evidence: [
        fact('Priorité', topPriority(snapshot)?.id || 'aucune', 'snapshot.priorities[0].id'),
        money('Marge projetée', snapshot?.cashflow?.projected, 'snapshot.cashflow.projected')
      ],
      dataQuality: { limits: getDataQualityLimits(snapshot) }
    })
  }

  return composeWhyStatus(snapshot, context)
}

function composeUnsupported(snapshot) {
  return baseResponse(INTENTS.UNSUPPORTED, {
    verdict: 'Question non reconnue',
    title: 'Je peux analyser ton budget, ta marge, tes dépenses, tes objectifs, tes risques ou simuler une dépense.',
    summary: 'Formule une question financière ou choisis une action.',
    tone: 'neutral',
    evidence: [],
    actions: defaultActions(),
    dataQuality: { limits: getDataQualityLimits(snapshot) }
  })
}

function composeJarvisResponse(snapshot = {}, parsedIntent = {}, context = {}) {
  const intent = parsedIntent.intent || INTENTS.UNSUPPORTED
  let response

  if (intent === INTENTS.GLOBAL_STATUS) response = composeGlobalStatus(snapshot)
  else if (intent === INTENTS.WHY_STATUS) response = composeWhyStatus(snapshot, context)
  else if (intent === INTENTS.TOP_RISK) response = composeTopRisk(snapshot)
  else if (intent === INTENTS.PRIORITY) response = composePriority(snapshot)
  else if (intent === INTENTS.AFFORDABILITY) response = composeScenarioResponse(intent, snapshot, parsedIntent)
  else if (intent === INTENTS.REMAINING_SPEND) response = composeRemainingSpend(snapshot)
  else if (intent === INTENTS.SAVINGS) response = composeSavings(snapshot)
  else if (intent === INTENTS.EXPENSE_ANALYSIS) response = composeExpenseAnalysis(snapshot)
  else if (intent === INTENTS.HISTORY_COMPARE) response = composeHistory(snapshot)
  else if (intent === INTENTS.GOAL) response = composeGoal(snapshot)
  else if (intent === INTENTS.DEBT) response = composeDebt(snapshot)
  else if (intent === INTENTS.FORECAST) response = composeForecast(snapshot)
  else if (intent === INTENTS.WHAT_IF) response = composeScenarioResponse(intent, snapshot, parsedIntent)
  else if (intent === INTENTS.EXPLAIN_RECOMMENDATION) response = composeExplain(snapshot, context)
  else response = composeUnsupported(snapshot)

  return withTrace(response)
}

export {
  composeJarvisResponse
}
