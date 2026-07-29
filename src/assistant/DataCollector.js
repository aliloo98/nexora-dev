/**
 * DataCollector - Collects financial data from external services
 * 
 * Uses dependency injection to avoid direct window.* dependencies.
 * Services are injected via configuration object for testability.
 */

class DataCollector {
  constructor(services = {}) {
    this.services = services
  }

  /**
   * Get budget service (injected or fallback to window)
   */
  getBudgetService() {
    return this.services.budgetService || 
           (typeof window !== 'undefined' ? window.MonthlyBudgetStateService : null)
  }

  /**
   * Get goals service (injected or fallback to window)
   */
  getGoalsService() {
    return this.services.goalsService || 
           (typeof window !== 'undefined' ? window.GoalsService : null)
  }

  /**
   * Get debts service (injected or fallback to window)
   */
  getDebtsService() {
    return this.services.debtsService || 
           (typeof window !== 'undefined' && typeof window.readDebts === 'function' ? window.readDebts : null)
  }

  /**
   * Get helper functions (injected or fallback to window)
   */
  getHelpers() {
    return this.services.helpers || {
      getMonthMetrics: typeof window !== 'undefined' ? window.getMonthMetrics : null,
      getAmountFromData: typeof window !== 'undefined' ? window.getAmountFromData : null,
      getBudgetKeysByType: typeof window !== 'undefined' ? window.getBudgetKeysByType : null,
      getBudgetLabel: typeof window !== 'undefined' ? window.getBudgetLabel : null,
      getVal: typeof window !== 'undefined' ? window.getVal : null,
      getMonth: typeof window !== 'undefined' ? window.getMonth : null,
      getFinancialScore: typeof window !== 'undefined' ? window.getFinancialScore : null,
      filterTechnicalRecords: typeof window !== 'undefined' ? window.filterTechnicalRecords : null
    }
  }

  /**
   * Collect budget data for a specific month
   * @param {string} monthKey - Month key (e.g., "janvier 2026")
   * @returns {Object} Budget data
   */
  async collectBudgetData(monthKey) {
    const budgetService = this.getBudgetService()
    const helpers = this.getHelpers()

    let state = null
    let data = {}

    if (budgetService && typeof budgetService.getMonthlyBudgetState === 'function') {
      state = await budgetService.getMonthlyBudgetState(monthKey)
      data = state?.data || {}
    }

    // Try to get metrics if available
    let metrics = null
    if (helpers.getMonthMetrics && typeof helpers.getMonthMetrics === 'function') {
      const month = monthKey || (helpers.getMonth ? helpers.getMonth() : null)
      metrics = helpers.getMonthMetrics(month, { fromDom: true })
    }

    // Extract income using helper or fallback
    let income = 0
    if (helpers.getAmountFromData && typeof helpers.getAmountFromData === 'function') {
      income = helpers.getAmountFromData(data, 'rev_ali') + 
               helpers.getAmountFromData(data, 'rev_megane') + 
               helpers.getAmountFromData(data, 'rev_excep')
    }

    return {
      month: monthKey,
      state,
      data,
      metrics,
      income
    }
  }

  /**
   * Collect goals data
   * @returns {Object} Goals data
   */
  async collectGoalsData() {
    const goalsService = this.getGoalsService()
    const helpers = this.getHelpers()

    let summary = null
    let goals = []
    let primaryGoal = null

    if (goalsService) {
      if (typeof goalsService.getSummary === 'function') {
        summary = await goalsService.getSummary()
      }
      if (typeof goalsService.getPrimaryGoal === 'function') {
        primaryGoal = await goalsService.getPrimaryGoal()
      }
    }

    // Filter technical goals
    if (Array.isArray(summary?.goals)) {
      const rawGoals = summary.goals
      if (helpers.filterTechnicalRecords && typeof helpers.filterTechnicalRecords === 'function') {
        goals = helpers.filterTechnicalRecords(rawGoals, (goal) => goal?.name)
      } else {
        goals = rawGoals.filter((goal) => !/^(TEST_|DEBUG_|TEMP_)/i.test(String(goal?.name || '').trim()))
      }
    }

    return {
      summary,
      goals,
      primaryGoal
    }
  }

  /**
   * Collect debts data
   * @returns {Object} Debts data
   */
  async collectDebtsData() {
    const debtsService = this.getDebtsService()

    let debts = []
    if (debtsService && typeof debtsService === 'function') {
      try {
        debts = debtsService() || []
      } catch (error) {
        console.warn('[DataCollector] Error reading debts:', error)
        debts = []
      }
    }

    // Filter active debts (remaining > 0)
    const activeDebts = debts.filter(debt => Number(debt?.remaining || 0) > 0)

    return {
      debts: activeDebts,
      total: activeDebts.reduce((sum, debt) => sum + Number(debt.remaining || 0), 0),
      monthlyTotal: activeDebts.reduce((sum, debt) => sum + Number(debt.monthly || 0), 0)
    }
  }

  /**
   * Collect historical data for trend analysis
   * @param {number} months - Number of months to look back (default: 3)
   * @returns {Object} Historical data
   */
  async collectHistoricalData(months = 3) {
    const helpers = this.getHelpers()
    
    if (!helpers.getMonthMetrics || typeof helpers.getMonthMetrics !== 'function') {
      return { samples: [], avgIncome: 0, avgExpenses: 0 }
    }

    const samples = []
    const addMonths = (date, months) => {
      const result = new Date(date)
      result.setMonth(result.getMonth() + months)
      return result
    }

    const formatMonthYear = (date) => date.toLocaleString('fr-FR', { month: 'long', year: 'numeric' })

    for (let i = 1; i <= months; i++) {
      try {
        const d = addMonths(new Date(), -i)
        const monthKey = formatMonthYear(d)
        const metrics = helpers.getMonthMetrics(monthKey, { fromDom: false })
        
        if (metrics && typeof metrics.income === 'number') {
          samples.push(metrics)
        }
      } catch (error) {
        // Ignore sampling errors
      }
    }

    const count = samples.length
    const avgIncome = count > 0 ? samples.reduce((acc, item) => acc + Number(item.income || 0), 0) / count : 0
    const avgExpenses = count > 0 ? samples.reduce((acc, item) => acc + Number(item.expenses || 0), 0) / count : 0

    return {
      samples,
      count,
      avgIncome,
      avgExpenses
    }
  }

  /**
   * Collect all data needed for analysis
   * @param {string} monthKey - Month key
   * @returns {Object} Complete data context
   */
  async collect(monthKey) {
    const [budget, goals, debts, historical] = await Promise.all([
      this.collectBudgetData(monthKey),
      this.collectGoalsData(),
      this.collectDebtsData(),
      this.collectHistoricalData(3)
    ])

    return {
      budget,
      goals,
      debts,
      historical,
      helpers: this.getHelpers()
    }
  }
}

export { DataCollector }
export default DataCollector
