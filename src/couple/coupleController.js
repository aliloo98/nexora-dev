/**
 * Couple Controller
 *
 * Main entry point for the Couple module.
 * Coordinates state, rendering, and navigation for the Couple feature.
 */

import { createCoupleSectionRenderer } from './coupleSectionRenderer.js'
import { createCoupleNavigation } from './coupleNavigation.js'
import { createCoupleState } from './coupleState.js'

/**
 * Create the Couple controller
 * @param {Object} dependencies
 * @param {Object} dependencies.CoupleService - Couple service for household and sharing operations
 * @param {Object} dependencies.GoalsService - Goals service for reading user goals
 * @param {Function} dependencies.readSyncedArray - Function to read synced arrays
 * @param {Function} dependencies.filterUserFacingRecords - Function to filter records
 * @param {Object} dependencies.storageKeys - Storage keys for data access
 * @param {Function} dependencies.parseFinancialExpression - Function to parse financial values
 * @param {Function} dependencies.escapeHtml - Function to escape HTML
 * @param {Function} dependencies.showToast - Function to show toast messages
 * @param {Function} dependencies.setCoupleFallbackMessage - Function to set fallback message
 * @param {Function} dependencies.onCoupleVisibilityChange - Callback for visibility state changes
 * @param {Object} dependencies.documentRef - Document reference (for DOM access)
 * @returns {Object} Couple controller API
 */
export function createCoupleController({
  CoupleService,
  GoalsService,
  readSyncedArray,
  filterUserFacingRecords,
  storageKeys,
  parseFinancialExpression,
  escapeHtml,
  showToast,
  setCoupleFallbackMessage,
  onCoupleVisibilityChange = () => {},
  documentRef = document
}) {
  // Create state with synchronization callback
  const coupleState = createCoupleState({
    initialVisible: false,
    onVisibilityChange: onCoupleVisibilityChange
  })

  // Format euro helper
  const formatEuro = (value) => `${(Number(value) || 0).toLocaleString('fr-FR')} €`

  // Create section renderer with a placeholder render function
  let renderCoupleSectionFn = null

  const sectionRenderer = createCoupleSectionRenderer({
    CoupleService,
    GoalsService,
    readSyncedArray,
    filterUserFacingRecords,
    storageKeys,
    parseFinancialExpression,
    escapeHtml,
    formatEuro,
    showToast,
    renderCoupleSection: () => renderCoupleSectionFn ? renderCoupleSectionFn() : Promise.resolve(),
    documentRef
  })

  // Set the actual render function
  renderCoupleSectionFn = sectionRenderer.renderCoupleSection

  // Create navigation manager
  const navigationManager = createCoupleNavigation({
    CoupleService,
    setCoupleFallbackMessage,
    renderCoupleSection: renderCoupleSectionFn,
    setIsCoupleTabVisible: coupleState.setIsCoupleTabVisible,
    documentRef
  })

  return {
    // Public API for legacy compatibility
    renderCoupleSection: renderCoupleSectionFn,
    updateCoupleNavigation: navigationManager.updateCoupleNavigation,
    setCoupleFallbackMessage,
    getIsCoupleTabVisible: coupleState.getIsCoupleTabVisible,
    setIsCoupleTabVisible: coupleState.setIsCoupleTabVisible
  }
}
