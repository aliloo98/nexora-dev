const LAST_SYNC_KEY = 'nexora_last_sync_v1'

export const recordLastSync = (detail = {}) => {
  try {
    const payload = {
      at: new Date().toISOString(),
      online: typeof navigator !== 'undefined' ? navigator.onLine !== false : true,
      ...detail
    }
    const runtime = typeof window !== 'undefined' ? window : globalThis
    const serialized = JSON.stringify(payload)
    runtime?.localStorage?.setItem?.(LAST_SYNC_KEY, serialized)
    runtime?.SafeStorage?.setItem?.(LAST_SYNC_KEY, serialized)
  } catch {
    // Non bloquant.
  }
}

export const readLastSync = () => {
  try {
    const runtime = typeof window !== 'undefined' ? window : globalThis
    const raw = runtime?.SafeStorage?.getItem?.(LAST_SYNC_KEY) || runtime?.localStorage?.getItem?.(LAST_SYNC_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' ? parsed : null
  } catch {
    return null
  }
}

export const getSyncStatusSnapshot = () => {
  const online = typeof navigator !== 'undefined' ? navigator.onLine !== false : true
  const last = readLastSync()
  const syncState = typeof window !== 'undefined' ? window.TransactionsService?.getSyncState?.() : null
  const pending = Number(syncState?.pending || syncState?.queueLength || 0)
  const label = !online
    ? 'Hors ligne'
    : pending > 0
      ? `Synchronisation · ${pending} en attente`
      : last?.at
        ? 'Synchronisé'
        : 'Synchronisation locale'
  return {
    online,
    label,
    pending,
    lastAt: last?.at || null,
    lastAction: last?.action || null
  }
}

export default { recordLastSync, readLastSync, getSyncStatusSnapshot }
