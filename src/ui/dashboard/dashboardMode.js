/**
 * Dashboard Mode Management
 * Controls Simplified vs Complete mode visibility
 * Browser-safe: module can be imported in Node without errors
 */

const MODE_STORAGE_KEY = 'nexora_ux_mode_v1'
const DEFAULT_MODE = 'complete'

/**
 * Get current dashboard mode from storage
 * @returns {'simple' | 'complete'}
 */
export function getNexoraUxMode() {
  if (typeof window === 'undefined') return DEFAULT_MODE
  
  // Read from SafeStorage
  if (window.SafeStorage?.getItem) {
    return window.SafeStorage.getItem(MODE_STORAGE_KEY) || DEFAULT_MODE
  }
  if (window.localStorage) {
    return window.localStorage.getItem(MODE_STORAGE_KEY) || DEFAULT_MODE
  }
  return DEFAULT_MODE
}

/**
 * Apply dashboard mode to DOM (body classes and hidden attributes)
 * @param {'simple' | 'complete'} mode
 */
export function applyDashboardMode(mode) {
  if (typeof document === 'undefined') return

  // Apply body classes for compatibility with other parts of app
  document.body.classList.remove('mode-simple', 'mode-complete')
  document.body.classList.add(`mode-${mode}`)

  // Apply hidden attribute to complete-only elements (no CSS selector debt)
  const completeElements = document.querySelectorAll('[data-dashboard-mode="complete"]')
  completeElements.forEach(el => {
    if (mode === 'simple') {
      el.hidden = true
    } else {
      el.hidden = false
    }
  })
}

/**
 * Apply mode to newly inserted elements (call after async renderers)
 * @param {Element} container - Container to apply mode to
 */
export function applyModeToNewElements(container) {
  if (typeof document === 'undefined') return

  const mode = getNexoraUxMode()
  const scope = container || document

  if (mode === 'simple') {
    const completeElements = scope.querySelectorAll('[data-dashboard-mode="complete"]')
    completeElements.forEach(el => {
      el.hidden = true
    })
  }
}

/**
 * Set dashboard mode and apply visibility
 * @param {'simple' | 'complete'} mode
 */
export function setNexoraUxMode(mode) {
  if (mode !== 'simple' && mode !== 'complete') {
    console.warn('[setNexoraUxMode] Invalid mode:', mode)
    return
  }

  if (typeof window === 'undefined') return

  // Store in SafeStorage
  if (window.SafeStorage?.setItem) {
    window.SafeStorage.setItem(MODE_STORAGE_KEY, mode)
  } else if (window.localStorage) {
    window.localStorage.setItem(MODE_STORAGE_KEY, mode)
  }

  applyDashboardMode(mode)

  // Trigger refreshes
  if (typeof window.scheduleAssistantRefresh === 'function') {
    window.scheduleAssistantRefresh()
  }
  if (typeof window.refreshDashboardCoach === 'function') {
    window.refreshDashboardCoach()
  }
  if (typeof window.updateAll === 'function') {
    window.updateAll()
  }

  // Trigger mode switch animation
  if (window.NexoraMotion?.animateModeSwitch) {
    window.NexoraMotion.animateModeSwitch()
  }
}

/**
 * Initialize dashboard mode on page load
 */
export function initializeDashboardMode() {
  const mode = getNexoraUxMode()
  applyDashboardMode(mode)
}

/**
 * Register global API on window (browser only)
 */
export function registerGlobalAPI() {
  if (typeof window !== 'undefined') {
    window.setNexoraUxMode = setNexoraUxMode
    window.getNexoraUxMode = getNexoraUxMode
  }
}
