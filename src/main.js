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
import { Utils, ConfettiEngine } from '../js/utils.js'
import { ThemeManager } from '../js/theme-manager.js'
import { LogoManager } from '../js/logo-manager.js'
import { NexoraPdfExport } from '../js/pdf-export.js'

// Import Supabase
import { supabase, testSupabaseConnection } from './supabase.js'

// Import Authentication system
import AuthContext from './auth/authContext.js'
import { initAuthRouting } from './auth/authRouting.js'
import AuthPages from './pages/AuthPages.js'
import { authStyles } from './styles/authStyles.js'
import { TransactionsService } from '../js/transactionsService.js'
import { BudgetCategoriesService } from '../js/budgetCategoriesService.js'
import { MonthlyBudgetStateService } from '../js/monthlyBudgetStateService.js'
import GoalsPage from './pages/GoalsPage.js'
import { GoalsService } from './goals/goalsService.js'
import { UserAppSettingsService } from '../js/userAppSettingsService.js'

// Expose modules globally for HTML event handlers and old code
window.StorageManager = StorageManager
window.Utils = Utils
window.ConfettiEngine = ConfettiEngine
window.ThemeManager = ThemeManager
window.LogoManager = LogoManager
window.NexoraPdfExport = NexoraPdfExport

// Expose Supabase globally for future modules
window.supabase = supabase

// Expose Auth context globally
window.AuthContext = AuthContext
window.TransactionsService = TransactionsService
window.BudgetCategoriesService = BudgetCategoriesService
window.MonthlyBudgetStateService = MonthlyBudgetStateService
window.GoalsService = GoalsService
window.GoalsPage = GoalsPage
window.UserAppSettingsService = UserAppSettingsService

const initGoalsStartupDebug = () => {
  if (window.nexoraGoalsStartupDebug) return
  window.nexoraGoalsStartupDebug = {
    authReady: false,
    syncStarted: false,
    syncFinished: false,
    cloudGoalsCount: null,
    localGoalsCount: null,
    goalsServiceCount: null,
    renderCount: 0,
    lastRenderAt: null,
    timeline: []
  }
  window.nexoraTraceGoalsStartup = (event, patch = {}) => {
    const state = window.nexoraGoalsStartupDebug
    const at = new Date().toISOString()
    Object.assign(state, patch)
    state.timeline.push({ at, event, patch })
    if (state.timeline.length > 80) state.timeline.shift()
    console.log('[GOALS STARTUP DEBUG]', event, patch, state)
    const target = document.getElementById('goals-startup-debug-json')
    if (target) {
      target.textContent = JSON.stringify(state, null, 2)
    }
  }
}

initGoalsStartupDebug()

// Expose helper functions globally (for HTML onclick handlers)
window.showToast = (msg) => Utils.showToast(msg)
window.closeModal = () => Utils.closeModal()
window.customConfirm = (title, message, onConfirm) => Utils.customConfirm(title, message, onConfirm)
window.triggerConfetti = () => ConfettiEngine.trigger()

/**
 * Inject Authentication Styles
 * Called during app initialization
 */
const injectAuthStyles = () => {
  const styleElement = document.createElement('style')
  styleElement.id = 'nexora-auth-styles'
  styleElement.textContent = authStyles
  document.head.appendChild(styleElement)
  console.log('🎨 Auth styles injected')
}

/**
 * Initialize Application
 * Runs after DOM is loaded
 */
const initApp = async () => {
  try {
    window.nexoraTraceGoalsStartup?.('initApp:start')
    // Initialize storage
    await StorageManager.initIndexedDB()
    console.log('📊 Storage initialized')
    
    // Initialize theme
    await ThemeManager.init()
    console.log('🎨 Theme initialized')
    
    // Initialize logo
    await LogoManager.init()
    console.log('🔤 Logo initialized')
    
    // Inject auth styles
    injectAuthStyles()
    
    // Test Supabase connection
    const supabaseReady = await testSupabaseConnection()
    if (supabaseReady) {
      console.log('☁️  Supabase ready for multi-user features')
    }
    
    // TODO: Update these logs when real Supabase credentials are configured
    console.log('🔐 Authentication system: PLACEHOLDER MODE (testing)')
    console.log('⚠️  To enable real Supabase auth, add these to .env:')
    console.log('   VITE_SUPABASE_URL=your_url')
    console.log('   VITE_SUPABASE_ANON_KEY=your_key')
    
    // Initialize authentication routing (handles login/register/dashboard)
    await initAuthRouting()

    // Hydrate goals before the first render so cloud-only goals appear on a fresh device.
    if (typeof UserAppSettingsService !== 'undefined' && UserAppSettingsService?.syncCloudSettingToLocal) {
      try {
        window.nexoraTraceGoalsStartup?.('main:goalsHydration:start')
        await UserAppSettingsService.syncCloudSettingToLocal('nexora_goals_v1')
        window.nexoraTraceGoalsStartup?.('main:goalsHydration:finish')
      } catch (e) {
        window.nexoraTraceGoalsStartup?.('main:goalsHydration:error', { error: e?.message || String(e) })
        console.warn('⚠️ Goals cloud hydration failed', e)
      }
    }

    // Initialize Goals premium section (separate layer)
    if (typeof GoalsPage !== 'undefined' && GoalsPage && typeof GoalsPage.init === 'function') {
      await GoalsPage.init()
      console.log('🎯 Goals module initialized')
    }

    // Sync user app settings from cloud/local where applicable
    if (typeof UserAppSettingsService !== 'undefined' && UserAppSettingsService && typeof UserAppSettingsService.syncAllAppSettings === 'function') {
      try {
        window.nexoraTraceGoalsStartup?.('main:syncAllAppSettings:start', { syncStarted: true, syncFinished: false })
        await UserAppSettingsService.syncAllAppSettings()
        window.nexoraTraceGoalsStartup?.('main:syncAllAppSettings:finish', { syncFinished: true })
        console.log('🔁 User app settings sync attempted')
      } catch (e) {
        window.nexoraTraceGoalsStartup?.('main:syncAllAppSettings:error', { syncFinished: true, error: e?.message || String(e) })
        console.warn('⚠️ User app settings sync failed', e)
      }
    }

    window.nexoraTraceGoalsStartup?.('initApp:finish')
    console.log('✅ Nexora initialized successfully')
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

// Expose app initialization for debugging
window.initApp = initApp
