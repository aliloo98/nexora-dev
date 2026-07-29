/**
 * Assistant Factory - Creates AssistantService with real application services
 * 
 * This factory provides a way to initialize the AssistantService with the actual
 * Nexora application services (MonthlyBudgetStateService, GoalsService, etc.)
 * instead of mock implementations.
 */

import { getAssistantService } from './AssistantService.js'

/**
 * Get the real application services from window.*
 * @returns {Object} Real services
 */
function getRealServices() {
  if (typeof window === 'undefined') {
    console.warn('[AssistantFactory] window is not available, returning empty services')
    return {}
  }

  return {
    budgetService: window.MonthlyBudgetStateService || null,
    goalsService: window.GoalsService || null,
    debtsService: window.readDebts || null,
    helpers: {
      getMonthMetrics: window.getMonthMetrics || null,
      getAmountFromData: window.getAmountFromData || null,
      getBudgetKeysByType: window.getBudgetKeysByType || null,
      getBudgetLabel: window.getBudgetLabel || null,
      getVal: window.getVal || null,
      getMonth: window.getMonth || null,
      getFinancialScore: window.getFinancialScore || null,
      filterTechnicalRecords: window.filterTechnicalRecords || null
    }
  }
}

/**
 * Get AssistantService initialized with real application services
 * @returns {AssistantService} Service instance with real services
 */
export function getRealAssistantService() {
  const services = getRealServices()
  return getAssistantService({ services })
}

/**
 * Check if real services are available
 * @returns {boolean} True if real services are available
 */
export function areRealServicesAvailable() {
  const services = getRealServices()
  return !!(services.budgetService || services.goalsService)
}

export default getRealAssistantService
