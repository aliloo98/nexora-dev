/**
 * Logs temporaires de synchronisation — activer avec :
 * localStorage.setItem('nexora_sync_debug_v1', '1')
 */

const DEBUG_KEY = 'nexora_sync_debug_v1'
const LOG_KEY = 'nexora_sync_log_v1'
const MAX_ENTRIES = 80

export const isSyncDebugEnabled = () => {
  try {
    return localStorage.getItem(DEBUG_KEY) === '1'
  } catch {
    return false
  }
}

export const setSyncDebugEnabled = (enabled) => {
  try {
    if (enabled) localStorage.setItem(DEBUG_KEY, '1')
    else localStorage.removeItem(DEBUG_KEY)
  } catch {
    // ignore
  }
}

export const logSyncEvent = (scope, key, result = {}) => {
  const entry = {
    at: new Date().toISOString(),
    scope,
    key: key || null,
    ...result
  }

  if (isSyncDebugEnabled() && typeof console !== 'undefined') {
    console.info('[NexoraSync]', scope, key || '', result)
  }

  try {
    const raw = localStorage.getItem(LOG_KEY)
    const list = raw ? JSON.parse(raw) : []
    const next = Array.isArray(list) ? list.concat(entry).slice(-MAX_ENTRIES) : [entry]
    localStorage.setItem(LOG_KEY, JSON.stringify(next))
  } catch {
    // ignore
  }

  return entry
}

export const readSyncLog = () => {
  try {
    const raw = localStorage.getItem(LOG_KEY)
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export const clearSyncLog = () => {
  try {
    localStorage.removeItem(LOG_KEY)
  } catch {
    // ignore
  }
}

export default { isSyncDebugEnabled, setSyncDebugEnabled, logSyncEvent, readSyncLog, clearSyncLog }
