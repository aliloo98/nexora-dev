import { dataCompletenessRule } from './dataCompleteness.rule.js'
import { projectedDeficitRule } from './projectedDeficit.rule.js'
import { criticalRemainderRule } from './criticalRemainder.rule.js'
import { expenseRateRule } from './expenseRate.rule.js'
import { goalPaceRule } from './goalPace.rule.js'
import { createAllocatableSurplusRule } from './allocatableSurplus.rule.js'
import { stableForecastRule } from './stableForecast.rule.js'
import premiumCockpitRule from './premiumCockpit.rule.js'

export function createCoachRules(options = {}) {
  return Object.freeze([
    dataCompletenessRule,
    projectedDeficitRule,
    criticalRemainderRule,
    expenseRateRule,
    goalPaceRule,
    createAllocatableSurplusRule(options.surplus),
    stableForecastRule,
    premiumCockpitRule
  ])
}

export const COACH_RULES = createCoachRules()

export {
  dataCompletenessRule,
  projectedDeficitRule,
  criticalRemainderRule,
  expenseRateRule,
  goalPaceRule,
  stableForecastRule
}

export default COACH_RULES
