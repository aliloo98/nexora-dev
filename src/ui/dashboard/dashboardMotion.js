const reducedMotionQuery = '(prefers-reduced-motion: reduce)'

// Nouveaux sélecteurs Cockpit Premium
const cockpitEntrySelectors = [
  '.cockpit-hero-v4',
  '#dashboard-coach-card',
  '#week-plan-card',
  '#dashboard-understanding-card',
  '.cockpit-complete-zone'
]

// Anciens sélecteurs Dashboard (fallback)
const legacyEntrySelectors = [
  '.dashboard-clean-header',
  '.dashboard-hero',
  '.dashboard-primary-kpis',
  '.dashboard-lower-grid',
  '.dashboard-final-grid'
]

const activeAnimations = new Set()
const progressValues = new Map()
let reducedMotionListenerBound = false

// Fonction de compatibilité : détecte si le cockpit premium est présent
const isCockpitPremium = (dashboard) => {
  return dashboard?.querySelector('.cockpit-hero-v4') !== null
}

// Sélecteurs adaptatifs selon la version du dashboard
const getEntrySelectors = (dashboard) => {
  return isCockpitPremium(dashboard) ? cockpitEntrySelectors : legacyEntrySelectors
}

// Delays adaptatifs selon la version du dashboard
const getEntryDelay = (dashboard, index) => {
  // Cockpit premium a 5 éléments, delays ajustés pour rester sous 120ms max
  return isCockpitPremium(dashboard) ? index * 20 : index * 28
}

const getModeSwitchSelectors = (dashboard, isSimpleMode) => {
  if (isCockpitPremium(dashboard)) {
    return isSimpleMode
      ? ['.cockpit-cta']
      : ['.cockpit-zone--coach', '.cockpit-zone--assistant', '.cockpit-lateral-grid', '.cockpit-kpis']
  }
  // Fallback legacy
  return isSimpleMode
    ? ['.simple-dashboard-grid']
    : ['.dashboard-primary-kpis', '.dashboard-lower-grid', '.dashboard-final-grid']
}

const prefersReducedMotion = () => {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return true
  return window.matchMedia(reducedMotionQuery).matches
}

const scheduleAnimationFrame = (callback) => {
  if (typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function') {
    return window.requestAnimationFrame(callback)
  }
  callback()
  return 0
}

const resolveDashboard = (container) => {
  if (!container) return null
  if (container.id === 'section-dashboard') return container
  return container.closest?.('#section-dashboard') || null
}

const cancelActiveAnimations = () => {
  activeAnimations.forEach((animation) => animation.cancel())
  activeAnimations.clear()
}

const bindReducedMotionListener = () => {
  if (reducedMotionListenerBound || typeof window === 'undefined' || typeof window.matchMedia !== 'function') return
  reducedMotionListenerBound = true
  window.matchMedia(reducedMotionQuery).addEventListener?.('change', (event) => {
    if (event.matches) cancelActiveAnimations()
  })
}

const runAnimation = (element, keyframes, options) => {
  if (!element?.animate || prefersReducedMotion()) return null
  bindReducedMotionListener()
  const animation = element.animate(keyframes, {
    duration: 160,
    easing: 'cubic-bezier(0.2, 0, 0, 1)',
    fill: 'none',
    ...options
  })
  activeAnimations.add(animation)
  animation.finished
    .catch(() => {})
    .finally(() => activeAnimations.delete(animation))
  return animation
}

const isRendered = (element) => Boolean(element && element.getClientRects().length)

export function animateDashboardEnter(container) {
  const dashboard = resolveDashboard(container)
  if (!dashboard) return

  if (prefersReducedMotion()) {
    dashboard.dataset.dashboardMotionState = 'reduced'
    dashboard.dataset.dashboardMotionEntered = 'true'
    return
  }

  if (dashboard.dataset.dashboardMotionEntered === 'true') {
    return
  }

  dashboard.dataset.dashboardMotionEntered = 'true'
  dashboard.dataset.dashboardMotionState = 'scheduled'
  scheduleAnimationFrame(() => {
    if (!dashboard.isConnected || dashboard.dataset.dashboardMotionState !== 'scheduled') return
    if (prefersReducedMotion()) {
      dashboard.dataset.dashboardMotionState = 'reduced'
      return
    }

    dashboard.dataset.dashboardMotionState = 'entering'
    const selectors = getEntrySelectors(dashboard)
    const targets = selectors
      .map((selector) => dashboard.querySelector(selector))
      .filter(isRendered)
    const animations = targets
      .map((element, index) => runAnimation(element, [
        { opacity: 0.72, transform: 'translate3d(0, 6px, 0)' },
        { opacity: 1, transform: 'translate3d(0, 0, 0)' }
      ], {
        delay: getEntryDelay(dashboard, index),
        duration: 220
      }))
      .filter(Boolean)

    if (!animations.length) {
      dashboard.dataset.dashboardMotionState = 'ready'
      return
    }

    Promise.allSettled(animations.map((animation) => animation.finished))
      .then(() => {
        if (dashboard.isConnected && dashboard.dataset.dashboardMotionState === 'entering') {
          dashboard.dataset.dashboardMotionState = 'ready'
        }
      })
  })
}

export function animateDashboardModeSwitch(container) {
  const dashboard = resolveDashboard(container)
  if (!dashboard || dashboard.dataset.dashboardMotionState !== 'ready' || prefersReducedMotion()) return
  const isSimpleMode = document.body.classList.contains('mode-simple')
  const selectors = getModeSwitchSelectors(dashboard, isSimpleMode)

  selectors
    .map((selector) => dashboard.querySelector(selector))
    .filter(isRendered)
    .forEach((element, index) => {
      runAnimation(element, [
        { opacity: 0.84, transform: 'translate3d(0, 4px, 0)' },
        { opacity: 1, transform: 'translate3d(0, 0, 0)' }
      ], {
        delay: index * 16,
        duration: 160
      })
    })
}

const getProgressKey = (progress) => {
  const host = progress.closest('[id]')
  return host?.id || progress.getAttribute('aria-label') || null
}

export function transitionDashboardProgress(container) {
  const dashboard = resolveDashboard(container)
  if (!dashboard) return

  const scope = container?.querySelectorAll ? container : dashboard
  scope.querySelectorAll('progress').forEach((progress) => {
    const key = getProgressKey(progress)
    if (!key) return
    const finalValue = Number(progress.value)
    const previousValue = progressValues.get(key)
    progressValues.set(key, finalValue)

    if (prefersReducedMotion() || previousValue === undefined || previousValue === finalValue) return
    progress.value = previousValue
    requestAnimationFrame(() => {
      if (progress.isConnected) progress.value = finalValue
    })
  })
}

export function getDashboardMotionDiagnostics() {
  return {
    activeAnimations: activeAnimations.size,
    trackedProgressBars: progressValues.size,
    reducedMotion: prefersReducedMotion()
  }
}

export default {
  animateDashboardEnter,
  animateDashboardModeSwitch,
  transitionDashboardProgress,
  getDashboardMotionDiagnostics
}
