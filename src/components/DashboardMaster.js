import { buildJudgmentEngine } from '../assistant/judgmentEngine.js'
import { CoachService } from '../coach/services/coachService.js'
import { createCoachCard } from '../ui/components/CoachCard.js'
import { registerGlobalAPI, initializeDashboardMode } from '../ui/dashboard/dashboardMode.js'

// Register global API and initialize mode (browser only)
if (typeof window !== 'undefined') {
  registerGlobalAPI()
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeDashboardMode)
  } else {
    initializeDashboardMode()
  }
}

export const normalizePriorityLevel = (priority) => {
  if (priority === null || priority === undefined) return 'neutral'

  const normalized = String(priority).trim().toLowerCase()

  if (normalized === '0' || normalized === 'critical' || normalized === 'high' || normalized === 'critique' || normalized === 'importante') {
    return 'critical'
  }

  if (normalized === '1' || normalized === 'medium') {
    return 'vigilance'
  }

  if (normalized === '2' || normalized === 'low') {
    return 'opportunity'
  }

  return 'neutral'
}

const escapeHtml = (value) => String(value ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#039;')

const localMonthKey = (date) => {
  const value = date instanceof Date ? date : new Date(date)
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}`
}

const getCoachEvidence = (presentation) => {
  const evidence = Array.isArray(presentation?.formattedEvidence)
    ? presentation.formattedEvidence
    : []
  if (evidence.length === 0) return 'Cette recommandation est basée sur la situation financière du mois.'
  return evidence.map(item => `${item.label} : ${item.value}`).join(' · ')
}

const buildCoachDashboardDecision = (analysis) => ({
  source: 'coach',
  title: analysis.presentation.title,
  situation: analysis.presentation.message,
  impact: getCoachEvidence(analysis.presentation),
  action: analysis.presentation.actionLabel,
  actionLabel: analysis.presentation.actionLabel,
  actionTarget: analysis.primary.action?.target || 'saisie',
  footer: getCoachEvidence(analysis.presentation),
  hasBudgetData: analysis.context.dataQuality.completeness > 0,
  analysis
})

const buildLegacyDashboardDecision = async ({ monthKey }) => {
  const [{ getProactiveCoach }, { default: TreasuryAdapter }] = await Promise.all([
    import('../advisor/proactiveCoachService.js'),
    import('../treasury/treasuryAdapter.js')
  ])

  let revenues = []
  let charges = []
  try {
    const flows = await TreasuryAdapter.fetchCurrentMonthBudget(monthKey)
    revenues = Array.isArray(flows?.revenues) ? flows.revenues : []
    charges = Array.isArray(flows?.charges) ? flows.charges : []
  } catch (error) {
    console.warn('[DashboardMaster] treasury flows unavailable, using empty fallback', error)
  }

  const coach = await getProactiveCoach().catch(() => null)
  const judgment = buildJudgmentEngine({
    income: coach?.summary?.income ?? 0,
    fixedExpenses: coach?.summary?.fixedExpenses ?? 0,
    variableExpenses: coach?.summary?.variableExpenses ?? 0,
    expenses: coach?.summary?.expenses ?? 0,
    projectedBalance: coach?.summary?.projectedBalance ?? 0,
    currentBalance: coach?.summary?.currentBalance ?? 0,
    debts: [],
    goals: [],
    primaryGoal: null,
    settings: coach?.settings
  })
  const hasBudgetData = revenues.length > 0 || charges.length > 0

  return {
    source: 'legacy',
    title: coach?.priority || (hasBudgetData ? 'Compléter le budget' : 'Commencer le budget'),
    situation: judgment.diagnostic,
    impact: judgment.impact,
    action: judgment.action,
    actionLabel: hasBudgetData ? (coach?.actionLabel || 'Voir la priorité') : 'Comprendre mes recommandations',
    actionTarget: hasBudgetData ? (coach?.actionTarget || 'saisie') : 'saisie',
    footer: judgment.why,
    hasBudgetData,
    legacy: { coach, judgment }
  }
}

export async function resolveDashboardRecommendation({
  coachService = CoachService,
  monthKey,
  asOf,
  legacyFactory = buildLegacyDashboardDecision
} = {}) {
  try {
    const analysis = await coachService.analyze({ monthKey, asOf })
    if (!analysis?.primary || !analysis?.presentation) {
      throw new Error('Coach returned no primary recommendation')
    }
    return {
      decision: buildCoachDashboardDecision(analysis),
      coachError: null
    }
  } catch (coachError) {
    return {
      decision: await legacyFactory({ monthKey, asOf }),
      coachError
    }
  }
}

const buildLegacyDebugComparison = (context) => {
  const fixedExpenses = context.categories
    .filter(category => category.type === 'fixed_expense')
    .reduce((sum, category) => sum + (Number(category.amount) || 0), 0)
  const variableExpenses = context.categories
    .filter(category => category.type === 'variable_expense')
    .reduce((sum, category) => sum + (Number(category.amount) || 0), 0)
  const primaryGoal = context.goals.find(goal => goal?.isPrimary === true) || context.goals[0] || null

  return buildJudgmentEngine({
    income: context.monthly.income,
    fixedExpenses,
    variableExpenses,
    expenses: context.monthly.plannedExpenses,
    projectedBalance: context.monthly.projectedBalance,
    currentBalance: context.monthly.currentBalance,
    debts: [],
    goals: context.goals,
    primaryGoal
  })
}

const logDevelopmentComparison = (decision, logger) => {
  if (decision.source !== 'coach' || !decision.analysis?.context) return
  const legacy = buildLegacyDebugComparison(decision.analysis.context)
  logger('[Nexora Coach comparison]', {
    coach: {
      ruleId: decision.analysis.primary.ruleId,
      priority: decision.analysis.primary.priority,
      recommendationScore: decision.analysis.primary.recommendationScore,
      title: decision.title
    },
    legacy: {
      kind: legacy.primaryProblem.kind,
      priority: legacy.primaryProblem.priority,
      title: legacy.primaryProblem.label
    }
  })
}

export async function renderDashboardMaster(rootId, TreasuryService, options = {}) {
  const documentRef = options.documentRef || document
  const windowRef = options.windowRef || window
  const root = documentRef.getElementById(rootId)
  if (!root) return
  root.classList.add('dashboard-coach-root')

  const asOf = options.asOf instanceof Date ? options.asOf : new Date(options.asOf || Date.now())
  const monthKey = options.monthKey
    || (typeof windowRef.getMonth === 'function' ? windowRef.getMonth() : localMonthKey(asOf))
  const { decision, coachError } = await resolveDashboardRecommendation({
    coachService: options.coachService || CoachService,
    monthKey,
    asOf,
    legacyFactory: options.legacyFactory || ((params) => buildLegacyDashboardDecision({
      ...params,
      TreasuryService
    }))
  })

  if (coachError) {
    console.warn('[DashboardMaster] Nexora Coach unavailable, using legacy fallback', coachError)
  } else {
    const debugEnabled = options.debug === true
      || (options.debug !== false && Boolean(import.meta.env?.DEV))
    if (debugEnabled) {
      logDevelopmentComparison(decision, options.debugLogger || console.debug)
    }
  }

  const showRecommendationAction = decision.source === 'coach' || decision.hasBudgetData

  const level = decision.source === 'coach'
    ? normalizePriorityLevel(decision.analysis?.primary?.priority)
    : 'neutral'

  const coachCard = createCoachCard({
    level,
    eyebrow: 'Coach Nexora',
    title: decision.title,
    description: decision.situation,
    context: decision.footer,
    actionLabel: showRecommendationAction ? decision.actionLabel : 'Comprendre mes recommandations',
    onAction: () => windowRef.showSection?.(showRecommendationAction ? decision.actionTarget : 'saisie')
  }, documentRef)

  const currentMarkup = root.innerHTML
  const newMarkup = coachCard.outerHTML

  if (currentMarkup !== newMarkup || !root.querySelector('.nx-coach-card')) {
    root.innerHTML = ''
    root.appendChild(coachCard)
  }

}
