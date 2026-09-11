const toFiniteNumber = (value, fallback = 0) => {
  const number = Number(value)
  return Number.isFinite(number) ? number : fallback
}

const formatEuro = (value) => {
  const amount = toFiniteNumber(value)
  return `${amount.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} €`
}

const escapeHtml = (value) => String(value ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#039;')

const getReducedMotion = (windowRef) => {
  if (typeof windowRef?.matchMedia !== 'function') return false
  return windowRef.matchMedia('(prefers-reduced-motion: reduce)').matches
}

const scheduleFrame = (windowRef, callback) => {
  if (typeof windowRef?.requestAnimationFrame === 'function') {
    windowRef.requestAnimationFrame(callback)
    return
  }

  setTimeout(callback, 16)
}

const animateNumericText = ({ element, target, format, duration = 650, windowRef }) => {
  if (!element) return

  const targetValue = Number.isFinite(Number(target)) ? Number(target) : 0
  const startValue = 0
  const startTime = performance.now()

  const update = (now) => {
    const elapsed = now - startTime
    const progress = Math.min(1, elapsed / duration)
    const eased = 1 - Math.pow(1 - progress, 3)
    const currentValue = startValue + (targetValue - startValue) * eased
    element.textContent = format(currentValue)

    if (progress < 1) {
      scheduleFrame(windowRef, update)
    }
  }

  if (targetValue === 0) {
    element.textContent = format(0)
    return
  }

  scheduleFrame(windowRef, update)
}

const revealDonut = ({ analytics, fixedPct, variablePct, isReducedMotion, windowRef }) => {
  const fixedSegment = analytics.querySelector('.dashboard-analytics__donut-segment--fixed')
  const variableSegment = analytics.querySelector('.dashboard-analytics__donut-segment--variable')
  if (!fixedSegment || !variableSegment) return

  if (isReducedMotion) {
    fixedSegment.setAttribute('stroke-dasharray', `${fixedPct} ${100 - fixedPct}`)
    variableSegment.setAttribute('stroke-dasharray', `${variablePct} ${100 - variablePct}`)
    variableSegment.setAttribute('stroke-dashoffset', String(-fixedPct))
    return
  }

  fixedSegment.setAttribute('stroke-dasharray', `0 ${100 - fixedPct}`)
  variableSegment.setAttribute('stroke-dasharray', `0 ${100 - variablePct}`)
  variableSegment.setAttribute('stroke-dashoffset', '0')

  scheduleFrame(windowRef, () => {
    fixedSegment.setAttribute('stroke-dasharray', `${fixedPct} ${100 - fixedPct}`)
    variableSegment.setAttribute('stroke-dasharray', `${variablePct} ${100 - variablePct}`)
    variableSegment.setAttribute('stroke-dashoffset', String(-fixedPct))
  })
}

export function renderDashboardAnalytics(rootId, metrics = {}, options = {}) {
  const documentRef = options.documentRef || document
  const windowRef = options.windowRef || documentRef.defaultView || window
  const root = documentRef.getElementById(rootId)
  if (!root) return

  const income = toFiniteNumber(metrics.income ?? metrics.revReel)
  const fixed = Math.max(0, toFiniteNumber(metrics.fixedExpenses ?? metrics.fixReel))
  const variable = Math.max(0, toFiniteNumber(metrics.variableExpenses ?? metrics.varReel))
  const expenses = Math.max(0, toFiniteNumber(metrics.expenses ?? metrics.totalDepReel, fixed + variable))
  const projected = toFiniteNumber(metrics.projectedBalance ?? metrics.solde)
  const available = Math.max(0, toFiniteNumber(metrics.available ?? metrics.safetyMargin))
  const total = fixed + variable > 0 ? fixed + variable : expenses
  const fixedPct = total > 0 ? Math.round((fixed / total) * 100) : 0
  const variablePct = total > 0 ? Math.max(0, 100 - fixedPct) : 0
  const incomePct = income > 0 ? Math.min(100, Math.round((expenses / income) * 100)) : 0
  const hasData = income > 0 || total > 0
  const isReducedMotion = getReducedMotion(windowRef)

  const analytics = documentRef.createElement('section')
  analytics.className = 'dashboard-analytics'
  analytics.setAttribute('aria-label', 'Analyse des dépenses')
  analytics.innerHTML = `
    <div class="dashboard-analytics__header">
      <div>
        <span class="dashboard-analytics__eyebrow">LECTURE DU MOIS</span>
        <h2 class="dashboard-analytics__title">Analyse des dépenses</h2>
      </div>
      <span class="dashboard-analytics__caption">Répartition réelle</span>
    </div>
    ${hasData ? `
      <div class="dashboard-analytics__body">
        <div class="dashboard-analytics__donut-wrap">
          <div class="dashboard-analytics__donut" aria-label="${fixedPct}% de charges fixes et ${variablePct}% de dépenses variables">
            <svg class="dashboard-analytics__donut-svg" viewBox="0 0 120 120" role="img" aria-hidden="true">
              <circle cx="60" cy="60" r="42" class="dashboard-analytics__donut-track"></circle>
              <circle cx="60" cy="60" r="42" class="dashboard-analytics__donut-segment dashboard-analytics__donut-segment--fixed" pathLength="100" stroke-dasharray="0 100" stroke-dashoffset="0"></circle>
              <circle cx="60" cy="60" r="42" class="dashboard-analytics__donut-segment dashboard-analytics__donut-segment--variable" pathLength="100" stroke-dasharray="0 100" stroke-dashoffset="0"></circle>
              <defs>
                <linearGradient id="dashboard-donut-pulse" x1="48" y1="21" x2="72" y2="21" gradientUnits="userSpaceOnUse">
                  <stop offset="0" stop-color="#53e3e7" stop-opacity="0"></stop>
                  <stop offset="0.5" stop-color="#b8ffff" stop-opacity="1"></stop>
                  <stop offset="1" stop-color="#53e3e7" stop-opacity="0"></stop>
                </linearGradient>
              </defs>
              <g class="dashboard-analytics__donut-pulse" aria-hidden="true">
                <path d="M48 21H72" pathLength="24"></path>
              </g>
            </svg>
            <div class="dashboard-analytics__donut-hole">
              <strong class="dashboard-analytics__donut-value">${formatEuro(0)}</strong>
              <span>Dépenses</span>
            </div>
          </div>
          <div class="dashboard-analytics__legend">
            <div class="dashboard-analytics__legend-row"><span class="dashboard-analytics__swatch dashboard-analytics__swatch--fixed"></span><span>Charges fixes</span><strong>${formatEuro(fixed)}</strong><small>${fixedPct}%</small></div>
            <div class="dashboard-analytics__legend-row"><span class="dashboard-analytics__swatch dashboard-analytics__swatch--variable"></span><span>Dépenses variables</span><strong>${formatEuro(variable)}</strong><small>${variablePct}%</small></div>
          </div>
        </div>
        <div class="dashboard-analytics__flow">
          <div class="dashboard-analytics__flow-header"><span>Revenus du cycle</span><strong>${formatEuro(income)}</strong></div>
          <div class="dashboard-analytics__flow-track"><span style="width: ${income > 0 ? 100 : 0}%"></span></div>
          <div class="dashboard-analytics__flow-header"><span>Dépenses prévues</span><strong>${formatEuro(expenses)}</strong></div>
          <div class="dashboard-analytics__flow-track dashboard-analytics__flow-track--expense"><span style="width: ${income > 0 ? incomePct : 0}%"></span></div>
          <div class="dashboard-analytics__flow-summary"><span>Projection</span><strong class="${projected < 0 ? 'is-negative' : ''}">${formatEuro(projected)}</strong></div>
          <div class="dashboard-analytics__flow-summary"><span>Disponible</span><strong>${formatEuro(available)}</strong></div>
        </div>
      </div>
    ` : `
      <div class="dashboard-analytics__empty"><strong>Analyse partielle</strong><span>Renseigne tes revenus et tes dépenses pour lire la répartition du mois.</span></div>
    `}
  `

  root.replaceChildren(analytics)

  if (hasData) {
    revealDonut({
      analytics,
      fixedPct,
      variablePct,
      isReducedMotion,
      windowRef
    })

    const donutValue = analytics.querySelector('.dashboard-analytics__donut-value')
    if (donutValue) {
      if (isReducedMotion) {
        donutValue.textContent = formatEuro(total)
      } else {
        animateNumericText({
          element: donutValue,
          target: total,
          format: formatEuro,
          duration: 650,
          windowRef
        })
      }
    }
  }

  return analytics
}

export default renderDashboardAnalytics
