/**
 * Moteur du Compagnon Financier Nexora - Time & Insight Aware Engine
 * Génère une narration naturelle et intègre les recommandations proactives du FinancialInsightEngine.
 */
import { getTimeContext } from '../time/timeEngine.js'
import { getTopFinancialInsight } from './financialInsightEngine.js'

const fmtAmount = (value) => {
  const amount = Math.round(Number(value) || 0)
  return `${amount.toLocaleString('fr-FR')} €`
}

export function evaluateCopilotState(metrics = {}, options = {}) {
  const viewedMonthIso = options.viewedMonth || metrics.viewedMonthIso || null
  const timeContext = options.timeContext || getTimeContext(viewedMonthIso)
  const history = options.history || metrics.history || []
  const goals = options.goals || metrics.goals || []

  const revReel = Number(metrics.revReel || 0)
  const fixReel = Number(metrics.fixReel || 0)
  const varReel = Number(metrics.varReel || 0)
  const totalExpenses = fixReel + varReel
  const soldeFinMois = revReel - totalExpenses

  const resteAVivre = Math.max(0, soldeFinMois)
  const savingsRate = revReel > 0 ? (soldeFinMois / revReel) * 100 : 0
  const tauxCharges = revReel > 0 ? (fixReel / revReel) * 100 : 0

  // 1. MOIS EN ATTENTE DE DONNÉES
  if (revReel === 0 && totalExpenses === 0) {
    return {
      posture: 'INITIAL',
      humanIndicator: '🔵 Bienvenue sur Nexora',
      heroEmotionalPhrase: "Saisis tes premiers montants pour débloquer ton compagnon.",
      statusPhrase: 'En attente de budget',
      copilotMessage: 'J\'attends tes premiers montants pour t\'accompagner au quotidien.',
      action: { label: 'Saisir mes montants', targetSection: 'plan' },
      resteAVivre: 0,
      dailySafeSpend: null,
      daysRemaining: timeContext.daysRemaining,
      timeContext,
      soldeFinMois: 0,
      isConfigured: false,
      understanding: {
        headline: 'J\'attends tes premières informations.',
        details: 'Ajoute tes revenus et tes charges pour que je puisse calculer ton disponible.',
        landingText: 'Configuration rapide disponible en un clic.'
      }
    }
  }

  // 2. MOIS PASSÉ (PAST)
  if (timeContext.isPast) {
    const isPositive = soldeFinMois >= 0
    return {
      posture: isPositive ? 'EXCELLENT' : 'CRITIQUE',
      humanIndicator: '📜 Bilan du mois',
      heroEmotionalPhrase: 'Voici le résultat final de ce mois.',
      statusPhrase: 'Mois terminé',
      copilotMessage: `Ce mois est terminé. Tu l'as achevé avec un solde final de ${fmtAmount(soldeFinMois)}.`,
      action: null,
      resteAVivre: 0,
      dailySafeSpend: null,
      daysRemaining: 0,
      timeContext,
      soldeFinMois,
      isConfigured: true,
      understanding: {
        headline: isPositive ? 'Mois clôturé avec succès.' : 'Mois clôturé en déficit.',
        details: `Ce mois est terminé. Tu as reçu ${fmtAmount(revReel)} et engagé ${fmtAmount(totalExpenses)} de dépenses.`,
        landingText: `Résultat final du mois : ${fmtAmount(soldeFinMois)} préservés.`
      }
    }
  }

  // 3. MOIS FUTUR (FUTURE)
  if (timeContext.isFuture) {
    return {
      posture: 'NORMAL',
      humanIndicator: '🔮 Projection à venir',
      heroEmotionalPhrase: 'Prévision et estimation pour ce mois.',
      statusPhrase: 'Projection du mois',
      copilotMessage: `Si tu respectes ce budget, tu devrais pouvoir préserver environ ${fmtAmount(soldeFinMois)} d'avance.`,
      action: null,
      resteAVivre,
      dailySafeSpend: null,
      daysRemaining: timeContext.daysInMonth,
      timeContext,
      soldeFinMois,
      isConfigured: true,
      understanding: {
        headline: 'Préparation du mois à venir.',
        details: `Ce budget prévisionnel prévoit ${fmtAmount(revReel)} de revenus et ${fmtAmount(fixReel)} de charges.`,
        landingText: `Trajectoire estimée : ${fmtAmount(soldeFinMois)} d'atterrissage.`
      }
    }
  }

  // 4. MOIS COURANT (CURRENT) - Intégration du Financial Insight Engine
  const topInsight = getTopFinancialInsight(metrics, history, goals)
  const dailySafeSpend = timeContext.daysRemaining > 0 ? Math.round(resteAVivre / timeContext.daysRemaining) : 0

  if (topInsight) {
    return {
      posture: topInsight.type || 'NORMAL',
      humanIndicator: topInsight.humanIndicator,
      heroEmotionalPhrase: topInsight.headline,
      statusPhrase: 'Analyse proactive',
      copilotMessage: topInsight.message,
      action: topInsight.action,
      resteAVivre,
      dailySafeSpend,
      daysRemaining: timeContext.daysRemaining,
      timeContext,
      soldeFinMois,
      isConfigured: true,
      understanding: {
        headline: topInsight.headline,
        details: `Il te reste environ ${dailySafeSpend} € par jour jusqu'à la fin du mois.`,
        landingText: `Trajectoire sous contrôle avec environ ${fmtAmount(soldeFinMois)} d'avance.`
      }
    }
  }

  // Fallback Mois Courant Normal
  return {
    posture: 'NORMAL',
    humanIndicator: '🟢 Tout va bien aujourd\'hui',
    heroEmotionalPhrase: "Aujourd'hui tu peux vivre normalement.",
    statusPhrase: 'Budget sous contrôle',
    copilotMessage: `Tu peux sortir dîner ce soir sans mettre ton budget en danger.`,
    action: null,
    resteAVivre,
    dailySafeSpend,
    daysRemaining: timeContext.daysRemaining,
    timeContext,
    soldeFinMois,
    isConfigured: true,
    understanding: {
      headline: 'Tes dépenses essentielles sont couvertes.',
      details: `Il te reste environ ${dailySafeSpend} € par jour jusqu'à la fin du mois.`,
      landingText: `Si tu gardes ce rythme, tu termineras le mois dans le vert avec environ ${fmtAmount(soldeFinMois)} d'avance.`
    }
  }
}
