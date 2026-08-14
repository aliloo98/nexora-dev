/**
 * Jarvis View Model
 *
 * Transforms J4 snapshot into Jarvis presentation model.
 * Pure function - no DOM, no side effects.
 */

// Deterministic copy dictionary - centralized for consistency and localization
const JARVIS_COPY = {
  // États de santé
  status: {
    unknown: 'Données insuffisantes',
    no_income: 'Revenus manquants',
    critical: 'Situation critique',
    fragile: 'Situation fragile',
    stable: 'Situation stable',
    balanced: 'Situation équilibrée',
    strong: 'Situation solide'
  },

  // Headlines déterministes basées sur l'état
  headline: {
    no_income: 'J\'ai besoin de revenus pour établir une analyse.',
    critical: 'Un déficit est projeté : la priorité est de sécuriser ton cashflow.',
    fragile: 'Tes charges fixes limitent ta marge de manœuvre.',
    balanced: 'Ta situation est équilibrée, mais tu peux optimiser.',
    stable: 'Ta trajectoire reste saine et ton objectif progresse.',
    strong: 'Excellente situation financière avec une marge confortable.',
    insufficient_data: 'J\'ai besoin de davantage de données pour affiner ton analyse.',
    trends_unavailable: 'Pas assez d\'historique pour analyser les tendances.'
  },

  // Labels de priorité
  priority: {
    fix_deficit: 'Réduire le déficit',
    secure_income: 'Sécuriser les revenus',
    capture_opportunity: 'Profiter d\'une marge disponible'
  },

  // Labels de risque
  risk: {
    deficit: 'Déficit mensuel',
    no_income: 'Absence de revenus',
    overdraft_risk: 'Risque de découvert'
  },

  // Labels d'opportunité
  opportunity: {
    positive_cashflow: 'Marge disponible'
  },

  // Labels de qualité de données
  dataQuality: {
    NO_INCOME: 'J\'ai besoin de revenus pour établir une analyse.',
    NO_EXPENSES: 'J\'ai besoin de données de dépenses pour affiner l\'analyse.',
    NO_GOAL_DATA: 'Les données d\'objectifs ne sont pas disponibles.',
    NO_DEBT_DATA: 'Les données de dettes ne sont pas disponibles.',
    INSUFFICIENT_HISTORY: 'Pas assez d\'historique pour analyser les tendances.',
    unknown: 'Données indisponibles'
  },

  // Mapping des codes J4 vers les clés de copie
  issueCodeToCopyKey: {
    NO_INCOME: 'NO_INCOME',
    NO_EXPENSES: 'NO_EXPENSES',
    NO_GOAL_DATA: 'NO_GOAL_DATA',
    NO_DEBT_DATA: 'NO_DEBT_DATA',
    INSUFFICIENT_HISTORY: 'INSUFFICIENT_HISTORY'
  },

  // CTA labels
  cta: {
    fix_deficit: 'Corriger le budget',
    secure_income: 'Saisir les revenus',
    capture_opportunity: 'Voir le plan',
    default: 'Voir le plan'
  },

  // Trend labels
  trend: {
    up: 'Hausse',
    down: 'Baisse',
    stable: 'Stable',
    unavailable: 'Indisponible'
  }
}

/**
 * Exact mapping of J4 health.status to Jarvis visual states
 * Based on actual J4 IntelligenceEngine.js implementation
 */
const HEALTH_STATUS_TO_VISUAL = {
  no_income: 'no_income',
  critical: 'critical',
  fragile: 'fragile',
  stable: 'stable',
  balanced: 'balanced',
  strong: 'strong',
  unknown: 'unknown'
}

/**
 * Creates Jarvis view model from J4 snapshot
 * 
 * This is the single source of truth for the Jarvis UI contract.
 * All renderers must consume this exact shape.
 */
export function createJarvisViewModel(snapshot) {
  const { health, priorities, forecast, risks, opportunities, goal, debt, cashflow, dataQuality, trends } = snapshot

  // Map health status to visual state
  const visualState = HEALTH_STATUS_TO_VISUAL[health.status] || 'unknown'

  // Select appropriate headline based on state and data quality
  const headline = selectHeadline(health, dataQuality, visualState)

  // Map primary priority and CTA
  const { priority, priorityCta } = mapPriorityAndCta(priorities?.[0] || null)

  // Map trajectory from forecast and trends
  const trajectory = mapTrajectory(forecast, trends, cashflow)

  // Map risks with all required fields
  const formattedRisks = mapRisks(risks)

  // Map opportunities with all required fields
  const formattedOpportunities = mapOpportunities(opportunities)

  // Map goal with all required fields
  const formattedGoal = mapGoal(goal)

  // Map debt with all required fields
  const formattedDebt = mapDebt(debt)

  // Map cashflow
  const formattedCashflow = mapCashflow(cashflow)

  // Map data quality issues with proper code-to-message mapping
  const formattedDataQuality = mapDataQuality(dataQuality)

  // Define capabilities based on data availability
  const capabilities = {
    core: dataQuality.hasIncome || dataQuality.hasExpenses,
    forecast: !!forecast && forecast.finalBalance !== undefined,
    trends: trends?.available === true,
    goal: dataQuality.hasGoal,
    debt: dataQuality.hasDebt
  }

  return {
    // State
    visualState,
    statusLabel: JARVIS_COPY.status[visualState] || JARVIS_COPY.status.unknown,
    headline,

    // Capabilities
    capabilities,

    // Priority
    priority,
    priorityCta,

    // Trajectory
    trajectory,

    // Signals
    risks: formattedRisks,
    opportunities: formattedOpportunities,

    // Goal
    goal: formattedGoal,

    // Debt
    debt: formattedDebt,

    // Cashflow
    cashflow: formattedCashflow,

    // Data quality
    dataQuality: formattedDataQuality,

    // Evidence (for debugging)
    evidence: snapshot.evidence
  }
}

/**
 * Selects the appropriate headline based on health and data quality
 */
function selectHeadline(health, dataQuality, visualState) {
  // Priority: no_income > critical > data quality > other
  if (health.status === 'no_income') {
    return JARVIS_COPY.headline.no_income
  }

  if (health.status === 'critical') {
    return JARVIS_COPY.headline.critical
  }

  // Check for critical data quality issues that should override
  const criticalIssue = dataQuality.issues?.find(i => i.code === 'NO_INCOME')
  if (criticalIssue) {
    return JARVIS_COPY.headline.no_income
  }

  // Map visual state to headline
  if (visualState === 'fragile') {
    return JARVIS_COPY.headline.fragile
  }
  if (visualState === 'balanced') {
    return JARVIS_COPY.headline.balanced
  }
  if (visualState === 'stable') {
    return JARVIS_COPY.headline.stable
  }
  if (visualState === 'strong') {
    return JARVIS_COPY.headline.strong
  }

  // Fallback
  return JARVIS_COPY.headline.insufficient_data
}

/**
 * Maps priority and CTA to unified contract
 */
function mapPriorityAndCta(priority) {
  if (!priority) {
    return {
      priority: null,
      priorityCta: null
    }
  }

  let ctaTarget = 'plan'
  let ctaLabel = JARVIS_COPY.cta.default

  if (priority.id === 'fix_deficit') {
    ctaTarget = 'saisie'
    ctaLabel = JARVIS_COPY.cta.fix_deficit
  } else if (priority.id === 'secure_income') {
    ctaTarget = 'saisie'
    ctaLabel = JARVIS_COPY.cta.secure_income
  } else if (priority.id === 'capture_opportunity') {
    ctaTarget = 'plan'
    ctaLabel = JARVIS_COPY.cta.capture_opportunity
  }

  return {
    priority: {
      id: priority.id,
      label: priority.action || priority.label || priority.id,
      rank: priority.rank,
      severity: priority.severity
    },
    priorityCta: {
      target: ctaTarget,
      label: ctaLabel
    }
  }
}

/**
 * Maps trajectory from forecast and trends
 */
function mapTrajectory(forecast, trends, cashflow) {
  const isPositive = cashflow?.projected >= 0

  return {
    available: !!forecast && forecast.finalBalance !== undefined,
    finalBalance: forecast?.finalBalance || 0,
    lowestBalance: forecast?.lowestBalance || 0,
    overdraftRisk: forecast?.overdraftRisk || 'NONE',
    cashflowPositive: isPositive,
    trendsAvailable: trends?.available === true,
    incomeTrend: trends?.available === true ? trends.income : 'unavailable',
    expenseTrend: trends?.available === true ? trends.expenses : 'unavailable'
  }
}

/**
 * Maps risks with all required fields
 */
function mapRisks(risks) {
  if (!Array.isArray(risks)) return []

  return risks.map(risk => ({
    id: risk.id,
    label: JARVIS_COPY.risk[risk.id] || risk.id,
    severity: risk.severity,
    severityLabel: risk.severity,
    domain: risk.domain
  }))
}

/**
 * Maps opportunities with all required fields
 */
function mapOpportunities(opportunities) {
  if (!Array.isArray(opportunities)) return []

  return opportunities.map(opp => ({
    id: opp.id,
    title: opp.title || JARVIS_COPY.opportunity[opp.id] || opp.id,
    description: opp.description || '',
    amount: opp.estimatedGain || opp.amount
  }))
}

/**
 * Maps goal with all required fields
 */
function mapGoal(goal) {
  if (!goal) return null

  return {
    id: goal.id,
    target: goal.target,
    current: goal.current,
    progress: goal.progress || 0,
    remaining: goal.remaining || (goal.target - goal.current),
    isPrimary: goal.isPrimary === true,
    targetDate: goal.targetDate,
    pace: goal.pace || 'Normal' // Default fallback if not provided by J4
  }
}

/**
 * Maps debt with all required fields
 */
function mapDebt(debt) {
  if (!debt) return null

  return {
    total: debt.total,
    monthlyTotal: debt.monthlyTotal,
    payoffMonths: debt.payoffMonths,
    totalInterest: debt.totalInterest
  }
}

/**
 * Maps cashflow
 */
function mapCashflow(cashflow) {
  if (!cashflow) return null

  return {
    income: cashflow.income,
    expenses: cashflow.expenses,
    savings: cashflow.savings,
    savingsRate: cashflow.savingsRate
  }
}

/**
 * Maps data quality with proper code-to-message mapping
 */
function mapDataQuality(dataQuality) {
  const isComplete = dataQuality.isComplete === true

  const issues = (dataQuality.issues || []).map(issue => {
    // Map J4 code to copy key
    const copyKey = JARVIS_COPY.issueCodeToCopyKey[issue.code] || 'unknown'
    const label = JARVIS_COPY.dataQuality[copyKey] || JARVIS_COPY.dataQuality.unknown

    return {
      code: issue.code,
      label,
      severity: issue.severity
    }
  })

  return {
    isComplete,
    issues
  }
}
