/**
 * Opportunity Engine - Moteur de Détection Automatique d'Opportunités
 * Identifie les gains faciles, abonnements superflus et optimisations prioritaires.
 */

export function detectOpportunities(metrics = {}, billSchedules = [], goals = []) {
  const opportunities = []
  const revReel = Number(metrics.revReel || 0)
  const fixReel = Number(metrics.fixReel || 0)
  const varReel = Number(metrics.varReel || 0)

  // 1. Détection des abonnements superflus / récurrents de faible montant
  if (Array.isArray(billSchedules) && billSchedules.length > 0) {
    const smallBills = billSchedules.filter(b => Number(b.amount || 0) > 0 && Number(b.amount || 0) <= 25)
    if (smallBills.length >= 2) {
      const sumGain = smallBills.reduce((acc, b) => acc + Number(b.amount || 0), 0)
      opportunities.push({
        id: 'opp_unused_subs',
        title: 'Optimisation des micro-abonnements',
        description: `Tu as ${smallBills.length} abonnements récurrents de moins de 25 €. En annuler un libérerait une marge immédiate.`,
        estimatedGain: Math.round(sumGain * 12), // Gain annuel
        difficulty: 'EASY',
        timeRequired: '3 min',
        confidence: 90,
        priority: 85
      })
    }
  }

  // 2. Détection de catégorie variable trop élevée
  if (revReel > 0 && varReel > revReel * 0.3) {
    const targetVar = revReel * 0.25
    const potentialSaving = varReel - targetVar
    opportunities.push({
      id: 'opp_variable_saving',
      title: 'Réduction des dépenses quotidiennes',
      description: 'Tes dépenses variables dépassent 30% de tes revenus. Réduire de 10% les petits achats rééquilibrerait ton mois.',
      estimatedGain: Math.round(potentialSaving),
      difficulty: 'EASY',
      timeRequired: '2 min',
      confidence: 88,
      priority: 80
    })
  }

  // 3. Objectif d'épargne presque atteignable
  if (Array.isArray(goals) && goals.length > 0) {
    const nearGoal = goals.find(g => {
      const target = Number(g.targetAmount || g.target || 0)
      const current = Number(g.currentAmount || g.current || 0)
      return target > 0 && (current / target) >= 0.75 && (current / target) < 1.0
    })
    if (nearGoal) {
      const remaining = Number(nearGoal.targetAmount || nearGoal.target || 0) - Number(nearGoal.currentAmount || nearGoal.current || 0)
      opportunities.push({
        id: 'opp_reach_goal',
        title: `Finaliser l'objectif ${nearGoal.title || nearGoal.name || 'Projet'}`,
        description: `Il ne manque plus que ${Math.round(remaining)} € pour valider cet objectif.`,
        estimatedGain: Math.round(remaining),
        difficulty: 'EASY',
        timeRequired: '1 min',
        confidence: 95,
        priority: 90
      })
    }
  }

  return opportunities.sort((a, b) => b.priority - a.priority)
}
