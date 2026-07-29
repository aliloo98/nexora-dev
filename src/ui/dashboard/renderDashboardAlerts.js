import { createBadge } from '../primitives/Badge.js'
import { setText } from '../internal/dom.js'

const fmt = (value) => {
  const amount = Number(value) || 0
  const fractionDigits = Number.isInteger(amount) ? 0 : 2
  return `${amount.toLocaleString('fr-FR', { minimumFractionDigits: fractionDigits, maximumFractionDigits: fractionDigits })} €`
}

/**
 * Renders the Dashboard Alerts Card using V2 primitives.
 * @param {Object} metrics - Financial metrics from the dashboard
 * @param {Object} options - Additional options (documentRef, windowRef, getPendingFixedExpenseRows)
 */
export function renderDashboardAlerts(metrics = {}, options = {}) {
  const documentRef = options.documentRef || document
  const getPendingFixedExpenseRows = options.getPendingFixedExpenseRows || (() => [])

  const root = documentRef.getElementById('dashboard-alerts-card')
  if (!root) return

  const alerts = []
  const dueRows = getPendingFixedExpenseRows()

  if (Number(metrics.revReel || 0) <= 0) {
    alerts.push({
      level: 'neutral',
      title: 'Budget à compléter',
      detail: 'Ajoutez vos revenus pour activer les alertes.'
    })
  } else {
    if (Number(metrics.solde || 0) < 0) {
      alerts.push({
        level: 'critical',
        title: 'Solde projeté négatif',
        detail: `${fmt(Math.abs(Number(metrics.solde || 0)))} à couvrir`
      })
    }
    if (dueRows.length > 0) {
      const dueAmount = dueRows.reduce((sum, row) => sum + Number(row.remaining || 0), 0)
      alerts.push({
        level: 'warning',
        title: `${dueRows.length} paiement${dueRows.length > 1 ? 's' : ''} à venir`,
        detail: `${fmt(dueAmount)} restant à régler`
      })
    }
    if (Number(metrics.variablesPct || 0) > 40) {
      alerts.push({
        level: 'warning',
        title: 'Dépenses variables élevées',
        detail: `${Math.round(Number(metrics.variablesPct || 0))}% des revenus`
      })
    }
    if (alerts.length === 0) {
      alerts.push({
        level: 'success',
        title: 'Aucune alerte critique',
        detail: 'Le mois reste sous contrôle.'
      })
    }
  }

  const visibleAlerts = alerts.slice(0, 2)
  const alertCount = alerts[0]?.level === 'success' ? 0 : alerts.length

  // Create card structure
  root.innerHTML = ''

  const header = documentRef.createElement('div')
  header.className = 'nx-alerts-card__header'
  
  const headerContent = documentRef.createElement('div')
  const eyebrow = documentRef.createElement('span')
  eyebrow.className = 'nx-alerts-card__eyebrow'
  setText(eyebrow, 'Alertes')
  const title = documentRef.createElement('strong')
  setText(title, 'Points à surveiller')
  headerContent.appendChild(eyebrow)
  headerContent.appendChild(title)
  header.appendChild(headerContent)

  if (alertCount > 0) {
    const countBadge = createBadge({
      label: String(alertCount),
      tone: alertCount > 2 ? 'danger' : alertCount > 1 ? 'warning' : 'neutral'
    }, documentRef)
    countBadge.className = 'nx-alerts-card__count'
    header.appendChild(countBadge)
  }

  root.appendChild(header)

  const list = documentRef.createElement('div')
  list.className = 'nx-alerts-card__list'
  list.setAttribute('role', 'list')
  list.setAttribute('aria-label', 'Alertes du mois')

  visibleAlerts.forEach((alert) => {
    const item = documentRef.createElement('div')
    item.className = `nx-alerts-card__item nx-alerts-card__item--${alert.level}`
    item.setAttribute('role', 'listitem')

    const icon = documentRef.createElement('i')
    icon.setAttribute('aria-hidden', 'true')
    item.appendChild(icon)

    const content = documentRef.createElement('div')
    const itemTitle = documentRef.createElement('strong')
    setText(itemTitle, alert.title)
    const itemDetail = documentRef.createElement('span')
    setText(itemDetail, alert.detail)
    content.appendChild(itemTitle)
    content.appendChild(itemDetail)
    item.appendChild(content)

    list.appendChild(item)
  })

  root.appendChild(list)

}

export default renderDashboardAlerts
