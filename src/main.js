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

// Expose helper functions globally (for HTML onclick handlers)
window.showToast = (msg) => Utils.showToast(msg)
window.closeModal = () => Utils.closeModal()
window.customConfirm = (title, message, onConfirm) => Utils.customConfirm(title, message, onConfirm)
window.triggerConfetti = () => ConfettiEngine.trigger()

const isDebugSyncEnabled = () => {
  try {
    return window.localStorage?.getItem('nexora_debug_sync') === '1'
  } catch {
    return false
  }
}

const readDebugLocalValue = async (key) => {
  const storageRaw = await StorageManager.getItem(key).catch(() => null)
  let safeRaw = null
  try {
    safeRaw = window.localStorage?.getItem(key) || null
  } catch {
    safeRaw = null
  }
  return { storageRaw, safeRaw }
}

const refreshNexoraDebugSync = async () => {
  const panel = document.getElementById('nexora-debug-sync-panel')
  const output = document.getElementById('nexora-debug-sync-output')
  if (!isDebugSyncEnabled()) {
    if (panel) panel.style.display = 'none'
    window.nexoraDebugSync = { enabled: false, refreshed_at: new Date().toISOString() }
    return window.nexoraDebugSync
  }

  if (panel) panel.style.display = 'block'
  const state = {
    enabled: true,
    refreshed_at: new Date().toISOString(),
    auth: {
      isAuthenticated: Boolean(window.AuthContext?.isAuthenticated?.()),
      userId: window.AuthContext?.getUser?.()?.id || null
    },
    supabase: {
      userId: null,
      userAppSettingsRaw: null,
      goalsPayload: null,
      error: null
    },
    hydration: {
      attempted: false,
      savedLocal: false,
      renderTriggered: false,
      error: null
    },
    goals: {
      afterMergeCount: null,
      finalGoals: null
    },
    local: {
      finalRaw: null
    }
  }

  try {
    const sessionResp = await supabase.auth.getSession()
    const userId = sessionResp?.data?.session?.user?.id || null
    state.supabase.userId = userId
    if (userId) {
      const { data, error } = await supabase
        .from('user_app_settings')
        .select('*')
        .eq('user_id', userId)
        .eq('key', 'nexora_goals_v1')
        .single()
      state.supabase.userAppSettingsRaw = data || null
      state.supabase.goalsPayload = data?.data ?? null
      state.supabase.error = error || null

      if (Array.isArray(state.supabase.goalsPayload) && state.supabase.goalsPayload.length > 0) {
        state.hydration.attempted = true
        try {
          await UserAppSettingsService.saveSetting('nexora_goals_v1', state.supabase.goalsPayload)
          state.hydration.savedLocal = true
        } catch (hydrationError) {
          state.hydration.error = hydrationError?.message || String(hydrationError)
        }
      }
    }
  } catch (error) {
    state.supabase.error = {
      message: error?.message || String(error),
      code: error?.code || null
    }
  }

  try {
    const goals = await GoalsService.getGoals()
    state.goals.finalGoals = goals
    state.goals.afterMergeCount = Array.isArray(goals) ? goals.length : null
    if (state.hydration.savedLocal && window.GoalsPage?.render) {
      await window.GoalsPage.render()
      if (window.GoalsPage?.renderAnalytics) await window.GoalsPage.renderAnalytics()
      state.hydration.renderTriggered = true
    }
  } catch (error) {
    state.goals.error = error?.message || String(error)
  }

  state.local.finalRaw = await readDebugLocalValue('nexora_goals_v1')
  window.nexoraDebugSync = state
  if (output) output.textContent = JSON.stringify(state, null, 2)
  return state
}

window.refreshNexoraDebugSync = refreshNexoraDebugSync
window.nexoraDebugSync = { enabled: false }
window.enableNexoraDebugSync = async () => {
  try {
    window.localStorage?.setItem('nexora_debug_sync', '1')
  } catch {}
  await refreshNexoraDebugSync()
}
window.disableNexoraDebugSync = async () => {
  try {
    window.localStorage?.removeItem('nexora_debug_sync')
  } catch {}
  await refreshNexoraDebugSync()
}

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
    // Initialize Goals premium section (separate layer)
    if (typeof GoalsPage !== 'undefined' && GoalsPage && typeof GoalsPage.init === 'function') {
      await GoalsPage.init()
      console.log('🎯 Goals module initialized')
    }

    // Sync user app settings from cloud/local where applicable
    if (typeof UserAppSettingsService !== 'undefined' && UserAppSettingsService && typeof UserAppSettingsService.syncAllAppSettings === 'function') {
      try {
        const sessionResp = await supabase.auth.getSession().catch(() => null)
        console.log('[MAIN SETTINGS SYNC USER]', sessionResp?.data?.session?.user?.id)
        await UserAppSettingsService.syncAllAppSettings()
        console.log('🔁 User app settings sync attempted')
        await refreshNexoraDebugSync()
      } catch (e) {
        console.warn('⚠️ User app settings sync failed', e)
      }
    }

    await refreshNexoraDebugSync()
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
