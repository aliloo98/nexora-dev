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
import CoupleUIComponent from './couple/coupleUIComponent.js'
import { renderTreasuryTimeline } from './components/TreasuryTimeline.js'
import './styles/design-system.css'
import { renderDashboardMaster } from './components/DashboardMaster.js'
import { renderAdvisorUI } from './advisor/AdvisorUI.js'
import CoupleOverlay from './couple/coupleOverlay.js'
import { renderTreasuryPlanner } from './components/TreasuryPlannerUI.js'
import { renderPlanHub } from './plan/PlanHubUI.js'
import { renderSettingsPanels, renderRecurringIncomeSettings, renderBillScheduleSettings } from './settings/SettingsUI.js'
import { CoupleService } from './couple/coupleService.js'

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
window.CoupleUIComponent = CoupleUIComponent
window.CoupleOverlay = CoupleOverlay
window.openTreasuryPlanner = async (opts = {}) => {
  try {
    await renderTreasuryPlanner('treasury-planner-root', opts)
  } catch (e) { console.warn('openTreasuryPlanner failed', e) }
}

// Expose helper functions globally (for HTML onclick handlers)
window.showToast = (msg) => Utils.showToast(msg)
window.closeModal = () => Utils.closeModal()
window.customConfirm = (title, message, onConfirm) => Utils.customConfirm(title, message, onConfirm)
window.triggerConfetti = () => ConfettiEngine.trigger()

window.setCoupleFallbackMessage = (message) => {
  const banner = document.getElementById('couple-fallback-message')
  if (!banner) return
  banner.textContent = message
  banner.style.display = 'block'
}

window.renderCoupleSection = async () => {
  const section = document.getElementById('section-couple')
  if (!section) return

  const user = AuthContext.getState()?.user
  const status = await CoupleService.getCombinedStatus(user)

  if (status.status === 'couple_actif') {
    const monthlyBudget = await TransactionsService.getBudgetMonth(new Date().toISOString().slice(0, 7)).catch(() => ({}))
    const user1Income = Number(monthlyBudget.rev_ali) || 0
    const user2Income = Number(monthlyBudget.rev_megane) || 0
    const commonExpenses = Object.entries(monthlyBudget).reduce((total, [key, value]) => {
      if (typeof value === 'number' || typeof value === 'string') {
        if (!key.startsWith('rev_')) {
          return total + Number(value || 0)
        }
      }
      return total
    }, 0)
    const commonIncome = user1Income + user2Income
    const remaining = commonIncome - commonExpenses

    section.style.display = 'block'
    section.innerHTML = `
      <div class="budget-block">
        <div class="budget-block-header">
          <span class="budget-block-title">❤️ Budget couple</span>
          <span style="font-size:12px;color:var(--text2)">Partage local et aperçu des finances du foyer</span>
        </div>
        <div style="padding:16px;display:grid;gap:16px;">
          <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:16px;">
            <div class="kpi-card"><div class="kpi-icon">💰</div><div class="kpi-label">Revenus foyer</div><div class="kpi-value">${commonIncome.toLocaleString('fr-FR')} €</div></div>
            <div class="kpi-card"><div class="kpi-icon">📉</div><div class="kpi-label">Charges communes</div><div class="kpi-value">${commonExpenses.toLocaleString('fr-FR')} €</div></div>
            <div class="kpi-card"><div class="kpi-icon">✨</div><div class="kpi-label">Reste disponible</div><div class="kpi-value">${remaining.toLocaleString('fr-FR')} €</div></div>
          </div>
          <div style="display:flex;flex-wrap:wrap;gap:12px;align-items:center;justify-content:flex-start;">
            <button class="btn btn-outline" type="button" onclick="showSection('plan')">Retour au Plan</button>
            <button class="btn btn-outline" type="button" onclick="showSection('parametres')">Paramètres couple</button>
          </div>
        </div>
      </div>
    `
  } else {
    section.style.display = 'block'
    section.innerHTML = `
      <div class="budget-block">
        <div class="budget-block-header">
          <span class="budget-block-title">❤️ Mode couple</span>
          <span style="font-size:12px;color:var(--text2)">Partage le budget de ton foyer</span>
        </div>
        <div style="padding:16px;display:grid;gap:12px;">
          <p>Le mode couple permet de synchroniser et visualiser les finances du foyer. Activez-le pour partager les revenus et charges.</p>
          <div style="display:flex;flex-wrap:wrap;gap:12px;align-items:center;justify-content:flex-start;">
            <button class="btn btn-outline" type="button" onclick="showSection('parametres')">Ouvrir les paramètres</button>
            <button class="btn btn-outline" type="button" disabled>Inviter un partenaire <span class="badge-coming">À venir</span></button>
            <button class="btn btn-outline" type="button" disabled>Fusionner les budgets <span class="badge-coming">À venir</span></button>
            <button class="btn btn-outline" type="button" onclick="showSection('plan')">Retour au Plan</button>
          </div>
        </div>
      </div>
    `
  }
}

window.updateCoupleNavigation = async () => {
  try {
    const coupleNav = document.querySelector('.sidebar .nav-btn[data-section="couple"]')
    const user = AuthContext.getState()?.user
    const status = await CoupleService.getCombinedStatus(user)
    const isVisible = status.status === 'couple_actif'

    if (coupleNav) {
      coupleNav.style.display = isVisible ? 'inline-flex' : 'none'
    }

    if (typeof window.renderCoupleSection === 'function') {
      await window.renderCoupleSection()
    }

    window.__isCoupleTabVisible = isVisible
    if (!isVisible) {
      window.setCoupleFallbackMessage('Mode couple activable depuis les paramètres pour partager le budget du foyer.')
    }
    return isVisible
  } catch (error) {
    console.warn('[Couple] update nav failed', error)
    return false
  }
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

    // Inject couple UI styles so partner page is styled when activated
    try {
      const styleElement = document.createElement('style')
      styleElement.id = 'nexora-couple-styles'
      styleElement.textContent = CoupleUIComponent.getCoupleCSS()
      document.head.appendChild(styleElement)
    } catch (err) {
      console.warn('⚠️ Couple UI styles injection failed', err)
    }

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
    await updateCoupleNavigation()
    AuthContext.subscribe(() => {
      if (typeof window.updateCoupleNavigation === 'function') {
        window.updateCoupleNavigation().catch((err) => {
          console.warn('[Couple] update navigation failed', err)
        })
      }
    })

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

    if (typeof renderPlanHub === 'function' && document.getElementById('plan-root')) {
      await renderPlanHub('plan-root')
      window.refreshPlanHub = async () => renderPlanHub('plan-root')
    }

    if (typeof renderSettingsPanels === 'function') {
      await renderSettingsPanels()
    }

    if (typeof window.updateCoupleNavigation === 'function') {
      await window.updateCoupleNavigation()
    }

    if (typeof window.renderCoupleSection === 'function') {
      await window.renderCoupleSection()
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

    // Render treasury timeline if container exists (lightweight)
    try {
      if (typeof renderTreasuryTimeline === 'function' && document.getElementById('treasury-timeline-root')) {
        // Minimal example: build a 14-day timeline from sample data (real app will pass real data)
        const sampleRevenues = [{ amount: 1700, frequency: 'monthly', day: 5 }]
        const sampleCharges = [{ amount: 65, date: '2026-05-29', title: 'Internet', priority: 'importante' }, { amount: 850, date: 2, title: 'Loyer', priority: 'critique' }]
        const TreasuryService = (await import('./treasury/treasuryService.js')).default
        const { timeline } = TreasuryService.buildTimeline({ baseBalance: 2085, revenues: sampleRevenues, charges: sampleCharges, fromDate: new Date('2026-05-28'), days: 14 })
        renderTreasuryTimeline('treasury-timeline-root', timeline)
      }
      // Render Dashboard Master component if present
      if (typeof renderDashboardMaster === 'function' && document.getElementById('dashboard-master-root')) {
        const TreasuryService = (await import('./treasury/treasuryService.js')).default
        renderDashboardMaster('dashboard-master-root', TreasuryService)
      }
      // Render Advisor UI if present in dashboard
      if (typeof renderAdvisorUI === 'function' && document.getElementById('advisor-root')) {
        const AdvisorService = (await import('./advisor/advisorService.js')).default
        renderAdvisorUI('advisor-root', AdvisorService)
      }
      // Render Nexora page advisor if present
      if (typeof renderAdvisorUI === 'function' && document.getElementById('nexora-page-root')) {
        const AdvisorService = (await import('./advisor/advisorService.js')).default
        renderAdvisorUI('nexora-page-root', AdvisorService)
      }
    } catch (err) {
      console.warn('[Treasury] render failed', err)
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
