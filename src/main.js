/**
 * Nexora - SaaS Budget Management App
 * Main entry point (Vite)
 *
 * Imports and initializes all core modules.
 * Maintains backward compatibility by exposing modules globally.
 * Integrates Supabase for multi-user cloud persistence with authentication.
 *
 * TODO: When Supabase credentials are added:
 * - Real auth will activate automatically
 * - No code changes needed
 * - Users will need to login/register
 */

// Import core modules
import { StorageManager } from '../js/storage.js'
import { Utils } from '../js/utils.js'
import { ThemeManager } from '../js/theme-manager.js'
import { LogoManager } from '../js/logo-manager.js'
import { NexoraPdfExport } from '../js/pdf-export.js'
import { NotificationsService } from '../js/notificationsService.js'

// Import Supabase
import { supabase, testSupabaseConnection } from './supabase.js'

// Import Authentication system
import AuthContext from './auth/authContext.js'
import { initAuthRouting } from './auth/authRouting.js'
import { authStyles } from './styles/authStyles.js'
import { TransactionsService } from '../js/transactionsService.js'
import { BudgetCategoriesService } from '../js/budgetCategoriesService.js'
import { MonthlyBudgetStateService } from '../js/monthlyBudgetStateService.js'
import GoalsPage from './pages/GoalsPage.js'
import { GoalsService } from './goals/goalsService.js'
import { UserAppSettingsService } from '../js/userAppSettingsService.js'
import { STORAGE_KEYS } from './constants/storageKeys.js'
import { renderAssistantCard } from './components/AssistantCard.js'
import CoupleUIComponent from './couple/coupleUIComponent.js'
import { CoupleService } from './couple/coupleService.js'
import './styles/design-system.css'
import './ui/index.css'
import { renderDashboardMaster } from './components/DashboardMaster.js'
import CoupleOverlay from './couple/coupleOverlay.js'
import { renderTreasuryPlanner } from './components/TreasuryPlannerUI.js'
import { renderSettingsPanels, renderRecurringIncomeSettings, renderBillScheduleSettings } from './settings/SettingsUI.js'
import { readAiSettings, updateAiSettings } from './advisor/proactiveCoachService.js'
import { buildJudgmentEngine } from './assistant/judgmentEngine.js'
import NexoraMotion from './ui/gsapMotion.js'
import { parseFinancialExpression } from './finance/financialExpression.js'
import { computeCycleBalances, computeCycleBalancesFromMetrics } from './finance/cycleBalance.js'
import { resolveActiveBudgetMonth } from './finance/budgetCycle.js'
import NexoraRecurringResolver from './finance/recurringResolution.js'
import NexoraCore from './ui/nexoraCore.js'
import { toggleAvailableMoneyOptions } from './ui/availableMoneyOptions.js'
import { buildDashboardGuidance } from './ui/dashboardGuidance.js'
import { renderDashboardHero } from './ui/dashboard/renderDashboardHero.js'
import { renderDashboardGoalCard } from './ui/dashboard/renderDashboardGoalCard.js'
import { renderDashboardKpiStrip } from './ui/dashboard/renderDashboardKpiStrip.js'
import { renderDashboardQuickView } from './ui/dashboard/renderDashboardQuickView.js'
import { renderDashboardAlerts } from './ui/dashboard/renderDashboardAlerts.js'
import { renderAssistantInsights } from './ui/dashboard/renderAssistantInsights.js'
import { renderBudgetCoach, buildBudgetCoachState } from './ui/budgetCoach.js'
import NexoraSections from './app/sectionLoader.js'
import { getSyncStatusSnapshot, recordLastSync } from './app/syncStatus.js'
import { APP_VERSION, formatBuildLabel } from './app/buildInfo.js'
import { renderAboutPanel, refreshAboutPanel } from './settings/aboutPanel.js'
import './app/metricsCache.js'
import { getUserDisplayName } from './auth/userDisplayName.js'
import SyncDiagnostics from './sync/syncDiagnostics.js'
import { readSyncedArray } from '../js/syncedSettingAccess.js'
import { filterUserFacingRecords } from './utils/userFacingFilter.js'
import { escapeHtml } from './utils/htmlEscape.js'
import { installLegacyBridge } from './legacy/legacyBridge.js'
import { createCoupleController } from './couple/coupleController.js'

// Import onboarding module
import { renderOnboarding, updateOnboardingStep, dismissOnboarding } from './onboarding/onboardingUI.js'
import { OnboardingIntegration } from './onboarding/onboardingIntegration.js'
import './onboarding/onboarding.css'

// Import bootstrap modules
import { bootstrapApplication } from './bootstrap/appBootstrap.js'
import { createAmountInputHandlers } from './ui/amountInputHandlers.js'

const loadNexoraExcelExport = () => import('../js/excel-export.js')

// Expose core modules globally for HTML event handlers and old code
// These are simple module exposures that can be safely moved to the bridge
installLegacyBridge({
  // Core utilities
  StorageManager,
  Utils,
  ThemeManager,
  LogoManager,
  NexoraPdfExport,
  loadNexoraExcelExport,
  NotificationsService,

  // AI and analytics
  NexoraAiSettingsService: { readAiSettings, updateAiSettings },
  NexoraMotion,
  NexoraRecurringResolver,
  NexoraCore,
  NexoraSections,
  toggleAvailableMoneyOptions,
  NexoraDashboardGuidance: { buildDashboardGuidance },
  renderDashboardHero,
  renderDashboardGoalCard,
  renderDashboardKpiStrip,
  renderDashboardQuickView,
  renderDashboardAlerts,
  renderAssistantInsights,
  renderBudgetCoach,
  buildBudgetCoachState,
  buildJudgmentEngine,
  NexoraBuild: { version: APP_VERSION, label: formatBuildLabel },
  getUserDisplayName: (user) => getUserDisplayName(user || AuthContext.getCurrentUser()),
  NexoraSyncDiagnostics: SyncDiagnostics,
  readSyncedArray,
  parseFinancialExpression,
  NexoraCycleBalance: { computeCycleBalances, computeCycleBalancesFromMetrics, resolveActiveBudgetMonth },
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
  NexoraStorageKeys: STORAGE_KEYS,
  CoupleUIComponent,
  CoupleOverlay,
  CoupleService,

  // Onboarding
  NexoraOnboarding: { renderOnboarding, updateOnboardingStep, dismissOnboarding },
  OnboardingIntegration
})

// Initialize Couple module controller
const coupleController = createCoupleController({
  CoupleService,
  GoalsService,
  readSyncedArray,
  filterUserFacingRecords,
  storageKeys: STORAGE_KEYS,
  parseFinancialExpression,
  escapeHtml,
  showToast: (msg) => Utils.showToast(msg),
  setCoupleFallbackMessage: (message) => {
    const banner = document.getElementById('couple-fallback-message')
    if (!banner) return
    banner.textContent = message
    banner.style.display = 'block'
  },
  onCoupleVisibilityChange: (value) => {
    window.__isCoupleTabVisible = Boolean(value)
  },
  documentRef: document
})

// Expose Couple functions for legacy compatibility
window.renderCoupleSection = coupleController.renderCoupleSection
window.updateCoupleNavigation = coupleController.updateCoupleNavigation
window.setCoupleFallbackMessage = (message) => {
  const banner = document.getElementById('couple-fallback-message')
  if (!banner) return
  banner.textContent = message
  banner.style.display = 'block'
}

// Expose business functions that cannot be moved to the bridge
// due to complex closures and dynamic imports
window.openTreasuryPlanner = async (opts = {}) => {
  try {
    await renderTreasuryPlanner('treasury-planner-root', opts)
  } catch (e) { console.warn('openTreasuryPlanner failed', e) }
}

let dashboardCoachRefreshPromise = null
window.refreshDashboardCoach = () => {
  if (dashboardCoachRefreshPromise) return dashboardCoachRefreshPromise

  dashboardCoachRefreshPromise = (async () => {
    if (typeof renderDashboardMaster !== 'function' || !document.getElementById('dashboard-master-root')) return
    const TreasuryService = (await import('./treasury/treasuryService.js')).default
    await renderDashboardMaster('dashboard-master-root', TreasuryService)
  })().finally(() => {
    dashboardCoachRefreshPromise = null
  })

  return dashboardCoachRefreshPromise
}

const formatEuro = (value) => `${(Number(value) || 0).toLocaleString('fr-FR')} €`

const renderNexoraStatusBarContent = (bar) => {
  if (!bar) return
  const sync = getSyncStatusSnapshot()
  const onlineClass = sync.online ? 'is-online' : 'is-offline'
  bar.innerHTML = `
    <span class="nexora-sync-dot ${onlineClass}" aria-hidden="true"></span>
    <span class="nexora-status-text">${formatBuildLabel()}</span>
    <span class="nexora-status-sub">${sync.label}</span>
  `
  bar.title = sync.lastAt ? `Dernière sync : ${new Date(sync.lastAt).toLocaleString('fr-FR')}` : 'Synchronisation locale'
}

const injectNexoraStatusBar = () => {
  if (document.getElementById('nexora-status-bar')) return
  const bar = document.createElement('div')
  bar.id = 'nexora-status-bar'
  bar.className = 'nexora-status-bar-fixed'
  bar.setAttribute('role', 'status')
  document.body.appendChild(bar)
  renderNexoraStatusBarContent(bar)
}

const refreshNexoraStatusBar = () => {
  renderNexoraStatusBarContent(document.getElementById('nexora-status-bar'))
}

window.refreshNexoraStatusBar = refreshNexoraStatusBar

/**
 * Inject Authentication Styles
 * Called during app initialization
 */
const injectAuthStyles = () => {
  const styleElement = document.createElement('style')
  styleElement.id = 'nexora-auth-styles'
  styleElement.textContent = authStyles
  document.head.appendChild(styleElement)
}

/**
 * Inject Couple UI Styles
 * Called during app initialization
 */
const injectCoupleStyles = () => {
  try {
    const styleElement = document.createElement('style')
    styleElement.id = 'nexora-couple-styles'
    styleElement.textContent = CoupleUIComponent.getCoupleCSS()
    document.head.appendChild(styleElement)
  } catch (err) {
    console.warn('⚠️ Couple UI styles injection failed', err)
  }
}

const initializeLegacyUiForAuthState = async (state = AuthContext.getState()) => {
  if (!state?.isAuthenticated || !state?.user) return null
  if (typeof window.initLegacyBudgetUi !== 'function') return null
  return window.initLegacyBudgetUi()
}

const waitForAuthenticatedState = () => {
  const currentState = AuthContext.getState()
  if (currentState.isAuthenticated && currentState.user) return Promise.resolve(currentState)
  return new Promise((resolve) => {
    const unsubscribe = AuthContext.subscribe((state) => {
      if (!state?.isAuthenticated || !state?.user) return
      unsubscribe()
      resolve(state)
    })
  })
}

/**
 * Initialize Application
 * Runs after DOM is loaded
 */
const initApp = async () => {
  try {
    // Create amount input handlers factory
    const attachAmountInputHandlers = createAmountInputHandlers({
      documentRef: document,
      parseFinancialExpression,
      formatCurrency: (v) => Utils.formatCurrency(v),
      showToast: (msg) => Utils.showToast(msg),
      clipboardDataRef: window.clipboardData
    })

    // Expose for manual re-attachment
    window.attachAmountInputHandlers = attachAmountInputHandlers

    // Run bootstrap with all dependencies
    await bootstrapApplication({
      // Pre-auth dependencies
      StorageManager,
      ThemeManager,
      LogoManager,
      injectAuthStyles,
      injectCoupleStyles,
      documentRef: document,
      initAuthRouting,
      waitForAuthenticatedState,

      // Authenticated services dependencies
      NotificationsService,
      MonthlyBudgetStateService,
      testSupabaseConnection,
      initializeLegacyUiForAuthState,
      updateCoupleNavigation: window.updateCoupleNavigation,
      AuthContext,
      navigatorRef: navigator,

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
      renderCoupleSection: window.renderCoupleSection,
      renderAssistantCard,
      renderDashboardMaster,
      refreshDashboardCoach: window.refreshDashboardCoach,

      // Event handlers dependencies
      parseFinancialExpression,
      formatCurrency: (v) => Utils.formatCurrency(v),
      showToast: (msg) => Utils.showToast(msg),
      clipboardDataRef: window.clipboardData,

      // Onboarding dependencies
      renderOnboarding,
      OnboardingIntegration
    })

    // Attach handlers after bootstrap
    if (typeof document !== 'undefined') {
      attachAmountInputHandlers()
    }
  } catch (err) {
    console.error('❌ App initialization error:', err)
  }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp)
} else {
  initApp()
}

// Exposed for manual recovery from the browser console if startup is interrupted.
window.initApp = initApp

// Minimal V7 toggle helper (no runtime side-effects beyond class toggle)
window.enableNexoraV7 = (enable = true) => {
  try {
    const panel = document.getElementById('nexora-core-panel')
    if (!panel) return false
    panel.classList.toggle('nexora-core--v7', !!enable)
    return true
  } catch (e) {
    console.warn('enableNexoraV7 failed', e)
    return false
  }
}

window.disableNexoraV7 = () => window.enableNexoraV7(false)

// Minimal V8 toggle helpers for Jarvis Command Center (manual QA only)
window.enableNexoraV8 = (enable = true) => {
  try {
    const panel = document.getElementById('nexora-core-panel')
    if (!panel) return false
    panel.classList.toggle('nexora-core--v8', !!enable)
    // ensure metrics hidden by default unless explicitly expanded
    if (!enable) panel.removeAttribute('data-details')
    return true
  } catch (e) {
    console.warn('enableNexoraV8 failed', e)
    return false
  }
}

window.disableNexoraV8 = () => window.enableNexoraV8(false)
