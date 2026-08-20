import { buildBudgetCoachState } from '../budgetCoach.js'

const fmt = (value) => {
  const amount = Number(value) || 0
  const fractionDigits = Number.isInteger(amount) ? 0 : 2
  return `${amount.toLocaleString('fr-FR', { minimumFractionDigits: fractionDigits, maximumFractionDigits: fractionDigits })} €`
}

/**
 * Renders the Dashboard Coach card using V2 architecture.
 * This component displays contextual financial guidance based on the current budget state.
 * @param {string} rootId - The ID of the container element (coach-action-root)
 * @param {Object} metrics - Financial metrics (revReel, solde, tauxCh, variablesPct, totalDepRestant)
 * @param {Object} options - Additional options (documentRef, windowRef)
 */
export function renderDashboardCoach(rootId, metrics = {}, options = {}) {
  const documentRef = options.documentRef || document
  const windowRef = options.windowRef || (typeof window !== 'undefined' ? window : undefined)
  const root = documentRef.getElementById(rootId)
  if (!root) return

  const isHydrating = metrics.loading === true || metrics.hydrating === true || metrics.isHydrating === true || metrics.hydrationComplete === false
  const revReel = Number(metrics.revReel || 0)
  const solde = Number(metrics.solde || 0)
  const tauxCh = Number(metrics.tauxCh || 0)
  const variablesPct = Number(metrics.variablesPct || 0)
  const totalDepRestant = Number(metrics.totalDepRestant || 0)

  // Build coach state based on financial metrics
  // For now, we create a simple state based on the available metrics
  let coachState = {
    key: 'neutral',
    tone: 'info',
    kicker: 'Prochaine étape',
    title: isHydrating ? 'Chargement du budget' : 'Synthèse à compléter',
    reason: isHydrating ? 'Le mois est en cours de restauration…' : 'Commence par saisir tes revenus et charges.',
    actionLabel: isHydrating ? 'Préparation…' : 'Saisir le budget',
    target: isHydrating ? 'dashboard' : 'saisie'
  }

  if (!isHydrating && revReel > 0) {
    if (solde < 0) {
      coachState = {
        key: 'danger',
        tone: 'danger',
        kicker: 'Attention',
        title: 'Déficit prévu',
        reason: `Tes dépassent tes revenus de ${fmt(Math.abs(solde))}.`,
        actionLabel: 'Réviser le budget',
        target: 'saisie'
      }
    } else if (solde < revReel * 0.1) {
      coachState = {
        key: 'warning',
        tone: 'warning',
        kicker: 'Marge faible',
        title: 'Attention à la pression',
        reason: `Il reste ${fmt(solde)} ce mois-ci. Garde une marge de sécurité.`,
        actionLabel: 'Optimiser',
        target: 'saisie'
      }
    } else if (tauxCh > 85) {
      coachState = {
        key: 'warning',
        tone: 'warning',
        kicker: 'Charges élevées',
        title: 'Taux de charges important',
        reason: `Tes charges fixes représentent ${tauxCh}% de tes revenus.`,
        actionLabel: 'Analyser',
        target: 'saisie'
      }
    } else {
      coachState = {
        key: 'success',
        tone: 'success',
        kicker: 'Situation saine',
        title: 'Le budget tient bien',
        reason: `Il reste ${fmt(solde)} à dépenser ce mois-ci.`,
        actionLabel: 'Voir la synthèse',
        target: 'dashboard'
      }
    }
  }

  // Render the coach card
  root.innerHTML = `
    <div class="budget-coach-card">
      <div class="budget-coach-card__kicker">${coachState.kicker}</div>
      <div class="budget-coach-card__title">${coachState.title}</div>
      <div class="budget-coach-card__reason">${coachState.reason}</div>
      <button class="budget-coach-action" data-target="${coachState.target}">
        ${coachState.actionLabel}
      </button>
    </div>
  `
}
