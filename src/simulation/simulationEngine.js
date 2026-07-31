/**
 * Simulation Engine - Moteur de Simulation Financière
 * Évalue l'impact immédiat de modifications budgétaires sans impacter les données réelles.
 */

export function runSimulation(metrics = {}, scenario = {}, options = {}) {
  const revReel = Number(metrics.revReel || 0)
  const fixReel = Number(metrics.fixReel || 0)
  const varReel = Number(metrics.varReel || 0)
  const daysRemaining = Math.max(1, Number(options.daysRemaining) || 15)

  let simRev = revReel
  let simFix = fixReel
  let simVar = varReel
  let simSavings = Number(metrics.target_epargne || 0)

  if (scenario.salaryIncrease) simRev += Number(scenario.salaryIncrease)
  if (scenario.subscriptionRemoved) simFix -= Number(scenario.subscriptionRemoved)
  if (scenario.rentIncrease) simFix += Number(scenario.rentIncrease)
  if (scenario.extraSavings) simSavings += Number(scenario.extraSavings)
  if (scenario.debtPaidOff) simFix -= Number(scenario.debtPaidOff)

  simFix = Math.max(0, simFix)

  const newTotalExpenses = simFix + simVar
  const newSoldeFinMois = simRev - newTotalExpenses
  const newResteAVivre = Math.max(0, newSoldeFinMois)
  const newDailySafeSpend = daysRemaining > 0 ? Math.round(newResteAVivre / daysRemaining) : 0

  // Calcul du score financier (0 à 100)
  const savingsRate = simRev > 0 ? (newSoldeFinMois / simRev) * 100 : 0
  const tauxCharges = simRev > 0 ? (simFix / simRev) * 100 : 0

  let score = 50
  if (newSoldeFinMois < 0) {
    score = Math.max(0, Math.round(50 + (newSoldeFinMois / 20)))
  } else {
    score = Math.min(100, Math.round(50 + (savingsRate * 1.5) - (tauxCharges > 50 ? (tauxCharges - 50) : 0)))
  }

  return {
    scenario,
    newRevReel: simRev,
    newFixReel: simFix,
    newSoldeFinMois: Math.round(newSoldeFinMois),
    newResteAVivre: Math.round(newResteAVivre),
    newDailySafeSpend,
    newFinancialScore: Math.max(0, Math.min(100, score)),
    deltaSolde: Math.round(newSoldeFinMois - (revReel - fixReel - varReel))
  }
}
