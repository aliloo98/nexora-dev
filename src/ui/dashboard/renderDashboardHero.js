import { createHeroCard } from '../components/HeroCard.js'

const fmt = (value) => {
  const amount = Number(value) || 0
  const fractionDigits = Number.isInteger(amount) ? 0 : 2
  return `${amount.toLocaleString('fr-FR', { minimumFractionDigits: fractionDigits, maximumFractionDigits: fractionDigits })} €`
}

const fmtPct = (value) => {
  const pct = Number(value) || 0
  return `${pct.toFixed(0)}%`
}

const getNexoraOfficialSituation = ({ revReel, solde, tauxCh, variablesPct }) => {
  if (revReel === 0) {
    return { state: 'neutral', label: 'Synthèse à compléter', riskLabel: '—' }
  }

  if (solde < 0) {
    return { state: 'danger', label: 'Déficit prévu', riskLabel: 'Élevé' }
  }

  if (solde < revReel * 0.1) {
    return { state: 'warning', label: 'Marge faible', riskLabel: 'Modéré' }
  }

  if (tauxCh > 85) {
    return { state: 'warning', label: 'Charges élevées', riskLabel: 'Modéré' }
  }

  return { state: 'positive', label: 'Situation stable', riskLabel: 'Faible' }
}

/**
 * Renders the premium Hero Card using V2 components with sub-metrics.
 * @param {string} rootId - The ID of the container element
 * @param {Object} metrics - Financial metrics (revReel, solde, tauxCh, variablesPct, totalDepRestant, savingsRate)
 * @param {Object} options - Additional options (documentRef, onAction)
 */
export function renderDashboardHero(rootId, metrics = {}, options = {}) {
  const documentRef = options.documentRef || document
  const windowRef = options.windowRef || (typeof window !== 'undefined' ? window : undefined)
  const root = documentRef.getElementById(rootId)
  if (!root) return

  const revReel = Number(metrics.revReel || 0)
  const solde = Number(metrics.solde || 0)
  const tauxCh = Number(metrics.tauxCh || 0)
  const variablesPct = Number(metrics.variablesPct || 0)
  const totalDepRestant = Number(metrics.totalDepRestant || 0)
  const savingsRate = Number(metrics.savingsRate || 0)

  let tone = 'neutral'
  let context = 'Synthèse à compléter'
  let trend = null
  let subMetrics = []

  if (revReel > 0) {
    const situation = getNexoraOfficialSituation({ revReel, solde, tauxCh, variablesPct })
    tone = situation.state
    context = situation.label
    trend = `Charges ${tauxCh}% · Variables ${variablesPct}%`
    
    subMetrics = [
      { label: 'Taux d\'épargne', value: fmtPct(savingsRate) }
    ]
  }

  const heroCard = createHeroCard({
    amount: revReel > 0 ? fmt(solde) : '—',
    label: 'Argent restant ce mois-ci',
    context,
    trend,
    subMetrics,
    tone,
    actionLabel: revReel > 0 ? 'Voir le plan' : 'Saisir le mois',
    onAction: () => {
      if (typeof options.onAction === 'function') {
        options.onAction(revReel > 0 ? 'plan' : 'saisie')
      } else if (typeof windowRef !== 'undefined' && typeof windowRef.showSection === 'function') {
        windowRef.showSection(revReel > 0 ? 'plan' : 'saisie')
      }
    },
    ariaLabel: 'Solde du mois'
  }, documentRef)

  root.innerHTML = ''
  root.appendChild(heroCard)
}

export default renderDashboardHero
