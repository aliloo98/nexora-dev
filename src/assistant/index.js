/**
 * Assistant Nexora V1 - Main entry point
 * 
 * This module exports all public APIs for the assistant.
 */

export { RuleRegistry } from './RuleRegistry.js'
export { default as ruleRegistry } from './RuleRegistry.js'

export { DataCollector } from './DataCollector.js'

export { AnalysisEngine } from './AnalysisEngine.js'

export { AssistantReport, createEmptyReport } from './AssistantReport.js'

export { AssistantService, getAssistantService, resetAssistantService } from './AssistantService.js'

export { AssistantUI } from './AssistantUI.js'

export { 
  alertRules, 
  recommendationRules, 
  insightRules, 
  registerPredefinedRules 
} from './rules.js'

export { buildJudgmentEngine } from './judgmentEngine.js'

// Default export is the service getter
export { default } from './AssistantService.js'
