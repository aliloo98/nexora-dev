/**
 * Moteur du Copilote Intelligent Nexora - Version V2
 * Formule des recommandations personnalisées et naturelles,
 * avec gestion stricte de l'état initial (Zéro donnée).
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

  // Date et jours restants dans le mois
  const now = new Date()
  const currentDay = now.getDate()
  const totalDaysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
  const daysRemaining = Math.max(1, totalDaysInMonth - currentDay + 1)

  // 1. ÉTAT ZÉRO / DONNÉES NON RENSEIGNÉES
  if (revReel === 0 && totalExpenses === 0) {
    return {
      posture: 'INITIAL',
      postureLabel: 'Bienvenue',
      statusPhrase: 'En attente de budget',
      copilotMessage: 'Saisis tes premiers revenus et charges pour débloquer tes conseils personnalisés.',
      action: { label: 'Configurer mon budget', targetSection: 'plan' },
      resteAVivre: 0,
      dailySafeSpend: 0,
      daysRemaining,
      soldeFinMois: 0,
      isConfigured: false
    }
  }

  // Calculs clés
  const resteAVivre = Math.max(0, soldeFinMois)
  const dailySafeSpend = Math.round(resteAVivre / daysRemaining)
  const savingsRate = revReel > 0 ? (soldeFinMois / revReel) * 100 : 0
  const tauxCharges = revReel > 0 ? (fixReel / revReel) * 100 : 0

  // 2. DÉFICIT
  if (soldeFinMois < 0) {
    const deficit = fmtAmount(Math.abs(soldeFinMois))
    return {
      posture: 'ALERTE',
      postureLabel: 'Vigilance',
      statusPhrase: 'Alerte déficit',
      copilotMessage: `Attention : tes dépenses dépassent tes revenus de ${deficit}. Ajuste tes dépenses variables pour garder le contrôle.`,
      action: { label: 'Ajuster les dépenses', targetSection: 'parametres' },
      resteAVivre: 0,
      dailySafeSpend: 0,
      daysRemaining,
      soldeFinMois,
      isConfigured: true
    }
  }

  // 3. EXCELLENTE ÉPARGNE (>= 20%)
  if (savingsRate >= 20) {
    const epargne = fmtAmount(soldeFinMois)
    return {
      posture: 'FÉLICITATIONS',
      postureLabel: 'Excellence',
      statusPhrase: 'Situation excellente',
      copilotMessage: `À ce rythme, tu termineras le mois avec environ ${epargne} d'avance. Excellente gestion !`,
      action: { label: 'Placer en épargne', targetSection: 'objectifs' },
      resteAVivre,
      dailySafeSpend,
      daysRemaining,
      soldeFinMois,
      isConfigured: true
    }
  }

  // 4. BUDGET SOUS CONTRÔLE
  if (savingsRate >= 10 && daysRemaining > 3) {
    return {
      posture: 'RASSURANT',
      postureLabel: 'Sérénité',
      statusPhrase: 'Budget sous contrôle',
      copilotMessage: `Tu peux dépenser environ ${dailySafeSpend} € aujourd'hui sans mettre ton mois en danger.`,
      action: { label: 'Consulter le plan', targetSection: 'plan' },
      resteAVivre,
      dailySafeSpend,
      daysRemaining,
      soldeFinMois,
      isConfigured: true
    }
  }

  // 5. CHARGES FIXES ÉLEVÉES
  if (tauxCharges > 50) {
    return {
      posture: 'OPTIMISATION',
      postureLabel: 'Optimisation',
      statusPhrase: 'Charges à surveiller',
      copilotMessage: `Tes charges fixes absorbent ${Math.round(tauxCharges)}% de tes revenus. Une révision de tes abonnements libérerait de la marge.`,
      action: { label: 'Revoir mes charges', targetSection: 'parametres' },
      resteAVivre,
      dailySafeSpend,
      daysRemaining,
      soldeFinMois,
      isConfigured: true
    }
  }

  // 6. FIN DE CYCLE CALME
  return {
    posture: 'MOTIVATION',
    postureLabel: 'En avant',
    statusPhrase: 'Objectif en bonne voie',
    copilotMessage: `Cette semaine est calme, aucune dépense imprévue n'arrive. Garde le cap !`,
    action: { label: 'Voir le détail', targetSection: 'plan' },
    resteAVivre,
    dailySafeSpend,
    daysRemaining,
    soldeFinMois,
    isConfigured: true
  }
}
