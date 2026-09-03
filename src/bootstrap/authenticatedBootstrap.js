/**
 * Authenticated Services Bootstrap
 *
 * Handles initialization steps that require an authenticated user:
 * - User-scoped services initialization
 * - Supabase connection check
 * - Legacy UI initialization
 * - Couple navigation setup
 * - Auth state subscription
 *
 * @param {Object} dependencies
 * @param {Object} dependencies.NotificationsService - Notifications service
 * @param {Object} dependencies.MonthlyBudgetStateService - Monthly budget state service
 * @param {Function} dependencies.testSupabaseConnection - Function to test Supabase
 * @param {Function} dependencies.initializeLegacyUiForAuthState - Function to init legacy UI
 * @param {Function} dependencies.updateCoupleNavigation - Function to update Couple nav
 * @param {Object} dependencies.AuthContext - Authentication context
 * @param {Object} dependencies.navigatorRef - Navigator reference
 * @returns {Object} Cleanup functions (e.g., unsubscribe)
 */

import { V1_SCOPE } from '../constants/v1Scope.js'

export async function bootstrapAuthenticatedServices({
  NotificationsService,
  MonthlyBudgetStateService,
  testSupabaseConnection,
  initializeLegacyUiForAuthState,
  updateCoupleNavigation,
  AuthContext,
  navigatorRef = navigator
}) {
  // Step 8: Initialize notifications service
  await NotificationsService.init()

  // Step 9: Initialize monthly budget state service
  await MonthlyBudgetStateService.init()

  // Step 10: Initialize legacy UI for auth state without waiting for diagnostics
  await initializeLegacyUiForAuthState()

  // The connection check is diagnostic only and must not delay the first usable dashboard.
  if (navigatorRef.onLine !== false) {
    void testSupabaseConnection().catch((error) => {
      console.warn('[Bootstrap] Supabase connection check failed', error)
    })
  } else {
    console.info('📴 Supabase connection check skipped while offline')
  }

  // Step 11: First Couple navigation update (V1: disabled)
  if (V1_SCOPE.COUPLE_MODE_ENABLED && typeof updateCoupleNavigation === 'function') {
    await updateCoupleNavigation()
  }

  // Step 13: Subscribe to auth context changes (V1: Couple navigation disabled)
  let unsubscribe = null
  if (typeof AuthContext.subscribe === 'function') {
    unsubscribe = AuthContext.subscribe(() => {
      if (V1_SCOPE.COUPLE_MODE_ENABLED && typeof updateCoupleNavigation === 'function') {
        updateCoupleNavigation().catch((err) => {
          console.warn('[Couple] update navigation failed', err)
        })
      }
    })
  }

  return {
    unsubscribeAuth: unsubscribe
  }
}
