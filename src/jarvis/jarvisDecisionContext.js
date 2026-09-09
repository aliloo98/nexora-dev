const finiteOrNull = (value) => {
  if (value === null || value === undefined || value === '') return null
  const number = Number(value)
  return Number.isFinite(number) ? number : null
}

const copyEvidence = (evidence = {}) => Object.fromEntries(
  Object.entries(evidence)
    .map(([key, value]) => [key, finiteOrNull(value)])
    .filter(([, value]) => value !== null)
)

const cloneContext = (context) => context ? structuredClone(context) : null

let latestContext = null
let latestVersion = 0
const subscribers = new Set()

export function createJarvisDecisionContext(snapshot = {}, metadata = {}) {
  const risks = Array.isArray(snapshot.risks) ? snapshot.risks : []
  const dataQuality = snapshot.dataQuality || {}
  const trajectory = snapshot.trajectory || {}
  
  // Handle both legacy priority and new priorities array from Intelligence Engine
  const legacyPriority = snapshot.priority || null
  const prioritiesArray = Array.isArray(snapshot.priorities) ? snapshot.priorities : []
  const primaryPriority = legacyPriority || (prioritiesArray.length > 0 ? prioritiesArray[0] : null)
  
  const priorityCta = snapshot.priorityCta || null

  return {
    ...snapshot, // 100% of the V2.1 snapshot properties are passed directly to Copilot
    version: Number.isFinite(Number(metadata.version)) ? Number(metadata.version) : null,
    publishedAt: Number.isFinite(Number(metadata.publishedAt)) ? Number(metadata.publishedAt) : null,
    
    // Legacy properties for North Star dashboard and UI routing
    insight: primaryPriority?.explanation || primaryPriority?.action || (typeof snapshot.headline === 'string' ? snapshot.headline : null),
    priority: primaryPriority ? {
      id: primaryPriority.id || primaryPriority.type || null,
      label: primaryPriority.label || primaryPriority.title || primaryPriority.action || null,
      severity: primaryPriority.severity || null
    } : null,
    risks: risks.slice(0, 3).map((risk) => ({
      id: risk?.id || null,
      label: risk?.title || risk?.label || null,
      domain: risk?.domain || null,
      severity: risk?.severity || null,
      evidence: copyEvidence(risk?.evidence)
    })),
    dataQuality: {
      isComplete: dataQuality.isComplete === true,
      hasIncome: dataQuality.hasIncome === true || !dataQuality.issues?.some(i => i.code === 'NO_INCOME'),
      hasExpenses: dataQuality.hasExpenses === true || !dataQuality.issues?.some(i => i.code === 'NO_EXPENSES'),
      hasGoal: dataQuality.hasGoal === true || !dataQuality.issues?.some(i => i.code === 'NO_GOAL_DATA'),
      hasDebt: dataQuality.hasDebt === true || !dataQuality.issues?.some(i => i.code === 'NO_DEBT_DATA'),
      confidence: dataQuality.confidence || dataQuality.level || null,
      issues: Array.isArray(dataQuality.issues) ? dataQuality.issues.slice(0, 3).map((issue) => ({
        code: issue?.code || 'unknown',
        severity: issue?.severity || null
      })) : []
    },
    trajectory: {
      finalBalance: finiteOrNull(trajectory.finalBalance !== undefined ? trajectory.finalBalance : snapshot.projectedBalance),
      lowestBalance: finiteOrNull(trajectory.lowestBalance),
      lowestBalanceDay: finiteOrNull(trajectory.lowestBalanceDay),
      overdraftRisk: trajectory.overdraftRisk || null,
      trendsAvailable: trajectory.trendsAvailable === true
    },
    recommendation: (() => {
      // For Intelligence Engine priorities with string action
      if (primaryPriority?.action && typeof primaryPriority.action === 'string') {
        return {
          label: primaryPriority.action,
          target: 'saisie'
        }
      }
      // For Intelligence Engine priorities with object action
      if (primaryPriority?.action && typeof primaryPriority.action === 'object') {
        return {
          label: primaryPriority.action.label || null,
          target: primaryPriority.action.target || null
        }
      }
      // Fallback to legacy priority
      if (legacyPriority?.action) {
        if (typeof legacyPriority.action === 'object') {
          return {
            label: legacyPriority.action.label || null,
            target: legacyPriority.action.target || null
          }
        }
        if (typeof legacyPriority.action === 'string') {
          return {
            label: legacyPriority.action,
            target: 'saisie'
          }
        }
      }
      // Fallback to priorityCta
      if (priorityCta) {
        return {
          label: priorityCta.label || null,
          target: priorityCta.target || null
        }
      }
      return null
    })(),
    supportingFacts: Array.isArray(primaryPriority?.supportingFacts) 
      ? primaryPriority.supportingFacts.slice(0, 3).map(fact => ({ label: fact.label, value: finiteOrNull(fact.value) }))
      : [
          ['Solde projeté', trajectory.finalBalance !== undefined ? trajectory.finalBalance : snapshot.projectedBalance],
          ['Point le plus bas', trajectory.lowestBalance],
          ['Jour du point le plus bas', trajectory.lowestBalanceDay]
        ].filter(([, value]) => finiteOrNull(value) !== null).slice(0, 3).map(([label, value]) => ({
          label,
          value: finiteOrNull(value)
        }))
  }
}

/** Publish only the newest Jarvis computation for synchronous consumers. */
export function publishJarvisDecisionContext(viewModel, metadata = {}) {
  const context = createJarvisDecisionContext(viewModel, metadata)
  const version = context.version
  if (version !== null && version < latestVersion) return false
  latestVersion = version ?? latestVersion + 1
  context.version = latestVersion
  latestContext = context
  subscribers.forEach((subscriber) => subscriber(cloneContext(latestContext)))
  return true
}

export function getJarvisDecisionContext() {
  return cloneContext(latestContext)
}

export function clearJarvisDecisionContext() {
  latestContext = null
  latestVersion = 0
  subscribers.forEach((subscriber) => subscriber(null))
}

export function subscribeToJarvisDecisionContext(listener) {
  if (typeof listener !== 'function') return () => {}
  subscribers.add(listener)
  return () => subscribers.delete(listener)
}
