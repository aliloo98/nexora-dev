const CACHE_TTL_MS = 1200
const store = new Map()

export const getCachedMonthMetrics = (monthKey, loader) => {
  const key = String(monthKey || 'current')
  const now = Date.now()
  const cached = store.get(key)
  if (cached && now - cached.at < CACHE_TTL_MS) return cached.value

  const value = loader()
  store.set(key, { at: now, value })
  return value
}

export const invalidateMetricsCache = (monthKey) => {
  if (monthKey) store.delete(String(monthKey))
  else store.clear()
}

if (typeof window !== 'undefined') {
  window.NexoraMetricsCache = { getCachedMonthMetrics, invalidateMetricsCache }
}

export default { getCachedMonthMetrics, invalidateMetricsCache }
