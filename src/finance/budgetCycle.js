const DAY_MS = 24 * 60 * 60 * 1000
const MONTH_KEY_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/

const pad = value => String(value).padStart(2, '0')

const parseMonthKey = (monthKey) => {
  if (!MONTH_KEY_PATTERN.test(String(monthKey || ''))) {
    throw new TypeError(`Invalid budget month: ${monthKey}`)
  }
  const [year, month] = monthKey.split('-').map(Number)
  return { year, month }
}

const parseDateOnly = (value, label) => {
  const raw = value instanceof Date ? value.toISOString() : String(value || '')
  const dateKey = raw.slice(0, 10)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) throw new TypeError(`${label} must be a valid date`)
  const timestamp = Date.parse(`${dateKey}T00:00:00.000Z`)
  if (!Number.isFinite(timestamp)) throw new TypeError(`${label} must be a valid date`)
  return { dateKey, timestamp }
}

export const daysInMonth = (year, month) => new Date(Date.UTC(year, month, 0)).getUTCDate()

const clampDay = (day, fallback) => {
  const value = Number.parseInt(day, 10)
  return Number.isFinite(value) ? Math.max(1, Math.min(31, value)) : fallback
}

const makeDate = (year, month, day) => {
  const normalized = new Date(Date.UTC(year, month - 1, Math.min(day, daysInMonth(year, month))))
  return {
    dateKey: `${normalized.getUTCFullYear()}-${pad(normalized.getUTCMonth() + 1)}-${pad(normalized.getUTCDate())}`,
    timestamp: normalized.getTime()
  }
}

/**
 * Reproduit le cycle calendrier/personnalisé historique avec une horloge injectée.
 * Hors de la période sélectionnée, elapsedDays reste égal à totalDays, comme
 * getBudgetCycleProgress dans le runtime historique.
 */
export function computeBudgetCycle({
  monthKey,
  settings = {},
  asOf
} = {}) {
  const { year, month } = parseMonthKey(monthKey)
  const reference = parseDateOnly(asOf, 'asOf')
  const mode = settings?.mode === 'custom' ? 'custom' : 'calendar'
  let start
  let end

  if (mode === 'calendar') {
    start = makeDate(year, month, 1)
    end = makeDate(year, month, daysInMonth(year, month))
  } else {
    const startDay = clampDay(settings?.startDay, 28)
    const endDay = clampDay(settings?.endDay, 27)
    end = makeDate(year, month, endDay)
    start = makeDate(year, month, startDay)
    if (start.timestamp >= end.timestamp || startDay >= endDay) {
      start = month === 1
        ? makeDate(year - 1, 12, startDay)
        : makeDate(year, month - 1, startDay)
    }
  }

  const totalDays = Math.max(1, Math.round((end.timestamp - start.timestamp) / DAY_MS) + 1)
  const isCurrent = reference.timestamp >= start.timestamp && reference.timestamp <= end.timestamp
  const elapsedDays = isCurrent
    ? Math.max(1, Math.min(totalDays, Math.round((reference.timestamp - start.timestamp) / DAY_MS) + 1))
    : totalDays
  const remainingDays = Math.max(0, totalDays - elapsedDays)

  return {
    mode,
    start: start.dateKey,
    end: end.dateKey,
    elapsedDays,
    remainingDays,
    totalDays,
    progress: (elapsedDays / totalDays) * 100
  }
}

export default { computeBudgetCycle, daysInMonth }
