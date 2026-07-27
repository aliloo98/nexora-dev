/**
 * Application UI Bootstrap
 *
 * Handles UI rendering steps in the exact order required by the application.
 * Note: User data synchronization (steps 22-23) occurs between some of these steps
 * and is handled separately by userDataBootstrap.js.
 *
 * @param {Object} dependencies
 * @param {Object} dependencies.GoalsPage - Goals page module
 * @param {Function} dependencies.renderSettingsPanels - Function to render settings
 * @param {Function} dependencies.renderAboutPanel - Function to render about panel
 * @param {Function} dependencies.injectNexoraStatusBar - Function to inject status bar
 * @param {Function} dependencies.updateCoupleNavigation - Function to update Couple nav
 * @param {Function} dependencies.renderCoupleSection - Function to render Couple section
 * @param {Function} dependencies.renderAssistantCard - Function to render assistant card
 * @param {Function} dependencies.renderTreasuryTimeline - Function to render treasury timeline
 * @param {Function} dependencies.renderDashboardMaster - Function to render dashboard master
 * @param {Function} dependencies.refreshDashboardCoach - Function to refresh dashboard coach
 * @param {Object} dependencies.documentRef - Document reference
 */

/**
 * Steps 15-17: Render primary application UI (Goals, Settings, About)
 */
export async function renderPrimaryApplicationUi({
  GoalsPage,
  renderSettingsPanels,
  renderAboutPanel
}) {
  // Step 15: Initialize Goals premium section
  if (typeof GoalsPage !== 'undefined' && GoalsPage && typeof GoalsPage.init === 'function') {
    await GoalsPage.init()
  }

  // Step 16: Render settings panels
  if (typeof renderSettingsPanels === 'function') {
    await renderSettingsPanels()
  }

  // Step 17: Render about panel
  renderAboutPanel('nexora-about-panel')
}

/**
 * Step 18: Inject status bar
 */
export function injectStatusBar({
  injectNexoraStatusBar
}) {
  injectNexoraStatusBar()
}

/**
 * Step 19: Apply motion animations
 */
export function applyApplicationMotion({
  NexoraMotion
}) {
  NexoraMotion?.bindButtonFeedback?.(document)
  NexoraMotion?.animateNavigation?.(document.querySelector('.sidebar .nav-btn.active'))
  const runScrollReveal = () => NexoraMotion?.initScrollReveal?.(document)
  if (typeof requestIdleCallback === 'function') requestIdleCallback(runScrollReveal, { timeout: 2400 })
  else setTimeout(runScrollReveal, 400)
}

/**
 * Steps 20-21: Refresh Couple UI (navigation and section)
 */
export async function refreshCoupleUi({
  updateCoupleNavigation,
  renderCoupleSection
}) {
  // Step 20: Second Couple navigation update
  if (typeof updateCoupleNavigation === 'function') {
    await updateCoupleNavigation()
  }

  // Step 21: Render Couple section
  if (typeof renderCoupleSection === 'function') {
    await renderCoupleSection()
  }
}

/**
 * Step 24: Render Assistant card
 */
export async function renderAssistant({
  renderAssistantCard
}) {
  try {
    if (typeof renderAssistantCard === 'function') await renderAssistantCard()
  } catch (e) {
    console.warn('[Assistant] render failed', e)
  }
}

/**
 * Steps 25-27: Render advanced application UI (Treasury, Dashboard, Advisor)
 */
export async function renderAdvancedApplicationUi({
  renderTreasuryTimeline,
  renderDashboardMaster,
  refreshDashboardCoach,
  documentRef = document
}) {
  try {
    // Step 25: Render treasury timeline if container exists
    if (typeof renderTreasuryTimeline === 'function' && documentRef.getElementById('treasury-timeline-root')) {
      const sampleRevenues = [{ amount: 1700, frequency: 'monthly', day: 5 }]
      const sampleCharges = [
        { amount: 65, date: '2026-05-29', title: 'Internet', priority: 'importante' },
        { amount: 850, date: 2, title: 'Loyer', priority: 'critique' }
      ]
      const TreasuryService = (await import('../treasury/treasuryService.js')).default
      const { timeline } = TreasuryService.buildTimeline({
        baseBalance: 2085,
        revenues: sampleRevenues,
        charges: sampleCharges,
        fromDate: new Date('2026-05-28'),
        days: 14
      })
      renderTreasuryTimeline('treasury-timeline-root', timeline)
      window.NexoraMotion?.animateTimeline?.(documentRef.getElementById('treasury-timeline-root'))
    }

    // Step 26: Render Dashboard Master component if present
    if (
      typeof renderDashboardMaster === 'function'
      && documentRef.getElementById('dashboard-master-root')
      && !documentRef.querySelector('#dashboard-master-root [data-recommendation-source]')
    ) {
      await refreshDashboardCoach()
    }

    // Step 27: Render Advisor UI
    if (documentRef.getElementById('advisor-root')) {
      const { renderAdvisorUI } = await import('../advisor/AdvisorUI.js')
      const AdvisorService = (await import('../advisor/advisorService.js')).default
      renderAdvisorUI('advisor-root', AdvisorService)
    }
  } catch (err) {
    console.warn('[Treasury] render failed', err)
  }
}
