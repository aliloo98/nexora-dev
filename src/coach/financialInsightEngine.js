/**
 * Financial Insight Engine - Moteur d'analyses et de recommandations proactives
 * Source de vérité unique pour les déductions financières, comparaisons de mois et conseils.
 */

const fmt = (val) => `${Math.round(Number(val) || 0).toLocaleString('fr-FR')} €`

export function generateFinancialInsights(metrics = {}, history = [], goals = []) {
  const insights = []

  const revReel = Number(metrics.revReel || 0)
  const fixReel = Number(metrics.fixReel || 0)
  const varReel = Number(metrics.varReel || 0)
  const totalExpenses = fixReel + varReel
  const soldeFinMois = revReel - totalExpenses
  const savingsRate = revReel > 0 ? (soldeFinMois / revReel) * 100 : 0
  const tauxCharges = revReel > 0 ? (fixReel / revReel) * 100 : 0

  // Récupération des données du mois précédent
  const prevMonth = Array.isArray(history) && history.length > 0 ? history[history.length - 1] : null
  const prevExpenses = prevMonth ? Number(prevMonth.fixReel || 0) + Number(prevMonth.varReel || 0) : null

  // 1. DÉFICIT CRITIQUE (Priorité 100)
  if (soldeFinMois < 0) {
    const deficit = Math.abs(soldeFinMois)
    insights.push({
      id: 'insight_deficit',
      type: 'CRITICAL',
      priority: 100,
      confidence: 95,
      humanIndicator: '🔴 Action recommandée',
      headline: 'Tes dépenses dépassent tes revenus ce mois-ci.',
      message: `Attention : tes charges dépassent tes revenus de ${fmt(deficit)}. Réduis tes dépenses variables pour rééquilibrer ton mois.`,
      action: { label: 'Ajuster mes charges', targetSection: 'parametres' }
    })
  }

  // 2. PROGRESSION PAR RAPPORT AU MOIS PRÉCÉDENT (Priorité 90)
  if (prevExpenses !== null && prevExpenses > 0 && totalExpenses < prevExpenses) {
    const diffPct = Math.round(((prevExpenses - totalExpenses) / prevExpenses) * 100)
    if (diffPct >= 5) {
      insights.push({
        id: 'insight_spending_reduced',
        type: 'PROGRESS',
        priority: 90,
        confidence: 90,
        humanIndicator: '📉 Belle progression',
        headline: `Tu dépenses ${diffPct}% de moins que le mois dernier.`,
        message: `Tes dépenses ont diminué de ${fmt(prevExpenses - totalExpenses)}. Bravo pour cette gestion exemplaire !`,
        action: { label: 'Voir mes économies', targetSection: 'objectifs' }
      })
    }
  }

  // 3. OBJECTIF D'ÉPARGNE ATTEINT / PRESQUE ATTEINT (Priorité 85)
  if (Array.isArray(goals) && goals.length > 0) {
    const primaryGoal = goals[0]
    const target = Number(primaryGoal.targetAmount || primaryGoal.target || 0)
    const current = Number(primaryGoal.currentAmount || primaryGoal.current || 0)
    if (target > 0) {
      const pct = Math.round((current / target) * 100)
      if (pct >= 100) {
        insights.push({
          id: 'insight_goal_reached',
          type: 'SUCCESS',
          priority: 85,
          confidence: 98,
          humanIndicator: '🎯 Objectif accompli',
          headline: `Bravo ! Tu as atteint ton objectif ${primaryGoal.title || primaryGoal.name || 'Épargne'}.`,
          message: `Tu as constitué ton enveloppe de ${fmt(target)}. C'est une excellente habitude financière.`,
          action: { label: 'Fêter mon projet', targetSection: 'objectifs' }
        })
      } else if (pct >= 80) {
        insights.push({
          id: 'insight_goal_near',
          type: 'MOTIVATION',
          priority: 80,
          confidence: 85,
          humanIndicator: '🔥 Tout proche du but',
          headline: `Tu as réalisé ${pct}% de ton objectif d'épargne.`,
          message: `Il ne te manque plus que ${fmt(target - current)} pour concrétiser ton projet.`,
          action: { label: 'Finaliser l\'épargne', targetSection: 'objectifs' }
        })
      }
    }
  }

  // 4. CHARGES FIXES ÉLEVÉES (Priorité 75)
  if (tauxCharges > 50 && soldeFinMois >= 0) {
    insights.push({
      id: 'insight_high_fixed_charges',
      type: 'WARNING',
      priority: 75,
      confidence: 85,
      humanIndicator: '🟠 À surveiller',
      headline: 'Tes frais fixes absorbent une grande part de ton budget.',
      message: `Tes abonnements et charges fixes représentent ${Math.round(tauxCharges)}% de tes revenus. Une révision te donnerait de l'air.`,
      action: { label: 'Optimiser abonnements', targetSection: 'parametres' }
    })
  }

  // 5. UTILISATEUR PRUDENT / EXCELLENTE GESTION (Priorité 70)
  if (savingsRate >= 20 && soldeFinMois > 0) {
    insights.push({
      id: 'insight_prudent_saver',
      type: 'SUCCESS',
      priority: 70,
      confidence: 92,
      humanIndicator: '🎉 Mois idéal',
      headline: 'Tu mets une part importante de ton argent de côté.',
      message: `À ce rythme, tu termineras le mois avec environ ${fmt(soldeFinMois)} d'avance. Excellente régularité !`,
      action: { label: 'Mettre de côté', targetSection: 'objectifs' }
    })
  }

  // 6. UTILISATEUR ÉQUILIBRÉ / SANS ALERTE (Priorité 60)
  if (insights.length === 0) {
    insights.push({
      id: 'insight_stable_balance',
      type: 'NORMAL',
      priority: 60,
      confidence: 75,
      humanIndicator: '🟢 Tout va bien aujourd\'hui',
      headline: 'Tes dépenses restent parfaitement raisonnables.',
      message: 'Tes charges fixes et tes dépenses variables sont équilibrées. Tu peux continuer sereinement.',
      action: null
    })
  }

  // Trier par priorité et retourner la liste filtrée (confiance >= 60)
  return insights
    .filter(item => item.confidence >= 60)
    .sort((a, b) => b.priority - a.priority)
}

/**
 * Retourne la recommandation prioritaire unique pour le Copilote.
 */
export function getTopFinancialInsight(metrics = {}, history = [], goals = []) {
  const insights = generateFinancialInsights(metrics, history, goals)
  return insights.length > 0 ? insights[0] : null
}
