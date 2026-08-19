/**
 * Jarvis Financial Cockpit - Component
 *
 * Renders the Jarvis cockpit in Complete mode.
 * Consumes view model and generates deterministic markup.
 */

import { buildIntelligenceSnapshot } from '../intelligence/IntelligenceEngine.js'
import { buildJarvisIntelligenceInput } from './jarvisDataAdapter.js'
import { createJarvisViewModel } from './jarvisViewModel.js'
import { attachJarvisCopilot, renderJarvisCopilot } from './copilot/jarvisCopilot.js'

/**
 * One-shot viewport observer for motion reveal
 */
function setupViewportReveal(element, animationCallback, threshold = 0.25) {
  if (!element || !window.IntersectionObserver) {
    animationCallback()
    return
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        observer.unobserve(entry.target)
        animationCallback()
      }
    })
  }, { threshold, rootMargin: '0px 0px -50px 0px' })

  observer.observe(element)
  return observer
}

/**
 * Single observer instance to prevent duplicates
 */
let modeObserver = null
let observerInitialized = false
let modeEventListener = null
let modeEventDocumentRef = null
let modeRenderVersion = 0
let modeSyncScheduled = false

const UX_MODE_APPLIED_EVENT = 'nexora:ux-mode-applied'

function scheduleJarvisModeSync(documentRef, windowRef) {
  if (modeSyncScheduled) return
  modeSyncScheduled = true
  Promise.resolve().then(() => {
    modeSyncScheduled = false
    return updateJarvisOnModeChange(documentRef, windowRef)
  }).catch((error) => {
    console.warn('[Jarvis Integration] mode sync failed:', error)
  })
}

/**
 * Determines if Jarvis should be shown (Complete mode only)
 */
function shouldShowJarvis(documentRef) {
  if (!documentRef || !documentRef.body) return false
  return documentRef.body.classList.contains('mode-complete')
}

/**
 * Renders Jarvis cockpit in the dashboard
 * Entry point called from bootstrap
 */
export async function renderJarvisInDashboard(options = {}) {
  const { monthKey, documentRef = document, windowRef = window } = options
  const cockpitRoot = documentRef.getElementById('cockpit-financier-root')

  if (!cockpitRoot) {
    console.warn('[Jarvis Integration] cockpit-financier-root not found')
    return
  }

  // Jarvis only shows in Complete mode
  if (!shouldShowJarvis(documentRef)) {
    // Simplified mode - let existing system handle cockpit
    return
  }

  try {
    await renderJarvisCockpit(cockpitRoot, {
      monthKey,
      documentRef,
      windowRef
    })
  } catch (error) {
    console.error('[Jarvis Integration] Error rendering Jarvis:', error)
    // Render error fallback scoped to Complete mode
    renderErrorFallback(cockpitRoot, documentRef)
  }
}

/**
 * Updates Jarvis on mode change
 */
export async function updateJarvisOnModeChange(documentRef = document, windowRef = window) {
  const cockpitRoot = documentRef.getElementById('cockpit-financier-root')
  if (!cockpitRoot) return

  const renderVersion = ++modeRenderVersion

  if (shouldShowJarvis(documentRef)) {
    // Complete mode: render Jarvis
    cockpitRoot.innerHTML = ''
    const monthKey = typeof windowRef.getMonth === 'function' ? windowRef.getMonth() : null
    await renderJarvisCockpit(cockpitRoot, { monthKey, documentRef, windowRef })
    if (renderVersion !== modeRenderVersion && !shouldShowJarvis(documentRef)) {
      cockpitRoot.innerHTML = ''
    }
  } else {
    // Simplified mode: clear Jarvis and let existing system restore Hero
    cockpitRoot.innerHTML = ''
    // Trigger the existing dashboard update to restore Simple Hero
    if (typeof windowRef.updateAll === 'function') {
      windowRef.updateAll()
    }
  }
}

/**
 * Refreshes Jarvis data
 */
export async function refreshJarvisData(monthKey, documentRef = document, windowRef = window) {
  if (!shouldShowJarvis(documentRef)) return

  const cockpitRoot = documentRef.getElementById('cockpit-financier-root')
  if (!cockpitRoot) return

  try {
    await updateJarvisCockpit(cockpitRoot, { monthKey, documentRef, windowRef })
  } catch (error) {
    console.error('[Jarvis Integration] Error refreshing Jarvis:', error)
    renderErrorFallback(cockpitRoot, documentRef)
  }
}

/**
 * Initializes Jarvis dashboard integration with proper lifecycle
 */
export function initJarvisDashboardIntegration(options = {}) {
  const { windowRef = window, documentRef = windowRef.document } = options
  if (observerInitialized) {
    // Already initialized - skip
    return
  }

  if (!documentRef || !documentRef.body) {
    return
  }

  const observerCtor = windowRef.MutationObserver || globalThis.MutationObserver
  if (typeof observerCtor === 'function') {
    // Create single observer as a safety net for class changes outside setNexoraUxMode.
    modeObserver = new observerCtor((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
          const target = mutation.target
          if (target.classList.contains('mode-simple') || target.classList.contains('mode-complete')) {
            scheduleJarvisModeSync(documentRef, windowRef)
          }
        }
      }
    })

    modeObserver.observe(documentRef.body, { attributes: true, attributeFilter: ['class'] })
  }

  modeEventListener = () => {
    scheduleJarvisModeSync(documentRef, windowRef)
  }
  modeEventDocumentRef = documentRef
  documentRef.addEventListener?.(UX_MODE_APPLIED_EVENT, modeEventListener)
  observerInitialized = true

  // Initial render if already in Complete mode
  if (shouldShowJarvis(documentRef)) {
    const monthKey = typeof windowRef.getMonth === 'function' ? windowRef.getMonth() : null
    renderJarvisInDashboard({ monthKey, documentRef, windowRef })
  }
}

/**
 * Main render function for Jarvis cockpit
 */
export async function renderJarvisCockpit(container, options = {}) {
  const { monthKey, documentRef = document, windowRef = window } = options

  if (!container) {
    console.warn('[Jarvis Cockpit] No container provided')
    return
  }

  try {
    // 1. Build intelligence input from domain state
    const intelligenceInput = await buildJarvisIntelligenceInput(monthKey)

    // 2. Generate J4 snapshot
    const snapshot = buildIntelligenceSnapshot(intelligenceInput, {
      referenceDate: new Date()
    })

    // 3. Create Jarvis view model
    const viewModel = createJarvisViewModel(snapshot)

    // 4. Check if core data is sufficient (Blocker 1 fix)
    // Separate core data availability from trend/history availability
    const coreDataAvailable = viewModel.capabilities.core
    const trendsAvailable = viewModel.capabilities.trends

    // If core data is missing, show data quality mode
    if (!coreDataAvailable) {
      container.innerHTML = renderDataQualityMode(viewModel, snapshot)
      attachJarvisCopilot(container, {
        initialSnapshot: snapshot,
        documentRef,
        windowRef,
        getSnapshot: async () => {
          const activeMonthKey = typeof windowRef.getMonth === 'function'
            ? windowRef.getMonth()
            : monthKey
          const nextInput = await buildJarvisIntelligenceInput(activeMonthKey)
          return buildIntelligenceSnapshot(nextInput, {
            referenceDate: new Date()
          })
        }
      })
      return
    }

    // If core data is available but trends are missing, render full cockpit with trend message
    // This is the critical fix for Blocker 1
    const cockpitMarkup = `
      <div class="jarvis-cockpit" data-dashboard-mode="complete">
        ${renderJarvisHero(viewModel)}
        ${renderJarvisCopilot(snapshot)}
        ${renderPriorityCard(viewModel)}
        ${renderTrajectoryPanel(viewModel)}
        ${renderSignalsSection(viewModel)}
        ${renderGoalModule(viewModel)}
      </div>
    `

    container.innerHTML = cockpitMarkup

    // Attach CTA listeners
    attachCtaListeners(container, windowRef)
    attachJarvisCopilot(container, {
      initialSnapshot: snapshot,
      documentRef,
      windowRef,
      getSnapshot: async () => {
        const activeMonthKey = typeof windowRef.getMonth === 'function'
          ? windowRef.getMonth()
          : monthKey
        const nextInput = await buildJarvisIntelligenceInput(activeMonthKey)
        return buildIntelligenceSnapshot(nextInput, {
          referenceDate: new Date()
        })
      }
    })

    // Trigger viewport-based staggered entry animation
    const cockpit = container.querySelector('.jarvis-cockpit')
    const isReducedMotion = typeof windowRef?.matchMedia === 'function' &&
      windowRef.matchMedia('(prefers-reduced-motion: reduce)').matches

    if (cockpit) {
      cockpit.dataset.motion = 'pending'

      // Staggered reveal of key Jarvis surfaces
      const surfaces = [
        '.jarvis-hero',
        '.jarvis-copilot-identity',
        '.jarvis-priority-card',
        '.jarvis-trajectory-panel',
        '.jarvis-signals-section',
        '.jarvis-goal-module'
      ]

      const revealStagger = (index) => {
        if (index >= surfaces.length) {
          cockpit.dataset.motion = 'complete'
          return
        }

        const selector = surfaces[index]
        const element = container.querySelector(selector)
        if (element) {
          element.dataset.motionState = 'running'
          element.style.transition = 'opacity 300ms ease-out, transform 300ms cubic-bezier(0.16, 1, 0.3, 1)'
          element.style.opacity = '1'
          element.style.transform = 'translateY(0) scale(1)'
          setTimeout(() => {
            element.dataset.motionState = 'complete'
            revealStagger(index + 1)
          }, 300)
        } else {
          revealStagger(index + 1)
        }
      }

      // Set initial state for staggered reveal
      surfaces.forEach(selector => {
        const element = container.querySelector(selector)
        if (element) {
          element.dataset.motionState = 'pending'
          element.style.opacity = '0'
          element.style.transform = 'translateY(8px) scale(0.995)'
          element.style.transition = 'none'
        }
      })

      if (isReducedMotion) {
        // Reduced motion: show all immediately
        cockpit.dataset.motion = 'complete'
        surfaces.forEach(selector => {
          const element = container.querySelector(selector)
          if (element) {
            element.dataset.motionState = 'complete'
            element.style.opacity = '1'
            element.style.transform = 'translateY(0) scale(1)'
          }
        })

        const bar = cockpit.querySelector('.jarvis-goal-progress-bar')
        if (bar && bar.dataset.targetWidth) {
          bar.dataset.motionState = 'complete'
          bar.style.width = bar.dataset.targetWidth
        }
      } else {
        // Trigger reveal when cockpit enters viewport
        setupViewportReveal(cockpit, () => {
          cockpit.dataset.motion = 'running'
          revealStagger(0)

          // Goal progress fill when cockpit enters viewport
          const bar = cockpit.querySelector('.jarvis-goal-progress-bar')
          if (bar && bar.dataset.targetWidth) {
            bar.dataset.motionState = 'running'
            bar.style.transition = 'width 800ms cubic-bezier(0.16, 1, 0.3, 1)'
            bar.style.width = bar.dataset.targetWidth
            setTimeout(() => {
              bar.dataset.motionState = 'complete'
            }, 850)
          }
        })
      }
    }

  } catch (error) {
    console.error('[Jarvis Cockpit] Error rendering cockpit:', error)
    renderErrorFallback(container, documentRef)
  }
}

/**
 * Updates existing Jarvis cockpit
 */
export async function updateJarvisCockpit(container, options = {}) {
  await renderJarvisCockpit(container, options)
}

/**
 * Renders error fallback scoped to Complete mode
 */
function renderErrorFallback(container, documentRef) {
  if (!shouldShowJarvis(documentRef)) {
    // Not in Complete mode - don't render anything
    container.innerHTML = ''
    return
  }

  container.innerHTML = `
    <div class="jarvis-cockpit" data-dashboard-mode="complete">
      <div class="jarvis-data-quality-mode">
        <p class="jarvis-data-quality-message">Impossible d'afficher l'analyse pour le moment.</p>
      </div>
    </div>
  `
}

/**
 * Renders data quality mode
 */
function renderDataQualityMode(viewModel, snapshot) {
  const { dataQuality, headline } = viewModel

  const issuesMarkup = dataQuality.issues.map(issue => `
    <div class="jarvis-data-quality-issue">
      ${escapeHtml(issue.label)}
    </div>
  `).join('')

  return `
    <div class="jarvis-cockpit" data-dashboard-mode="complete" data-motion="entry">
      <div class="jarvis-data-quality-mode">
        <p class="jarvis-data-quality-message">${escapeHtml(headline)}</p>
        <div class="jarvis-data-quality-issues">
          ${issuesMarkup}
        </div>
      </div>
      ${renderJarvisCopilot(snapshot)}
    </div>
  `
}

/**
 * Renders Jarvis hero
 */
function renderJarvisHero(viewModel) {
  const { visualState, statusLabel, headline } = viewModel

  return `
    <div class="jarvis-hero" data-state="${visualState}">
      <div class="jarvis-status-badge">${escapeHtml(statusLabel)}</div>
      <h2 class="jarvis-headline">${escapeHtml(headline)}</h2>
      <div class="jarvis-visual-anchor" aria-hidden="true">
        <span class="jarvis-core-signal" data-state="idle">
          <span class="jarvis-core-ring jarvis-core-outer"></span>
          <span class="jarvis-core-ring jarvis-core-arc"></span>
          <span class="jarvis-core-ring jarvis-core-inner"></span>
          <span class="jarvis-core-center"></span>
        </span>
      </div>
    </div>
  `
}

/**
 * Renders priority card
 */
function renderPriorityCard(viewModel) {
  const { priority, priorityCta } = viewModel

  if (!priority) {
    return `
      <div class="jarvis-priority-card">
        <div class="jarvis-priority-header">
          <span class="jarvis-priority-label">Priorité</span>
        </div>
        <p class="jarvis-priority-action">Aucune priorité détectée</p>
      </div>
    `
  }

  const ctaMarkup = priorityCta 
    ? `<button type="button" class="jarvis-priority-cta" data-target="${priorityCta.target}">${escapeHtml(priorityCta.label)}</button>`
    : ''

  return `
    <div class="jarvis-priority-card">
      <div class="jarvis-priority-header">
        <span class="jarvis-priority-label">Priorité</span>
        <span class="jarvis-priority-label jarvis-priority-rank">#${priority.rank}</span>
      </div>
      <p class="jarvis-priority-action">${escapeHtml(priority.label)}</p>
      ${ctaMarkup}
    </div>
  `
}

/**
 * Renders trajectory panel
 */
function renderTrajectoryPanel(viewModel) {
  const { trajectory } = viewModel

  const finalBalance = trajectory.finalBalance || 0
  const lowestBalance = trajectory.lowestBalance || 0
  const isPositive = trajectory.cashflowPositive

  // If trends are unavailable, show message instead of hiding entire panel
  const trendsMarkup = trajectory.trendsAvailable ? `
    <div class="jarvis-metric-card">
      <span class="jarvis-metric-label">Tendance revenus</span>
      <div class="jarvis-trend-indicator" data-trend="${trajectory.incomeTrend}">
        ${trajectory.incomeTrend === 'up' ? '↗' : trajectory.incomeTrend === 'down' ? '↘' : '→'}
        <span>${getTrendLabel(trajectory.incomeTrend)}</span>
      </div>
    </div>
  ` : `
    <div class="jarvis-metric-card">
      <span class="jarvis-metric-label">Tendance revenus</span>
      <span class="jarvis-metric-value">Pas assez d'historique</span>
    </div>
  `

  return `
    <div class="jarvis-trajectory-panel">
      <div class="jarvis-metric-card">
        <span class="jarvis-metric-label">Solde projeté fin de mois</span>
        <span class="jarvis-metric-value" data-positive="${isPositive}">${formatCurrency(finalBalance)}</span>
      </div>
      <div class="jarvis-metric-card">
        <span class="jarvis-metric-label">Point le plus bas</span>
        <span class="jarvis-metric-value" data-positive="${lowestBalance >= 0}">${formatCurrency(lowestBalance)}</span>
      </div>
      ${trendsMarkup}
    </div>
  `
}

/**
 * Renders signals section (risks and opportunities)
 */
function renderSignalsSection(viewModel) {
  const { risks, opportunities } = viewModel

  if (risks.length === 0 && opportunities.length === 0) {
    return ''
  }

  const risksMarkup = risks.slice(0, 2).map(risk => `
    <div class="jarvis-signal-card" data-severity="${risk.severity}" data-type="risk">
      <div class="jarvis-signal-indicator"></div>
      <div class="jarvis-signal-content">
        <div class="jarvis-signal-title">${escapeHtml(risk.label)}</div>
        <div class="jarvis-signal-description">${escapeHtml(risk.severityLabel)} · ${escapeHtml(risk.domain)}</div>
      </div>
    </div>
  `).join('')

  const opportunitiesMarkup = opportunities.slice(0, 2).map(opp => `
    <div class="jarvis-signal-card" data-type="opportunity">
      <div class="jarvis-signal-indicator"></div>
      <div class="jarvis-signal-content">
        <div class="jarvis-signal-title">${escapeHtml(opp.title)}</div>
        <div class="jarvis-signal-description">${escapeHtml(opp.description || '')}</div>
      </div>
    </div>
  `).join('')

  return `
    <div class="jarvis-signals-section">
      <div class="jarvis-signals-header">Signaux détectés</div>
      <div class="jarvis-signals-grid">
        ${risksMarkup}
        ${opportunitiesMarkup}
      </div>
    </div>
  `
}

/**
 * Renders goal module
 */
function renderGoalModule(viewModel) {
  const { goal } = viewModel

  if (!goal) {
    return ''
  }

  const progressClamped = Math.max(0, Math.min(100, goal.progress || 0))

  return `
    <div class="jarvis-goal-module">
      <div class="jarvis-goal-header">
        <span class="jarvis-goal-title">Objectif principal</span>
        <span class="jarvis-goal-stat-value">${formatPercent(progressClamped)}</span>
      </div>
      <div class="jarvis-goal-progress">
        <div class="jarvis-goal-progress-bar" style="width: 0%;" data-target-width="${progressClamped}%" data-motion-state="pending"></div>
      </div>
      <div class="jarvis-goal-stats">
        <span class="jarvis-goal-stat">Restant: <span class="jarvis-goal-stat-value">${formatCurrency(goal.remaining)}</span></span>
        ${goal.monthlyEffort ? `<span class="jarvis-goal-stat">Effort mensuel: <span class="jarvis-goal-stat-value">${formatCurrency(goal.monthlyEffort)}</span></span>` : ''}
      </div>
    </div>
  `
}

/**
 * Attaches CTA listeners
 */
function attachCtaListeners(container, windowRef) {
  const ctaButtons = container.querySelectorAll('.jarvis-priority-cta')
  
  ctaButtons.forEach(button => {
    button.addEventListener('click', (e) => {
      e.preventDefault()
      const target = button.dataset.target
      
      if (target && typeof windowRef.showSection === 'function') {
        windowRef.showSection(target)
      }
    })
  })
}

/**
 * Formats currency
 */
function formatCurrency(amount) {
  if (typeof amount !== 'number' || isNaN(amount)) return '0 €'
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount)
}

/**
 * Formats percentage
 */
function formatPercent(value) {
  if (typeof value !== 'number' || isNaN(value)) return '0%'
  return `${Math.round(value)}%`
}

/**
 * Gets trend label
 */
function getTrendLabel(trend) {
  if (trend === 'up') return 'Hausse'
  if (trend === 'down') return 'Baisse'
  if (trend === 'stable') return 'Stable'
  return 'Indisponible'
}

/**
 * Escapes HTML for security
 */
function escapeHtml(text) {
  if (typeof text !== 'string') return ''
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

/**
 * Cleanup function for testing
 */
export function cleanupJarvisIntegration() {
  if (modeObserver) {
    modeObserver.disconnect()
    modeObserver = null
  }
  if (modeEventListener && modeEventDocumentRef?.removeEventListener) {
    modeEventDocumentRef.removeEventListener(UX_MODE_APPLIED_EVENT, modeEventListener)
  }
  modeEventListener = null
  modeEventDocumentRef = null
  observerInitialized = false
}

export default {
  renderJarvisInDashboard,
  updateJarvisOnModeChange,
  refreshJarvisData,
  initJarvisDashboardIntegration,
  createJarvisViewModel,
  cleanupJarvisIntegration
}
