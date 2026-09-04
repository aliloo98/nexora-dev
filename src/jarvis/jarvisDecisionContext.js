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

/**
 * Convert the already computed Jarvis ViewModel into the small North Star contract.
 * This function performs no financial calculation and no data access.
 */
export function createJarvisDecisionContext(viewModel = {}, metadata = {}) {
  const risks = Array.isArray(viewModel.risks) ? viewModel.risks : []
  const dataQuality = viewModel.dataQuality || {}
  const trajectory = viewModel.trajectory || {}
  const priority = viewModel.priority || null
  const priorityCta = viewModel.priorityCta || null

  return {
    version: Number.isFinite(Number(metadata.version)) ? Number(metadata.version) : null,
    publishedAt: Number.isFinite(Number(metadata.publishedAt)) ? Number(metadata.publishedAt) : null,
    insight: typeof viewModel.headline === 'string' ? viewModel.headline : null,
    priority: priority ? {
      id: priority.id || null,
      label: priority.label || null,
      rank: finiteOrNull(priority.rank),
      severity: priority.severity || null
    } : null,
    risks: risks.slice(0, 3).map((risk) => ({
      id: risk?.id || null,
      label: risk?.label || null,
      domain: risk?.domain || null,
      severity: risk?.severity || null,
      evidence: copyEvidence(risk?.evidence)
    })),
    dataQuality: {
      isComplete: dataQuality.isComplete === true,
      issues: Array.isArray(dataQuality.issues) ? dataQuality.issues.slice(0, 3).map((issue) => ({
        code: issue?.code || 'unknown',
        severity: issue?.severity || null
      })) : []
    },
    trajectory: {
      finalBalance: finiteOrNull(trajectory.finalBalance),
      lowestBalance: finiteOrNull(trajectory.lowestBalance),
      lowestBalanceDay: finiteOrNull(trajectory.lowestBalanceDay),
      overdraftRisk: trajectory.overdraftRisk || null,
      trendsAvailable: trajectory.trendsAvailable === true
    },
    recommendation: priorityCta ? {
      label: priorityCta.label || null,
      target: priorityCta.target || null
    } : null,
    supportingFacts: [
      ['Solde projeté', trajectory.finalBalance],
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
