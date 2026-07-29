import { createMetricCard } from '../components/MetricCard.js'

const fmt = (value) => {
  const amount = Number(value) || 0
  const fractionDigits = Number.isInteger(amount) ? 0 : 2
  return `${amount.toLocaleString('fr-FR', { minimumFractionDigits: fractionDigits, maximumFractionDigits: fractionDigits })} €`
}

/**
 * Renders the Dashboard KPI Strip using V2 createMetricCard components.
 * @param {Object} metrics - Financial metrics from the dashboard
 * @param {Object} options - Additional options (documentRef, windowRef)
 */
export function renderDashboardKpiStrip(metrics = {}, options = {}) {
  const documentRef = options.documentRef || document
  const windowRef = options.windowRef || (typeof window !== 'undefined' ? window : undefined)

  const revReel = Number(metrics.revReel || 0)
  const solde = Number(metrics.solde || 0)
  const soldeEstime = Number(metrics.soldeEstime || 0)
  const tauxCh = Number(metrics.tauxCh || 0)
  const tauxEp = Number(metrics.tauxEp || 0)

  // Solde actuel card
  const soldeRoot = documentRef.getElementById('card-solde')
  if (soldeRoot) {
    const soldeTone = soldeEstime > 0 ? 'positive' : soldeEstime < 0 ? 'critical' : 'neutral'
    const soldeBadge = soldeEstime > 0 ? 'Stable' : soldeEstime < 0 ? 'À risque' : 'Équilibré'
    const soldeContext = soldeEstime > 0 ? 'Après paiements saisis' : soldeEstime < 0 ? 'Solde actuel négatif' : 'Équilibré'

    const soldeCard = createMetricCard({
      label: 'Solde actuel',
      value: fmt(soldeEstime),
      context: soldeContext,
      tone: soldeTone,
      trend: { label: soldeBadge }
    }, documentRef)

    soldeRoot.innerHTML = ''
    soldeRoot.appendChild(soldeCard)
    if (soldeEstime < 0) soldeRoot.classList.add('negative-solde')
    else soldeRoot.classList.remove('negative-solde')
  }

  // Épargne prévue card
  const epargneRoot = documentRef.getElementById('card-epargne')
  if (epargneRoot) {
    const targetEp = Number(windowRef?.getValCached?.('target_epargne') || 500)
    const pctObjectif = targetEp > 0 ? Math.round((solde / targetEp) * 100) : 0
    
    let epargneTone = 'neutral'
    let epargneBadge = 'À compléter'
    let epargneValue = '—'
    let epargneContext = 'Budget à compléter'

    if (revReel > 0) {
      epargneValue = `${tauxEp}%`
      if (pctObjectif >= 100) {
        epargneTone = 'positive'
        epargneBadge = 'Atteint'
        epargneContext = `Objectif : ${fmt(targetEp)} — ${pctObjectif}% atteint`
      } else if (pctObjectif >= 50) {
        epargneTone = 'warning'
        epargneBadge = 'En progrès'
        epargneContext = `Objectif : ${fmt(targetEp)} — ${pctObjectif}% atteint`
      } else {
        epargneTone = 'critical'
        epargneBadge = 'À risque'
        epargneContext = `Objectif : ${fmt(targetEp)} — ${pctObjectif}% atteint`
      }
    }

    const epargneCard = createMetricCard({
      label: 'Épargne prévue',
      value: epargneValue,
      context: epargneContext,
      tone: epargneTone,
      trend: { label: epargneBadge },
      progress: revReel > 0 ? pctObjectif : undefined
    }, documentRef)

    epargneRoot.innerHTML = ''
    epargneRoot.classList.remove('success-status', 'warning-status', 'danger-status')
    if (pctObjectif >= 100) epargneRoot.classList.add('success-status')
    else if (pctObjectif >= 50) epargneRoot.classList.add('warning-status')
    else epargneRoot.classList.add('danger-status')
    epargneRoot.appendChild(epargneCard)
  }

  // Taux de charges card
  const tauxRoot = documentRef.getElementById('card-taux')
  if (tauxRoot) {
    let tauxTone = 'neutral'
    let tauxBadge = 'Analyse'
    let tauxValue = '—'
    let tauxContext = 'Données insuffisantes'

    if (revReel > 0) {
      tauxValue = `${tauxCh}%`
      tauxContext = 'Fixes + variables'
      if (tauxCh <= 70) {
        tauxTone = 'positive'
        tauxBadge = 'Maîtrisé'
      } else if (tauxCh <= 85) {
        tauxTone = 'warning'
        tauxBadge = 'À surveiller'
      } else {
        tauxTone = 'critical'
        tauxBadge = 'Élevé'
      }
    }

    const tauxCard = createMetricCard({
      label: 'Taux de charges',
      value: tauxValue,
      context: tauxContext,
      tone: tauxTone,
      trend: { label: tauxBadge },
      progress: revReel > 0 ? Math.min(tauxCh, 100) : undefined
    }, documentRef)

    tauxRoot.innerHTML = ''
    tauxRoot.classList.remove('warning-status', 'danger-status')
    if (tauxCh > 85) tauxRoot.classList.add('danger-status')
    else if (tauxCh > 70) tauxRoot.classList.add('warning-status')
    tauxRoot.appendChild(tauxCard)
  }

  windowRef?.NexoraMotion?.transitionDashboardProgress?.(
    documentRef.querySelector('.dashboard-primary-kpis')
  )
}

export default renderDashboardKpiStrip
