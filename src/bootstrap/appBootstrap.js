/**
 * Application Bootstrap Orchestrator
 *
 * Orchestrates the complete application initialization sequence.
 * Preserves the exact order of the 27 initialization steps from the original initApp.
 *
 * @param {Object} dependencies - All required dependencies for bootstrap
 * @returns {Promise<Object>} Cleanup functions and initialization results
 */
export async function bootstrapApplication(dependencies) {
  const {
    // Pre-auth dependencies
    StorageManager,
    ThemeManager,
    LogoManager,
    injectAuthStyles,
    injectCoupleStyles,
    documentRef,
    initAuthRouting,
    waitForAuthenticatedState,

    // Authenticated services dependencies
    NotificationsService,
    MonthlyBudgetStateService,
    testSupabaseConnection,
    initializeLegacyUiForAuthState,
    updateCoupleNavigation,
    AuthContext,
    navigatorRef,

    // User data dependencies
    UserAppSettingsService,
    STORAGE_KEYS,
    recordLastSync,
    SyncDiagnostics,
    refreshAboutPanel,
    refreshNexoraStatusBar,

    // UI dependencies
    GoalsPage,
    renderSettingsPanels,
    renderAboutPanel,
    injectNexoraStatusBar,
    NexoraMotion,
    renderCoupleSection,
    renderAssistantCard,
    renderTreasuryTimeline,
    renderDashboardMaster,
    refreshDashboardCoach,

    // Event handlers dependencies
    parseFinancialExpression,
    formatCurrency,
    showToast,
    clipboardDataRef,

    // Onboarding dependencies
    renderOnboarding,
    OnboardingIntegration
  } = dependencies

  // Import bootstrap modules
  const { bootstrapPreAuth } = await import('./preAuthBootstrap.js')
  const { bootstrapAuthenticatedServices } = await import('./authenticatedBootstrap.js')
  const { syncInitialGoals, syncUserApplicationSettings } = await import('./userDataBootstrap.js')
  const {
    renderPrimaryApplicationUi,
    injectStatusBar,
    applyApplicationMotion,
    refreshCoupleUi,
    renderAssistant,
    renderAdvancedApplicationUi
  } = await import('./applicationUiBootstrap.js')

  // ========================================
  // PHASE 1: PRE-AUTHENTICATION (Steps 1-7)
  // ========================================
  const authenticatedState = await bootstrapPreAuth({
    StorageManager,
    ThemeManager,
    LogoManager,
    injectAuthStyles,
    injectCoupleStyles,
    documentRef,
    initAuthRouting,
    waitForAuthenticatedState
  })

  // ========================================
  // PHASE 2: AUTHENTICATED SERVICES (Steps 8-13)
  // ========================================
  const { unsubscribeAuth } = await bootstrapAuthenticatedServices({
    NotificationsService,
    MonthlyBudgetStateService,
    testSupabaseConnection,
    initializeLegacyUiForAuthState,
    updateCoupleNavigation,
    AuthContext,
    navigatorRef
  })

  // ========================================
  // PHASE 3: USER DATA - INITIAL GOALS (Step 14)
  // ========================================
  await syncInitialGoals({
    UserAppSettingsService,
    STORAGE_KEYS
  })

  // ========================================
  // PHASE 4: PRIMARY UI (Steps 15-17)
  // ========================================
  await renderPrimaryApplicationUi({
    GoalsPage,
    renderSettingsPanels,
    renderAboutPanel
  })

  // ========================================
  // PHASE 5: STATUS BAR (Step 18)
  // ========================================
  injectStatusBar({
    injectNexoraStatusBar
  })

  // ========================================
  // PHASE 6: MOTION ANIMATIONS (Step 19)
  // ========================================
  applyApplicationMotion({
    NexoraMotion
  })

  // ========================================
  // PHASE 7: REFRESH COUPLE UI (Steps 20-21)
  // ========================================
  await refreshCoupleUi({
    updateCoupleNavigation,
    renderCoupleSection
  })

  // ========================================
  // PHASE 8: USER DATA - SETTINGS SYNC (Steps 22-23)
  // ========================================
  await syncUserApplicationSettings({
    UserAppSettingsService,
    recordLastSync,
    SyncDiagnostics,
    refreshAboutPanel,
    refreshNexoraStatusBar
  })

  // ========================================
  // PHASE 9: ASSISTANT CARD (Step 24)
  // ========================================
  await renderAssistant({
    renderAssistantCard
  })

  // ========================================
  // PHASE 10: ADVANCED UI (Steps 25-27)
  // ========================================
  await renderAdvancedApplicationUi({
    renderTreasuryTimeline,
    renderDashboardMaster,
    refreshDashboardCoach,
    documentRef
  })

  // ========================================
  // PHASE 11: ONBOARDING (Step 28)
  // ========================================
  if (OnboardingIntegration) {
    OnboardingIntegration.init(renderOnboarding)
  }
  
  // Onboarding rendering is now managed by OnboardingIntegration
  // It will render when user navigates to dashboard, after context is established

  return {
    unsubscribeAuth
  }
}
