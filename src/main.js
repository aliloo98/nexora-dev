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
import { NotificationsService } from '../js/notificationsService.js'

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
import { STORAGE_KEYS } from './constants/storageKeys.js'
import { renderAssistantCard } from './components/AssistantCard.js'

// Expose modules globally for HTML event handlers and old code
window.StorageManager = StorageManager
window.Utils = Utils
window.ConfettiEngine = ConfettiEngine
window.ThemeManager = ThemeManager
window.LogoManager = LogoManager
window.NexoraPdfExport = NexoraPdfExport
window.NotificationsService = NotificationsService

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
window.NexoraStorageKeys = STORAGE_KEYS

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
}

/**
 * Initialize Application
 * Runs after DOM is loaded
 */
const initApp = async () => {
  try {
    // Initialize storage
    await StorageManager.initIndexedDB()

    // Initialize theme
    await ThemeManager.init()

    // Initialize logo
    await LogoManager.init()

    // Inject auth styles
    injectAuthStyles()

    // Initialize local notifications layer
    await NotificationsService.init()

    // Keep the connection check for early failure visibility without blocking offline usage.
    if (navigator.onLine !== false) {
      await testSupabaseConnection()
    } else {
      console.info('📴 Supabase connection check skipped while offline')
    }

    // Initialize authentication routing (handles login/register/dashboard)
    await initAuthRouting()

    // Hydrate goals before the first render so cloud-only goals appear on a fresh device.
    if (typeof UserAppSettingsService !== 'undefined' && UserAppSettingsService?.syncCloudSettingToLocal) {
      try {
        await UserAppSettingsService.syncCloudSettingToLocal(STORAGE_KEYS.goals)
      } catch (e) {
        console.warn('⚠️ Goals cloud hydration failed', e)
      }
    }

    // Initialize Goals premium section (separate layer)
    if (typeof GoalsPage !== 'undefined' && GoalsPage && typeof GoalsPage.init === 'function') {
      await GoalsPage.init()
    }

    // Sync user app settings from cloud/local where applicable
    if (typeof UserAppSettingsService !== 'undefined' && UserAppSettingsService && typeof UserAppSettingsService.syncAllAppSettings === 'function') {
      try {
        await UserAppSettingsService.syncAllAppSettings()
      } catch (e) {
        console.warn('⚠️ User app settings sync failed', e)
      }
    }

    // Attach amount input handlers to sanitize user input (prevent letters, support French formats)
    const attachAmountInputHandlers = () => {
        const sanitize = (v) => String(v ?? '')
          .replace(/[^0-9\s,\.\-]/g, '') // allow digits, spaces, comma, dot, minus
          .replace(/\,+/g, ',')
          .replace(/\.+/g, '.')
          .trim()

        const isAmountInput = (input) => {
          if (!input || input.classList.contains('note-input')) return false
          if (input.type === 'date' || input.type === 'color') return false
          if (input.dataset?.key) return true
          if (input.type === 'number') return true
          return [
            'goal-monthly-contrib',
            'goal-new-target',
            'goal-new-current',
            'notification-expense-threshold',
            'budget-cycle-start-day',
            'budget-cycle-end-day'
          ].includes(input.id)
        }

        const inputs = document.querySelectorAll('.budget-input')
        inputs.forEach(input => {
          if (!isAmountInput(input)) return
          if (input.__amountHandlerAttached) return
          input.__amountHandlerAttached = true

          input.addEventListener('input', (e) => {
            const selStart = input.selectionStart
            const selEnd = input.selectionEnd
            const cleaned = sanitize(input.value)
            if (cleaned !== input.value) {
              input.value = cleaned
              try { input.setSelectionRange(selStart - 1, selEnd - 1) } catch (err) {}
            }
          })

          input.addEventListener('paste', (e) => {
            e.preventDefault()
            const text = (e.clipboardData || window.clipboardData).getData('text') || ''
            const cleaned = sanitize(text)
            document.execCommand('insertText', false, cleaned)
          })

          input.addEventListener('blur', (e) => {
            const raw = sanitize(input.value)
            const numeric = parseFloat(String(raw).replace(/\s/g, '').replace(',', '.'))
            if (!Number.isNaN(numeric) && typeof window.Utils?.formatCurrency === 'function') {
              try { input.value = window.Utils.formatCurrency(numeric) } catch (err) {}
            }
          })
        })
      }

      // Run once after init and also expose for manual re-attachment
      if (typeof document !== 'undefined') {
        attachAmountInputHandlers()
        window.attachAmountInputHandlers = attachAmountInputHandlers
      }
    // Render Assistant Nexora card (rules-based, local-only)
    try {
      if (typeof renderAssistantCard === 'function') await renderAssistantCard()
    } catch (e) {
      console.warn('[Assistant] render failed', e)
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
