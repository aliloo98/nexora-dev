/**
 * Couple Navigation Manager
 *
 * Responsible for managing the Couple tab visibility and navigation state.
 * Coordinates with CoupleService to determine if the couple tab should be shown.
 */

/**
 * Create the Couple navigation manager
 * @param {Object} dependencies
 * @param {Object} dependencies.CoupleService - Couple service for household operations
 * @param {Function} dependencies.setCoupleFallbackMessage - Function to set fallback message
 * @param {Function} dependencies.renderCoupleSection - Function to render the couple section
 * @param {Function} dependencies.setIsCoupleTabVisible - Function to set internal state
 * @param {Object} dependencies.documentRef - Document reference (for DOM access)
 */
export function createCoupleNavigation({
  CoupleService,
  setCoupleFallbackMessage,
  renderCoupleSection,
  setIsCoupleTabVisible,
  documentRef = document
}) {
  /**
   * Update the Couple navigation visibility and state
   * @returns {Promise<boolean>} True if couple is active/visible
   */
  const updateCoupleNavigationInternal = async () => {
    try {
      const coupleNav = documentRef.querySelector('.sidebar .nav-btn[data-section="couple"]')
      const isVisible = CoupleService.getLocalHousehold()?.status === 'active'

      if (coupleNav) {
        coupleNav.style.display = isVisible ? 'inline-flex' : 'none'
      }

      setIsCoupleTabVisible(isVisible)

      if (!isVisible) {
        setCoupleFallbackMessage("Active le mode couple pour afficher l'onglet Couple.")
      } else {
        const banner = documentRef.getElementById('couple-fallback-message')
        if (banner) banner.style.display = 'none'
        await renderCoupleSection()
      }
      return isVisible
    } catch (error) {
      console.warn('[Couple] update nav failed', error)
      return false
    }
  }

  return {
    updateCoupleNavigation: updateCoupleNavigationInternal
  }
}
