/**
 * Moteur du Compagnon Financier Nexora - Version V5 Humanisée (Apple/Linear Style)
 * Génère une narration naturelle et des titres conversationnels.
 */

const fmtAmount = (value) => {
  const amount = Math.round(Number(value) || 0)
  return `${amount.toLocaleString('fr-FR')} €`
}

export function evaluateCopilotState(metrics = {}) {
  const revReel = Number(metrics.revReel || 0)
  const fixReel = Number(metrics.fixReel || 0)
  const varReel = Number(metrics.varReel || 0)
  const debtSummary = metrics.debtSummary || { total: 0, monthly: 0 }
  const totalExpenses = fixReel + varReel
  const soldeFinMois = revReel - totalExpenses

  // Jours restants dans le mois
  const now = new Date()
  const currentDay = now.getDate()
  const totalDaysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
  const daysRemaining = Math.max(1, totalDaysInMonth - currentDay + 1)

  // 1. ÉTAT INITIAL / DONNÉES EN ATTENTE
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
      daysRemaining,
      soldeFinMois: 0,
      isConfigured: false,
      understanding: {
        headline: 'J\'attends tes premières informations.',
        details: 'Ajoute tes revenus et tes charges pour que je puisse calculer ton disponible quotidien.',
        landingText: 'Configuration rapide disponible en un clic.'
      }
    }
  }

  // Calculs sémantiques
  const resteAVivre = Math.max(0, soldeFinMois)
  const dailySafeSpend = daysRemaining > 0 ? Math.round(resteAVivre / daysRemaining) : 0
  const savingsRate = revReel > 0 ? (soldeFinMois / revReel) * 100 : 0
  const tauxCharges = revReel > 0 ? (fixReel / revReel) * 100 : 0

  // 2. NIVEAU CRITIQUE (Déficit)
  if (soldeFinMois < 0) {
    const deficit = fmtAmount(Math.abs(soldeFinMois))
    return {
      posture: 'CRITIQUE',
      humanIndicator: '🔴 Action recommandée',
      heroEmotionalPhrase: "Les prochains jours demanderont de la prudence.",
      statusPhrase: 'Déficit détecté',
      copilotMessage: `Attention : tes charges dépassent tes revenus de ${deficit}. Réduis tes dépenses variables pour rééquilibrer ton mois.`,
      action: { label: 'Ajuster mes charges', targetSection: 'parametres' },
      resteAVivre: 0,
      dailySafeSpend: 0,
      daysRemaining,
      soldeFinMois,
      isConfigured: true,
      understanding: {
        headline: 'Tes dépenses dépassent actuellement tes revenus.',
        details: `Tu as encaissé ${fmtAmount(revReel)} mais engagé ${fmtAmount(totalExpenses)}.`,
        landingText: `Une révision de tes abonnements permettrait de résorber ce déficit de ${deficit}.`
      }
    }
  }

  // 3. NIVEAU EXCELLENT (Épargne >= 20%)
  if (savingsRate >= 20) {
    const epargne = fmtAmount(soldeFinMois)
    return {
      posture: 'EXCELLENT',
      humanIndicator: '🎉 Mois idéal',
      heroEmotionalPhrase: "Tu es parfaitement dans les temps.",
      statusPhrase: 'Excellente gestion',
      copilotMessage: `À ce rythme, tu termineras le mois avec environ ${epargne} d'avance. Belle maîtrise !`,
      action: { label: 'Mettre de côté', targetSection: 'objectifs' },
      resteAVivre,
      dailySafeSpend,
      daysRemaining,
      soldeFinMois,
      isConfigured: true,
      understanding: {
        headline: 'Tes dépenses essentielles sont parfaitement couvertes.',
        details: `Il te reste environ ${dailySafeSpend} € par jour jusqu'à la fin du mois.`,
        landingText: `Si tu gardes ce rythme, tu termineras le mois dans le vert avec environ ${epargne} d'avance.`
      }
    }
  }

  // 4. NIVEAU VIGILANCE (Charges > 50%)
  if (tauxCharges > 50) {
    return {
      posture: 'VIGILANCE',
      humanIndicator: '🟠 À surveiller',
      heroEmotionalPhrase: "Les prochains jours demanderont un peu plus d'attention.",
      statusPhrase: 'Charges importantes',
      copilotMessage: `Tes charges fixes absorbent ${Math.round(tauxCharges)}% de tes revenus. Revoir quelques abonnements te donnerait de l'air.`,
      action: { label: 'Optimiser mes charges', targetSection: 'parametres' },
      resteAVivre,
      dailySafeSpend,
      daysRemaining,
      soldeFinMois,
      isConfigured: true,
      understanding: {
        headline: 'Tes charges fixes prennent une part importante de ton budget.',
        details: `Sur ${fmtAmount(revReel)} reçus, ${fmtAmount(fixReel)} partent immédiatement en frais fixes.`,
        landingText: `Il te reste ${dailySafeSpend} € par jour pour finir sereinement le cycle.`
      }
    }
  }

  // 5. NIVEAU NORMAL (Budget sous contrôle)
  return {
    posture: 'NORMAL',
    humanIndicator: '🟢 Tout va bien aujourd\'hui',
    heroEmotionalPhrase: "Aujourd'hui tu peux vivre normalement.",
    statusPhrase: 'Budget sous contrôle',
    copilotMessage: `Tu peux sortir dîner ce soir sans mettre ton budget en danger.`,
    action: null,
    resteAVivre,
    dailySafeSpend,
    daysRemaining,
    soldeFinMois,
    isConfigured: true,
    understanding: {
      headline: 'Tes dépenses essentielles sont couvertes.',
      details: `Il te reste environ ${dailySafeSpend} € par jour jusqu'à la fin du mois.`,
      landingText: `Si tu gardes ce rythme, tu termineras le mois dans le vert avec environ ${fmtAmount(soldeFinMois)} d'avance.`
    }
  }
}
