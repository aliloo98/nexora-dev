import { OnboardingService } from './onboardingService.js'

/**
 * Onboarding Integration Module
 * Connects onboarding steps to real user actions in the application
 */

let hasBudget = false
let hasRevenue = false
let hasExpense = false
let hasViewedDashboard = false

export const OnboardingIntegration = {
  /**
   * Initialize integration listeners
   */
  init() {
    this.attachBudgetListeners()
    this.attachNavigationListeners()
  },

  /**
   * Attach listeners to budget-related actions
   */
  attachBudgetListeners() {
    // Hook into MonthlyBudgetStateService.saveMonthlyBudgetState
    const originalSave = window.MonthlyBudgetStateService?.saveMonthlyBudgetState
    if (originalSave) {
      window.MonthlyBudgetStateService.saveMonthlyBudgetState = async function(...args) {
        const result = await originalSave.apply(this, args)
        
        // Check if this is the first budget save
        if (!hasBudget) {
          const data = args[1]
          if (data && Object.keys(data).length > 0) {
            hasBudget = true
            await OnboardingService.completeStep('create_budget')
          }
        }
        
        // Check for revenue entries
        if (!hasRevenue) {
          const data = args[1]
          if (data) {
            const hasRevenueEntry = Object.keys(data).some(key => 
              key.toLowerCase().includes('rev') || 
              key.toLowerCase().includes('revenu') ||
              key.toLowerCase().includes('salaire') ||
              key.toLowerCase().includes('income')
            )
            if (hasRevenueEntry && data[key] > 0) {
              hasRevenue = true
              await OnboardingService.completeStep('add_income')
            }
          }
        }
        
        // Check for expense entries
        if (!hasExpense) {
          const data = args[1]
          if (data) {
            const hasExpenseEntry = Object.keys(data).some(key => 
              key.toLowerCase().includes('dep') || 
              key.toLowerCase().includes('dépense') ||
              key.toLowerCase().includes('charge') ||
              key.toLowerCase().includes('fixe') ||
              key.toLowerCase().includes('variable')
            )
            if (hasExpenseEntry && data[key] > 0) {
              hasExpense = true
              await OnboardingService.completeStep('add_expense')
            }
          }
        }
        
        return result
      }
    }
  },

  /**
   * Attach listeners to navigation actions
   */
  attachNavigationListeners() {
    // Hook into showSection to detect dashboard viewing
    const originalShowSection = window.showSection
    if (originalShowSection) {
      window.showSection = function(sectionId) {
        const result = originalShowSection.apply(this, arguments)
        
        if (sectionId === 'dashboard' && !hasViewedDashboard) {
          hasViewedDashboard = true
          // Delay slightly to ensure dashboard is loaded
          setTimeout(async () => {
            await OnboardingService.completeStep('view_dashboard')
            
            // If all steps are complete, mark finish step
            const state = await OnboardingService.getState()
            const allPreviousComplete = state.steps.slice(0, -1).every(s => s.completed)
            if (allPreviousComplete) {
              await OnboardingService.completeStep('finish')
            }
          }, 500)
        }
        
        return result
      }
    }
  },

  /**
   * Reset integration state (for testing)
   */
  reset() {
    hasBudget = false
    hasRevenue = false
    hasExpense = false
    hasViewedDashboard = false
  }
}

export default OnboardingIntegration
