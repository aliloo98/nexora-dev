/**
 * Pre-Authentication Bootstrap
 *
 * Handles initialization steps that must occur before user authentication:
 * - Storage initialization
 * - Theme and logo setup
 * - Style injection
 * - Authentication routing setup
 * - Waiting for authenticated state
 *
 * @param {Object} dependencies
 * @param {Object} dependencies.StorageManager - Storage manager for IndexedDB
 * @param {Object} dependencies.ThemeManager - Theme manager
 * @param {Object} dependencies.LogoManager - Logo manager
 * @param {Function} dependencies.injectAuthStyles - Function to inject auth styles
 * @param {Function} dependencies.injectCoupleStyles - Function to inject couple styles
 * @param {Object} dependencies.documentRef - Document reference (for DOM access)
 * @param {Function} dependencies.initAuthRouting - Function to initialize auth routing
 * @param {Function} dependencies.waitForAuthenticatedState - Function to wait for auth
 * @returns {Promise<Object>} Authenticated state
 */

import { V1_SCOPE } from '../constants/v1Scope.js'

export async function bootstrapPreAuth({
  StorageManager,
  ThemeManager,
  LogoManager,
  injectAuthStyles,
  injectCoupleStyles,
  documentRef = document,
  initAuthRouting,
  waitForAuthenticatedState
}) {
  // Step 1: Initialize storage
  await StorageManager.initIndexedDB()

  // Step 2: Initialize theme
  await ThemeManager.init()

  // Step 3: Initialize logo
  await LogoManager.init()

  // Step 4: Inject auth styles
  injectAuthStyles()

  // Step 5: Inject couple UI styles (V1: disabled)
  if (V1_SCOPE.COUPLE_MODE_ENABLED && typeof injectCoupleStyles === 'function') {
    injectCoupleStyles()
  }

  // Step 5.5: Show/hide Couple DOM elements based on V1 scope
  const coupleNavBtn = documentRef.querySelector('.couple-nav-btn')
  const coupleSection = documentRef.getElementById('section-couple')
  
  if (V1_SCOPE.COUPLE_MODE_ENABLED) {
    // Enable Couple: show navigation and section
    if (coupleNavBtn) coupleNavBtn.style.display = ''
    if (coupleSection) coupleSection.style.display = ''
  } else {
    // Disable Couple: hide navigation and section
    if (coupleNavBtn) coupleNavBtn.style.display = 'none'
    if (coupleSection) coupleSection.style.display = 'none'
  }

  // Step 6: Initialize authentication routing
  await initAuthRouting()

  // Step 7: Wait for authenticated state
  const authenticatedState = await waitForAuthenticatedState()

  return authenticatedState
}
