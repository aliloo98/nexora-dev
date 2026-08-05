/**
 * Legacy Bridge - Compatibility Layer for index.html
 *
 * This module provides a single entry point for exposing modern ES modules
 * to legacy code that depends on window.* globals.
 *
 * All global exposures are centralized here to maintain backward compatibility
 * while keeping main.js clean and focused on initialization.
 *
 * TODO: Gradually migrate legacy code to use ES module imports directly
 */

/**
 * Install Legacy Bridge
 *
 * Exposes core modules and simple services for legacy code (index.html handlers, etc.)
 * Called from main.js after all modules are initialized.
 *
 * Complex functions defined inline in main.js (like renderCoupleSection, updateCoupleNavigation)
 * are NOT handled here - they remain in main.js to avoid initialization order issues.
 *
 * @param {Object} dependencies - Core modules and services to expose globally
 */
export function installLegacyBridge(dependencies) {
  const {
    // Core utilities
    StorageManager,
    Utils,
    ThemeManager,
    LogoManager,
    NexoraPdfExport,
    loadNexoraExcelExport,
    NotificationsService,

    // AI and analytics
    NexoraAiSettingsService,
    NexoraMotion,
    NexoraRecurringResolver,
    NexoraCore,
    NexoraSections,
    toggleAvailableMoneyOptions,
    NexoraDashboardGuidance,
    renderDashboardHero,
    renderDashboardGoalCard,
    renderDashboardKpiStrip,
    renderDashboardQuickView,
    renderDashboardAlerts,
    renderAssistantInsights,
    renderPremiumCockpit,
    renderBudgetCoach,
    buildBudgetCoachState,
    buildJudgmentEngine,
    NexoraBuild,
    getUserDisplayName,
    NexoraSyncDiagnostics,
    readSyncedArray,
    parseFinancialExpression,
    NexoraCycleBalance,
    renderRecurringIncomeSettings,
    renderBillScheduleSettings,

    // Supabase
    supabase,

    // Authentication and services
    AuthContext,
    TransactionsService,
    BudgetCategoriesService,
    MonthlyBudgetStateService,
    GoalsService,
    GoalsPage,
    UserAppSettingsService,
    NexoraStorageKeys,
    CoupleUIComponent,
    CoupleOverlay,
    CoupleService,

    // Onboarding
    NexoraOnboarding,
    OnboardingIntegration,
    OnboardingService
  } = dependencies

  // Expose core utilities and UI modules
  window.StorageManager = StorageManager
  window.Utils = Utils
  window.ThemeManager = ThemeManager
  window.LogoManager = LogoManager
  window.NexoraPdfExport = NexoraPdfExport
  window.loadNexoraExcelExport = loadNexoraExcelExport
  window.NotificationsService = NotificationsService

  // Expose AI and analytics
  window.NexoraAiSettingsService = NexoraAiSettingsService
  window.NexoraMotion = NexoraMotion
  window.NexoraRecurringResolver = NexoraRecurringResolver
  window.NexoraCore = NexoraCore
  window.NexoraSections = NexoraSections
  window.toggleAvailableMoneyOptions = toggleAvailableMoneyOptions
  window.NexoraDashboardGuidance = NexoraDashboardGuidance
  window.renderDashboardHero = renderDashboardHero
  window.renderDashboardGoalCard = renderDashboardGoalCard
  window.renderDashboardKpiStrip = renderDashboardKpiStrip
  window.renderDashboardQuickView = renderDashboardQuickView
  window.renderDashboardAlerts = renderDashboardAlerts
  window.renderAssistantInsights = renderAssistantInsights
  window.renderPremiumCockpit = renderPremiumCockpit
  window.renderBudgetCoach = renderBudgetCoach
  window.buildBudgetCoachState = buildBudgetCoachState
  window.buildJudgmentEngine = buildJudgmentEngine
  window.NexoraBuild = NexoraBuild
  window.getUserDisplayName = getUserDisplayName
  window.NexoraSyncDiagnostics = NexoraSyncDiagnostics
  window.readSyncedArray = readSyncedArray
  window.parseFinancialExpression = parseFinancialExpression
  window.NexoraCycleBalance = NexoraCycleBalance
  window.renderRecurringIncomeSettings = renderRecurringIncomeSettings
  window.renderBillScheduleSettings = renderBillScheduleSettings

  // Expose Supabase
  window.supabase = supabase

  // Expose authentication and services
  window.AuthContext = AuthContext
  window.TransactionsService = TransactionsService
  window.BudgetCategoriesService = BudgetCategoriesService
  window.MonthlyBudgetStateService = MonthlyBudgetStateService
  window.GoalsService = GoalsService
  window.GoalsPage = GoalsPage
  window.UserAppSettingsService = UserAppSettingsService
  window.NexoraStorageKeys = NexoraStorageKeys
  window.CoupleUIComponent = CoupleUIComponent
  window.CoupleOverlay = CoupleOverlay
  window.CoupleService = CoupleService

  // Expose onboarding
  window.NexoraOnboarding = NexoraOnboarding
  window.OnboardingIntegration = OnboardingIntegration
  window.OnboardingService = OnboardingService

  // Expose helper functions (for HTML onclick handlers)
  window.showToast = (msg, options) => Utils.showToast(msg, options)
  window.customConfirm = (title, message, onConfirm, options) => Utils.customConfirm(title, message, onConfirm, options)
}
