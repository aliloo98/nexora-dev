/**
 * Moteur Temporel Centralisé Nexora - Time Engine
 * Détermine l'état du mois visualisé (PAST, CURRENT, FUTURE)
 * et calcule avec précision le décompte des jours et les métriques temporelles.
 */

export function getTimeContext(viewedMonthIso, referenceDate = new Date()) {
  const ref = new Date(referenceDate)
  const currentYear = ref.getFullYear()
  const currentMonth = ref.getMonth() + 1 // 1-indexed (1-12)
  const currentDay = ref.getDate()

  let viewedYear = currentYear
  let viewedMonth = currentMonth

  if (typeof viewedMonthIso === 'string' && viewedMonthIso.includes('-')) {
    const parts = viewedMonthIso.split('-')
    const y = parseInt(parts[0], 10)
    const m = parseInt(parts[1], 10)
    if (!isNaN(y) && !isNaN(m)) {
      viewedYear = y
      viewedMonth = m
    }
  }

  // Détermination exacte du statut (PAST, CURRENT, FUTURE)
  let status = 'CURRENT'
  if (viewedYear < currentYear) {
    status = 'PAST'
  } else if (viewedYear > currentYear) {
    status = 'FUTURE'
  } else {
    if (viewedMonth < currentMonth) {
      status = 'PAST'
    } else if (viewedMonth > currentMonth) {
      status = 'FUTURE'
    } else {
      status = 'CURRENT'
    }
  }

  // Nombre de jours dans le mois visualisé
  const daysInMonth = new Date(viewedYear, viewedMonth, 0).getDate()

  let daysElapsed = 0
  let daysRemaining = 0
  let progressPercent = 0

  if (status === 'PAST') {
    daysElapsed = daysInMonth
    daysRemaining = 0
    progressPercent = 100
  } else if (status === 'FUTURE') {
    daysElapsed = 0
    daysRemaining = daysInMonth
    progressPercent = 0
  } else {
    // CURRENT
    daysElapsed = Math.min(daysInMonth, Math.max(1, currentDay))
    daysRemaining = Math.max(1, daysInMonth - currentDay + 1)
    progressPercent = Math.min(100, Math.round((daysElapsed / daysInMonth) * 100))
  }

  return {
    currentDate: ref.toISOString().split('T')[0],
    currentYear,
    currentMonth,
    currentDay,
    viewedYear,
    viewedMonth,
    viewedMonthIso: `${viewedYear}-${String(viewedMonth).padStart(2, '0')}`,
    status,
    daysInMonth,
    daysElapsed,
    daysRemaining,
    progressPercent,
    isPast: status === 'PAST',
    isCurrent: status === 'CURRENT',
    isFuture: status === 'FUTURE'
  }
}
