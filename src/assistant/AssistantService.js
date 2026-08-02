/**
 * AssistantService - Public service for Assistant Nexora
 * 
 * This is the main entry point for the application to use the assistant.
 * It coordinates the pipeline: DataCollector → AnalysisEngine → AssistantReport
 */

import { DataCollector } from './DataCollector.js'
import { AnalysisEngine } from './AnalysisEngine.js'
import { createEmptyReport } from './AssistantReport.js'
import registry from './RuleRegistry.js'
import { registerPredefinedRules } from './rules.js'

class AssistantService {
  constructor(config = {}) {
    this.services = config.services || {}
    this.ruleRegistry = config.ruleRegistry || registry
    this.dataCollector = new DataCollector(this.services)
    this.analysisEngine = new AnalysisEngine(this.ruleRegistry)
    this.initialized = false
  }

  /**
   * Initialize the service with predefined rules
   */
  initialize() {
    if (this.initialized) return

    // Register predefined rules
    registerPredefinedRules(this.ruleRegistry)
    
    this.initialized = true
  }

  /**
   * Analyze budget for a specific month
   * @param {string} monthKey - Month key (e.g., "janvier 2026")
   * @returns {Promise<AssistantReport>} Complete analysis report
   */
  async analyze(monthKey) {
    try {
      // Ensure initialized
      if (!this.initialized) {
        this.initialize()
      }

      // Collect data
      const data = await this.dataCollector.collect(monthKey)

      // Analyze data
      const report = this.analysisEngine.analyze(data)

      return report
    } catch (error) {
      console.error('[AssistantService] Error during analysis:', error)
      return createEmptyReport()
    }
  }

  /**
   * Get quick insights (for dashboard widgets)
   * @param {string} monthKey - Month key
   * @returns {Promise<Object>} Quick insights
   */
  async getQuickInsights(monthKey) {
    const report = await this.analyze(monthKey)
    
    return {
      score: report.score,
      scoreLabel: report.scoreLabel,
      status: report.status,
      trajectoryLabel: report.trajectoryLabel,
      topAlert: report.getTopAlert(),
      topRecommendation: report.getTopRecommendation(),
      hasData: report.hasData()
    }
  }

  /**
   * Get judgment only
   * @param {string} monthKey - Month key
   * @returns {Promise<Object>} Judgment
   */
  async getJudgment(monthKey) {
    const report = await this.analyze(monthKey)
    
    return report.judgment
  }

  /**
   * Get full report
   * @param {string} monthKey - Month key
   * @returns {Promise<AssistantReport>} Complete report
   */
  async getFullReport(monthKey) {
    return this.analyze(monthKey)
  }

  /**
   * Register custom rules
   * @param {string} category - Rule category
   * @param {Array<Object>} rules - Rules to register
   */
  registerRules(category, rules) {
    this.ruleRegistry.registerRules(category, rules)
  }

  /**
   * Register a single custom rule
   * @param {string} category - Rule category
   * @param {Object} rule - Rule to register
   */
  registerRule(category, rule) {
    this.ruleRegistry.registerRule(category, rule)
  }

  /**
   * Reset the service (for testing)
   */
  reset() {
    this.initialized = false
    this.ruleRegistry.clearAll()
  }
}

// Singleton instance
let serviceInstance = null

/**
 * Get or create the singleton service instance
 * @param {Object} config - Configuration
 * @returns {AssistantService}
 */
export function getAssistantService(config = {}) {
  if (!serviceInstance) {
    serviceInstance = new AssistantService(config)
  }
  return serviceInstance
}

/**
 * Reset the singleton instance (for testing)
 */
export function resetAssistantService() {
  if (serviceInstance) {
    serviceInstance.reset()
    serviceInstance = null
  }
}

export { AssistantService }
export default getAssistantService
