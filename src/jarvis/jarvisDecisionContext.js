const finiteOrNull = (value) => {
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
  const priority = snapshot.priority || null
  const priorityCta = snapshot.priorityCta || null

  return {
    ...snapshot, // 100% of the V2.1 snapshot properties are passed directly to Copilot
    version: Number.isFinite(Number(metadata.version)) ? Number(metadata.version) : null,
    publishedAt: Number.isFinite(Number(metadata.publishedAt)) ? Number(metadata.publishedAt) : null,
    
    // Legacy properties for North Star dashboard and UI routing
    insight: priority?.explanation || (typeof snapshot.headline === 'string' ? snapshot.headline : null),
    priority: priority ? {
      id: priority.type || null,
      label: priority.title || null,
      severity: priority.severity || null
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
      hasIncome: dataQuality.hasIncome === true,
      hasExpenses: dataQuality.hasExpenses === true,
      hasGoal: dataQuality.hasGoal === true,
      hasDebt: dataQuality.hasDebt === true,
      confidence: dataQuality.confidence || null,
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
    recommendation: priority?.action ? {
      label: priority.action.label || null,
      target: priority.action.target || null
    } : (priorityCta ? {
      label: priorityCta.label || null,
      target: priorityCta.target || null
    } : null),
    supportingFacts: Array.isArray(priority?.supportingFacts) 
      ? priority.supportingFacts.slice(0, 3).map(fact => ({ label: fact.label, value: finiteOrNull(fact.value) }))
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
