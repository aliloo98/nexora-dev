/**
 * Couple State Management
 *
 * Manages internal state for the Couple module.
 * Provides controlled access to couple visibility state.
 * Synchronizes state changes with a legacy global via callback.
 */

/**
 * Create a couple state instance with synchronization callback
 * @param {Object} options
 * @param {boolean} options.initialVisible - Initial visibility state
 * @param {Function} options.onVisibilityChange - Callback called when visibility changes
 * @returns {Object} State API
 */
export function createCoupleState({
  initialVisible = false,
  onVisibilityChange = () => {}
} = {}) {
  let isCoupleTabVisible = Boolean(initialVisible)

  /**
   * Get the current visibility state of the couple tab
   * @returns {boolean}
   */
  function getIsCoupleTabVisible() {
    return isCoupleTabVisible
  }

  /**
   * Set the visibility state of the couple tab
   * @param {boolean} value
   * @returns {boolean} The new visibility state
   */
  function setIsCoupleTabVisible(value) {
    isCoupleTabVisible = Boolean(value)
    onVisibilityChange(isCoupleTabVisible)
    return isCoupleTabVisible
  }

  // Synchronize initial state
  onVisibilityChange(isCoupleTabVisible)

  return {
    getIsCoupleTabVisible,
    setIsCoupleTabVisible
  }
}
