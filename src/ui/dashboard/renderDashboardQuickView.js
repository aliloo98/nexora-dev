import { createMetricCard } from '../components/MetricCard.js'
import { getDocument } from '../internal/dom.js'

const fmt = (value) => {
  const amount = Number(value) || 0
  const fractionDigits = Number.isInteger(amount) ? 0 : 2
  return `${amount.toLocaleString('fr-FR', { minimumFractionDigits: fractionDigits, maximumFractionDigits: fractionDigits })} €`
}

/**
 * Renders the Dashboard Quick View metrics using V2 createMetricCard components.
 * @param {Object} metrics - Financial metrics from the dashboard
 * @param {Object} options - Additional options (documentRef, windowRef)
 */
export function renderDashboardQuickView(metrics = {}, options = {}) {
  const documentRef = options.documentRef || document
  const windowRef = options.windowRef || (typeof window !== 'undefined' ? window : undefined)

  const revReel = Number(metrics.revReel || 0)
  const fixReel = Number(metrics.fixReel || 0)
  const varReel = Number(metrics.varReel || 0)
  const debtSummary = metrics.debtSummary || { total: 0, monthly: 0 }

  // Revenus card
  const revenusRoot = documentRef.getElementById('card-revenus')
  if (revenusRoot) {
    const revenusCard = createMetricCard({
      label: 'Revenus',
      value: fmt(revReel),
      context: 'Mois en cours',
      tone: revReel > 0 ? 'positive' : 'neutral'
    }, documentRef)

    revenusRoot.innerHTML = ''
    revenusRoot.appendChild(revenusCard)
  }

  // Charges fixes card
  const fixesRoot = documentRef.getElementById('card-fixes')
  if (fixesRoot) {
    const fixesPct = revReel > 0 ? Math.round(fixReel / revReel * 100) : 0
    let fixesTone = 'neutral'
    if (fixesPct > 60) fixesTone = 'critical'
    else if (fixesPct > 50) fixesTone = 'warning'

    const fixesCard = createMetricCard({
      label: 'Charges fixes',
      value: fmt(fixReel),
      context: revReel > 0 ? `${fixesPct}% des revenus` : 'Ajoutez vos revenus pour commencer',
      tone: fixesTone,
      progress: revReel > 0 ? Math.min(fixesPct, 100) : undefined
    }, documentRef)

    fixesRoot.innerHTML = ''
    fixesRoot.classList.remove('warning-status', 'danger-status')
    if (fixesPct > 60) fixesRoot.classList.add('danger-status')
    else if (fixesPct > 50) fixesRoot.classList.add('warning-status')
    fixesRoot.appendChild(fixesCard)
  }

  // Dépenses variables card
  const variablesRoot = documentRef.getElementById('card-variables')
  if (variablesRoot) {
    const variablesPct = revReel > 0 ? Math.round(varReel / revReel * 100) : 0
    let variablesTone = 'neutral'
    if (variablesPct > 40) variablesTone = 'critical'
    else if (variablesPct > 30) variablesTone = 'warning'

    const variablesCard = createMetricCard({
      label: 'Dépenses variables',
      value: fmt(varReel),
      context: revReel > 0 ? `${variablesPct}% des revenus` : 'Données insuffisantes',
      tone: variablesTone,
      progress: revReel > 0 ? Math.min(variablesPct, 100) : undefined
    }, documentRef)

    variablesRoot.innerHTML = ''
    variablesRoot.classList.remove('warning-status', 'danger-status')
    if (variablesPct > 40) variablesRoot.classList.add('danger-status')
    else if (variablesPct > 30) variablesRoot.classList.add('warning-status')
    variablesRoot.appendChild(variablesCard)
  }

  // Dettes card
  const dettesRoot = documentRef.getElementById('card-dettes')
  if (dettesRoot) {
    const dettesTone = debtSummary.total > 0 ? 'warning' : 'neutral'
    const dettesContext = debtSummary.total > 0 
      ? `Mensualité : ${fmt(debtSummary.monthly)}` 
      : 'Aucune dette active'

    const dettesCard = createMetricCard({
      label: 'Dettes',
      value: fmt(debtSummary.total),
      context: dettesContext,
      tone: dettesTone
    }, documentRef)

    dettesRoot.innerHTML = ''
    dettesRoot.appendChild(dettesCard)
  }

  // Trigger animation if available
  windowRef?.NexoraMotion?.animateCards?.(documentRef.querySelector('.dashboard-quick-metrics'))
}

export default renderDashboardQuickView
