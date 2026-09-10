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

export function renderDashboardAnalytics(rootId, metrics = {}, options = {}) {
  const documentRef = options.documentRef || document
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
          <div class="dashboard-analytics__donut" style="--fixed-pct: ${fixedPct}%;" aria-label="${fixedPct}% de charges fixes et ${variablePct}% de dépenses variables">
            <div class="dashboard-analytics__donut-hole">
              <strong>${formatEuro(total)}</strong>
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
  return analytics
}

export default renderDashboardAnalytics
