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

  // Step 10: Keep the connection check for early failure visibility without blocking offline usage
  if (navigatorRef.onLine !== false) {
    await testSupabaseConnection()
  } else {
    console.info('📴 Supabase connection check skipped while offline')
  }

  // Step 11: Initialize legacy UI for auth state
  await initializeLegacyUiForAuthState()

  // Step 12: First Couple navigation update
  await updateCoupleNavigation()

  // Step 13: Subscribe to auth context changes
  let unsubscribe = null
  if (typeof AuthContext.subscribe === 'function') {
    unsubscribe = AuthContext.subscribe(() => {
      if (typeof updateCoupleNavigation === 'function') {
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
