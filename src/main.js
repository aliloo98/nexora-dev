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
import { CoupleService } from './couple/coupleService.js'
import { renderTreasuryTimeline } from './components/TreasuryTimeline.js'
import './styles/design-system.css'
import { renderDashboardMaster } from './components/DashboardMaster.js'
import CoupleOverlay from './couple/coupleOverlay.js'
import { renderTreasuryPlanner } from './components/TreasuryPlannerUI.js'
import { renderSettingsPanels, renderRecurringIncomeSettings, renderBillScheduleSettings } from './settings/SettingsUI.js'
import { readAiSettings, updateAiSettings } from './advisor/proactiveCoachService.js'
import { buildJudgmentEngine } from './assistant/judgmentEngine.js'
import NexoraMotion from './ui/gsapMotion.js'
import { parseFinancialExpression } from './finance/financialExpression.js'
import { computeCycleBalances, computeCycleBalancesFromMetrics } from './finance/cycleBalance.js'
import NexoraRecurringResolver from './finance/recurringResolution.js'
import NexoraCore from './ui/nexoraCore.js'
import { toggleAvailableMoneyOptions } from './ui/availableMoneyOptions.js'
import { buildDashboardGuidance } from './ui/dashboardGuidance.js'
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

// Expose modules globally for HTML event handlers and old code
window.StorageManager = StorageManager
window.Utils = Utils
window.ConfettiEngine = ConfettiEngine
window.ThemeManager = ThemeManager
window.LogoManager = LogoManager
window.NexoraPdfExport = NexoraPdfExport
window.NotificationsService = NotificationsService
window.NexoraAiSettingsService = { readAiSettings, updateAiSettings }
window.NexoraMotion = NexoraMotion
window.NexoraRecurringResolver = NexoraRecurringResolver
window.NexoraCore = NexoraCore
window.NexoraSections = NexoraSections
window.toggleAvailableMoneyOptions = toggleAvailableMoneyOptions
window.NexoraDashboardGuidance = { buildDashboardGuidance }
window.renderBudgetCoach = renderBudgetCoach
window.buildBudgetCoachState = buildBudgetCoachState
window.buildJudgmentEngine = buildJudgmentEngine
window.NexoraBuild = { version: APP_VERSION, label: formatBuildLabel }
window.getUserDisplayName = (user) => getUserDisplayName(user || AuthContext.getCurrentUser())
window.NexoraSyncDiagnostics = SyncDiagnostics
window.readSyncedArray = readSyncedArray
window.parseFinancialExpression = parseFinancialExpression
window.NexoraCycleBalance = { computeCycleBalances, computeCycleBalancesFromMetrics }
window.renderRecurringIncomeSettings = renderRecurringIncomeSettings
window.renderBillScheduleSettings = renderBillScheduleSettings

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
window.CoupleService = CoupleService
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

const readCurrentBudgetForCouple = () => {
  const read = (key) => parseFinancialExpression(document.querySelector(`[data-key="${key}"]`)?.value || 0, { fallback: 0 })
  const income = ['rev_ali', 'rev_megane', 'rev_excep'].reduce((sum, key) => sum + read(key), 0)
  const fixed = ['loyer', 'credit', 'assauto', 'gasoil', 'elec', 'eau', 'psy', 'diete', 'itou', 'sante', 'impots', 'box', 'tel_ali', 'tel_meg', 'stream', 'ps', 'cb', 'impfix']
    .reduce((sum, key) => sum + read(key), 0)
  const variable = ['courses', 'tabac', 'sport', 'ongles', 'cadeaux', 'impvar']
    .reduce((sum, key) => sum + read(key), 0)
  return { income, fixed, variable, expenses: fixed + variable, remaining: income - fixed - variable }
}

const createShareToggle = (type, id, label) => {
  const checked = CoupleService.isLocalItemShared(type, id)
  return `
    <label class="couple-share-toggle">
      <span>${escapeHtml(label)}</span>
      <select data-share-type="${escapeHtml(type)}" data-share-id="${escapeHtml(id)}">
        <option value="private" ${checked ? '' : 'selected'}>Privé</option>
        <option value="shared" ${checked ? 'selected' : ''}>Partagé</option>
      </select>
    </label>
  `
}

window.renderCoupleSection = async () => {
  const section = document.getElementById('section-couple')
  if (!section) return

  const household = CoupleService.getLocalHousehold()
  if (!household?.status || household.status !== 'active') {
    section.innerHTML = `
      <div class="budget-block">
        <div class="budget-block-header">
          <span class="budget-block-title">❤️ Couple</span>
          <span style="font-size:12px;color:var(--text2)">Inactif</span>
        </div>
        <div class="couple-empty-state">
          <strong>Aucun foyer actif</strong>
          <p>Active le mode couple dans les paramètres pour afficher l’espace foyer.</p>
          <button class="btn btn-gold" type="button" onclick="showSection('parametres')">Ouvrir les paramètres</button>
        </div>
      </div>
    `
    return
  }

  const budget = readCurrentBudgetForCouple()
  const goals = filterUserFacingRecords(await GoalsService.listGoals().catch(() => []), (goal) => goal?.name)
  const debts = await readSyncedArray(STORAGE_KEYS.debts, [])
  const sharedGoals = goals.filter((goal) => CoupleService.isLocalItemShared('goal', goal.id))
  const sharedDebts = debts.filter((debt, index) => CoupleService.isLocalItemShared('debt', debt.id || index))

  section.style.display = 'block'
  section.innerHTML = `
    <div class="couple-page">
      <div class="budget-block-header">
        <span class="budget-block-title">❤️ Couple</span>
        <span style="font-size:12px;color:var(--text2)">Couche collaborative locale</span>
      </div>
      <section class="couple-hero-card">
        <div>
          <span>Foyer</span>
          <h2>${escapeHtml(household.name || 'Foyer Nexora')}</h2>
          <p>Utilisateur actuel : ${escapeHtml(household.currentUser || 'Moi')} · Partenaire : ${escapeHtml(household.partnerName || household.partnerEmail || 'invitation en attente')}</p>
        </div>
        <div class="couple-code-box">${escapeHtml(household.invitationCode || '—')}</div>
      </section>

      <section class="couple-grid">
        <div class="couple-card">
          <span>Revenus communs</span>
          <strong>${formatEuro(budget.income)}</strong>
          <em>Utilisateur / foyer selon les revenus saisis</em>
        </div>
        <div class="couple-card">
          <span>Charges communes</span>
          <strong>${formatEuro(budget.expenses)}</strong>
          <em>Charges fixes + variables du mois</em>
        </div>
        <div class="couple-card">
          <span>Solde actuel commun</span>
          <strong class="${budget.remaining >= 0 ? 'positive' : 'negative'}">${formatEuro(budget.remaining)}</strong>
          <em>Vue foyer, sans fusion cloud</em>
        </div>
      </section>

      <section class="couple-card wide">
        <div class="couple-section-head">
          <div>
            <span>Objectifs communs</span>
            <strong>${sharedGoals.length ? `${sharedGoals.length} partagé(s)` : 'Aucun objectif partagé'}</strong>
          </div>
          <em class="share-badge">Partage explicite</em>
        </div>
        <div class="couple-list">
          ${goals.length ? goals.map((goal) => {
            const current = Number(goal.current) || 0
            const target = Number(goal.target) || 0
            const pct = target > 0 ? Math.min(100, Math.round(current / target * 100)) : 0
            return `<div class="couple-list-row">
              <div><strong>${escapeHtml(goal.icon || '🎯')} ${escapeHtml(goal.name || 'Objectif')}</strong><span>${formatEuro(current)} / ${formatEuro(target)} · ${pct}%</span></div>
              ${createShareToggle('goal', goal.id, CoupleService.isLocalItemShared('goal', goal.id) ? 'Partagé' : 'Privé')}
            </div>`
          }).join('') : '<div class="empty-state">Aucun objectif à partager.</div>'}
        </div>
      </section>

      <section class="couple-card wide">
        <div class="couple-section-head">
          <div>
            <span>Dettes communes</span>
            <strong>${sharedDebts.length ? `${sharedDebts.length} partagée(s)` : 'Aucune dette partagée'}</strong>
          </div>
          <em class="share-badge">Privé par défaut</em>
        </div>
        <div class="couple-list">
          ${debts.length ? debts.map((debt, index) => {
            const id = debt.id || index
            return `<div class="couple-list-row">
              <div><strong>💳 ${escapeHtml(debt.name || 'Dette')}</strong><span>${formatEuro(debt.remaining)} restants · ${formatEuro(debt.monthly)}/mois</span></div>
              ${createShareToggle('debt', id, CoupleService.isLocalItemShared('debt', id) ? 'Partagée' : 'Privée')}
            </div>`
          }).join('') : '<div class="empty-state">Aucune dette à partager.</div>'}
        </div>
      </section>

      <section class="couple-card wide">
        <div class="couple-section-head">
          <div>
            <span>Partage budget</span>
            <strong>Revenus et charges</strong>
          </div>
          <em class="share-badge">Local</em>
        </div>
        <div class="couple-list">
          ${createShareToggle('income', 'rev_ali', 'Revenu utilisateur')}
          ${createShareToggle('income', 'rev_megane', 'Revenu foyer')}
          ${createShareToggle('charge', 'loyer', 'Loyer')}
          ${createShareToggle('charge', 'courses', 'Courses')}
        </div>
      </section>
    </div>
  `

  section.querySelectorAll('[data-share-type][data-share-id]').forEach((input) => {
    input.addEventListener('change', async (event) => {
      CoupleService.toggleLocalShare(event.target.dataset.shareType, event.target.dataset.shareId, event.target.value === 'shared')
      window.showToast?.(event.target.value === 'shared' ? 'Élément partagé' : 'Élément privé')
      await window.renderCoupleSection()
    })
  })
}

window.updateCoupleNavigation = async () => {
  try {
    const coupleNav = document.querySelector('.sidebar .nav-btn[data-section="couple"]')
    const isVisible = CoupleService.getLocalHousehold()?.status === 'active'

    if (coupleNav) {
      coupleNav.style.display = isVisible ? 'inline-flex' : 'none'
    }

    window.__isCoupleTabVisible = isVisible
    if (!isVisible) {
      window.setCoupleFallbackMessage('Active le mode couple pour afficher l’onglet Couple.')
    } else {
      const banner = document.getElementById('couple-fallback-message')
      if (banner) banner.style.display = 'none'
      await window.renderCoupleSection()
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

    // Initialize authentication routing (handles login/register/dashboard)
    await initAuthRouting()
    const authenticatedState = await waitForAuthenticatedState()

    // User-scoped services must never hydrate before the owner is known.
    await NotificationsService.init()
    await MonthlyBudgetStateService.init()

    // Keep the connection check for early failure visibility without blocking offline usage.
    if (navigator.onLine !== false) {
      await testSupabaseConnection()
    } else {
      console.info('📴 Supabase connection check skipped while offline')
    }

    await initializeLegacyUiForAuthState(authenticatedState)
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

    if (typeof renderSettingsPanels === 'function') {
      await renderSettingsPanels()
    }
    renderAboutPanel('nexora-about-panel')
    injectNexoraStatusBar()

    window.NexoraMotion?.bindButtonFeedback?.(document)
    window.NexoraMotion?.animateNavigation?.(document.querySelector('.sidebar .nav-btn.active'))
    const runScrollReveal = () => window.NexoraMotion?.initScrollReveal?.(document)
    if (typeof requestIdleCallback === 'function') requestIdleCallback(runScrollReveal, { timeout: 2400 })
    else setTimeout(runScrollReveal, 400)

    if (typeof window.updateCoupleNavigation === 'function') {
      await window.updateCoupleNavigation()
    }

    if (typeof window.renderCoupleSection === 'function') {
      await window.renderCoupleSection()
    }

    // Sync user app settings from cloud/local where applicable
    if (typeof UserAppSettingsService !== 'undefined' && UserAppSettingsService && typeof UserAppSettingsService.syncAllAppSettings === 'function') {
      try {
        const syncResults = await UserAppSettingsService.syncAllAppSettings()
        recordLastSync({ action: 'bootstrap', keys: Object.keys(syncResults || {}) })
        SyncDiagnostics.logSyncEvent('bootstrap', 'syncAllAppSettings', { ok: true, keys: Object.keys(syncResults || {}) })
        refreshAboutPanel()
        refreshNexoraStatusBar()
      } catch (e) {
        console.warn('⚠️ User app settings sync failed', e)
        SyncDiagnostics.logSyncEvent('bootstrap', 'syncAllAppSettings', { ok: false, error: e?.message })
      }
    }

    // Attach amount input handlers to sanitize user input (prevent letters, support French formats)
    const attachAmountInputHandlers = () => {
        const sanitize = (v) => String(v ?? '')
          .replace(/\u202F/g, ' ')
          .replace(/\u00A0/g, ' ')
          .replace(/\,+/g, ',')
          .trim()

        const isAmountInput = (input) => {
          if (!input || input.classList.contains('note-input')) return false
          if (input.type === 'date' || input.type === 'color') return false
          if (input.dataset?.key) return true
          if (input.type === 'number') return true
          if (input.classList.contains('plan-goal-input')) return true
          if (input.classList.contains('plan-debt-input')) return true
          if (input.classList.contains('plan-debt-payment')) return true
          if (input.classList.contains('recurring-income-input') && input.dataset?.key === 'amount') return true
          if (input.classList.contains('bill-schedule-input') && input.dataset?.key === 'amount') return true
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

          input.addEventListener('focus', () => {
            const raw = sanitize(input.value)
            if (raw && parseFinancialExpression(raw, { fallback: null }) !== null) {
              input.dataset.lastValidValue = input.value
            }
          })

          input.addEventListener('input', () => {
            const raw = sanitize(input.value)
            const parsed = parseFinancialExpression(raw, { fallback: null })
            if (raw && parsed === null) {
              input.classList.add('input-error')
            } else {
              input.classList.remove('input-error')
            }
          })

          input.addEventListener('paste', (e) => {
            e.preventDefault()
            const text = (e.clipboardData || window.clipboardData).getData('text') || ''
            const cleaned = sanitize(text)
            document.execCommand('insertText', false, cleaned)
          })

          input.addEventListener('blur', () => {
            const raw = sanitize(input.value)
            if (!raw) {
              input.classList.remove('input-error')
              return
            }
            const numeric = parseFinancialExpression(raw, { fallback: null })
            if (numeric === null) {
              input.classList.add('input-error')
              window.showToast?.('Expression financière invalide : rien n’a été enregistré')
              if (Object.prototype.hasOwnProperty.call(input.dataset, 'lastValidValue')) {
                input.value = input.dataset.lastValidValue
              }
              return
            }
            input.classList.remove('input-error')
            const formatted = typeof window.Utils?.formatCurrency === 'function'
              ? window.Utils.formatCurrency(numeric)
              : String(numeric)
            input.value = formatted
            input.dataset.lastValidValue = formatted
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
        window.NexoraMotion?.animateTimeline?.(document.getElementById('treasury-timeline-root'))
      }
      // Render Dashboard Master component if present
      if (
        typeof renderDashboardMaster === 'function'
        && document.getElementById('dashboard-master-root')
        && !document.querySelector('#dashboard-master-root .dashboard-coach-content')
      ) {
        await window.refreshDashboardCoach()
      }
      if (document.getElementById('advisor-root')) {
        const { renderAdvisorUI } = await import('./advisor/AdvisorUI.js')
        const AdvisorService = (await import('./advisor/advisorService.js')).default
        renderAdvisorUI('advisor-root', AdvisorService)
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
