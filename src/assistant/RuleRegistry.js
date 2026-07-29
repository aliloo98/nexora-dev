/**
 * RuleRegistry - Extensible rule registry for Assistant Nexora
 * 
 * Allows registering and evaluating rules without modifying core code.
 * Rules are organized by category (alerts, recommendations, insights).
 */

class RuleRegistry {
  constructor() {
    this.rules = new Map()
  }

  /**
   * Register a single rule
   * @param {string} category - Rule category (alerts, recommendations, insights)
   * @param {Object} rule - Rule definition
   * @param {string} rule.id - Unique rule identifier
   * @param {Function} rule.condition - Function that returns true if rule applies
   * @param {Function} rule.message - Function that returns the message
   * @param {number} rule.priority - Priority for sorting (higher = more important)
   */
  registerRule(category, rule) {
    if (!category || typeof category !== 'string') {
      throw new Error('RuleRegistry: category must be a non-empty string')
    }
    if (!rule || typeof rule !== 'object') {
      throw new Error('RuleRegistry: rule must be an object')
    }
    if (!rule.id || typeof rule.id !== 'string') {
      throw new Error('RuleRegistry: rule must have an id')
    }
    if (typeof rule.condition !== 'function') {
      throw new Error('RuleRegistry: rule must have a condition function')
    }
    if (typeof rule.message !== 'function') {
      throw new Error('RuleRegistry: rule must have a message function')
    }

    if (!this.rules.has(category)) {
      this.rules.set(category, [])
    }

    const categoryRules = this.rules.get(category)
    
    // Check for duplicate IDs
    if (categoryRules.some(r => r.id === rule.id)) {
      throw new Error(`RuleRegistry: rule with id "${rule.id}" already exists in category "${category}"`)
    }

    categoryRules.push(rule)
  }

  /**
   * Register multiple rules for a category
   * @param {string} category - Rule category
   * @param {Array<Object>} rules - Array of rule definitions
   */
  registerRules(category, rules) {
    if (!Array.isArray(rules)) {
      throw new Error('RuleRegistry: rules must be an array')
    }

    rules.forEach(rule => this.registerRule(category, rule))
  }

  /**
   * Get all rules for a category
   * @param {string} category - Rule category
   * @returns {Array<Object>} Rules for the category
   */
  getRules(category) {
    return this.rules.get(category) || []
  }

  /**
   * Evaluate all rules for a category against context
   * @param {Object} context - Data context for rule evaluation
   * @param {string} category - Rule category to evaluate
   * @returns {Array<Object>} Matched rules with their messages
   */
  evaluateRules(context, category) {
    const categoryRules = this.getRules(category)
    const matched = []

    for (const rule of categoryRules) {
      try {
        if (rule.condition(context)) {
          matched.push({
            id: rule.id,
            message: rule.message(context),
            priority: rule.priority || 0,
            category
          })
        }
      } catch (error) {
        console.warn(`[RuleRegistry] Error evaluating rule "${rule.id}":`, error)
      }
    }

    // Sort by priority (descending)
    matched.sort((a, b) => b.priority - a.priority)

    return matched
  }

  /**
   * Clear all rules for a category
   * @param {string} category - Rule category
   */
  clearCategory(category) {
    this.rules.delete(category)
  }

  /**
   * Clear all rules
   */
  clearAll() {
    this.rules.clear()
  }

  /**
   * Get all categories
   * @returns {Array<string>} All registered categories
   */
  getCategories() {
    return Array.from(this.rules.keys())
  }
}

// Singleton instance
const registry = new RuleRegistry()

export { RuleRegistry }
export default registry
