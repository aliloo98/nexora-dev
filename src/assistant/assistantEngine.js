// Assistant Nexora - lightweight rules-based engine
// No external APIs. Uses existing app services and DOM helpers.

const clamp = (n, a = 0, b = 100) => Math.max(a, Math.min(b, n))

async function analyzeBudget(monthKey) {
  const month = monthKey || (typeof getMonth === 'function' ? getMonth() : null)

  // Gather metrics using existing helpers when available
  let metrics = null
  if (typeof getMonthMetrics === 'function') {
    metrics = getMonthMetrics(month, { fromDom: true })
  } else if (window.MonthlyBudgetStateService && window.MonthlyBudgetStateService.getMonthlyBudgetState) {
    const state = await window.MonthlyBudgetStateService.getMonthlyBudgetState(month)
    const data = state?.data || {}
    const income = typeof getAmountFromData === 'function' ? getAmountFromData(data, 'rev_ali') + getAmountFromData(data, 'rev_megane') + getAmountFromData(data, 'rev_excep') : 0
    // best-effort fallback: sum known keys
    metrics = { month, income, fixed: 0, variable: 0, expenses: 0, savings: 0, savingsRate: 0 }
  } else {
    metrics = { month, income: 0, fixed: 0, variable: 0, expenses: 0, savings: 0, savingsRate: 0 }
  }

  // Derive additional values
  const rev = Number(metrics.income || 0)
  const fixes = Number(metrics.fixed || 0)
  const vari = Number(metrics.variable || 0)
  const totalDep = Number(metrics.expenses || fixes + vari)
  const savings = Number(metrics.savings || rev - totalDep)
  const savingsRate = rev > 0 ? Math.round((savings / rev) * 100) : 0
  const chargesRate = rev > 0 ? Math.round((totalDep / rev) * 100) : 0

  // Goals: prefer any runtime-provided GoalsService (window or globalThis). Avoid static imports so tests can mock easily.
  const G = (typeof window !== 'undefined' && window.GoalsService) ? window.GoalsService : (typeof globalThis !== 'undefined' ? globalThis.GoalsService : null)
  const primaryGoal = G && typeof G.getPrimaryGoal === 'function' ? await G.getPrimaryGoal() : null
  const goalsSummary = G && typeof G.getSummary === 'function' ? await G.getSummary() : null

  // Score — reuse existing logic if available
  let scoreObj = { score: 0, label: 'Aucune donnée' }
  if (typeof getFinancialScore === 'function') {
    scoreObj = getFinancialScore(metrics)
  } else {
    // Simple score composition
    let base = 50
    if (rev <= 0) base = 0
    base += clamp(savingsRate, -50, 50) * 0.8
    base -= Math.max(0, chargesRate - 80) * 0.5
    base += savings >= 0 ? 10 : -20
    const score = Math.round(clamp(base, 0, 100))
    const label = score >= 90 ? 'Excellent' : score >= 75 ? 'Bon' : score >= 50 ? 'Moyen' : 'Critique'
    scoreObj = { score, label }
  }

  // Status from score
  const status = scoreObj.score >= 90 ? 'excellent' : scoreObj.score >= 75 ? 'healthy' : scoreObj.score >= 50 ? 'neutral' : 'critical'

  // Rules -> insights, alerts, recommendations
  const insights = []
  const alerts = []
  const recommendations = []

  if (rev <= 0) {
    insights.push('Aucun revenu saisi pour le mois.')
    recommendations.push('Saisissez vos revenus pour activer l’analyse.')
  } else {
    insights.push(`Revenus: ${rev} € — Taux d’épargne estimé ${savingsRate}%`)
    if (savings >= 0) insights.push(`Solde estimé positif: ${savings} €`) 
    else insights.push(`Solde estimé négatif: ${savings} €`)

    if (savings < 0) {
      alerts.push('Solde prévisionnel négatif')
      recommendations.push('Réduire les dépenses variables ou augmenter les revenus.')
    }

    if (vari > 0 && rev > 0 && Math.round((vari / rev) * 100) > 40) {
      alerts.push('Dépenses variables élevées')
      recommendations.push('Limitez les dépenses discrétionnaires (loisirs, achats).')
    }

    if (chargesRate > 80) {
      alerts.push('Taux de charges très élevé')
      recommendations.push('Examinez les charges fixes (abonnements, assurances).')
    }

    const targetEp = (typeof getVal === 'function' ? getVal('target_epargne') : null) || 0
    if (targetEp > 0) {
      if (savings >= targetEp) {
        insights.push('Objectif d’épargne atteint ou dépassé.')
      } else {
        insights.push(`Épargne: ${savings} € — Objectif: ${targetEp} €`)
        const pct = Math.round((savings / targetEp) * 100)
        if (pct < 50) recommendations.push('Augmentez l’effort d’épargne mensuel pour atteindre l’objectif.')
      }
    }

    if (primaryGoal) {
      const current = Number(primaryGoal.current || 0)
      const target = Number(primaryGoal.target || 0)
      const pct = target > 0 ? Math.round((current / target) * 100) : 0
      insights.push(`Objectif principal: ${primaryGoal.name || '—'} ${pct}% atteint`)
      if (pct >= 100) recommendations.push('Félicitations — objectif principal atteint.')
      else if (pct === 0) recommendations.push('Commencez à contribuer régulièrement à votre objectif principal.')
    }
  }

  // Deduplicate and limit lists
  const uniq = (arr) => Array.from(new Set((arr || []).filter(Boolean))).slice(0, 10)

  return {
    status,
    score: scoreObj.score || 0,
    scoreLabel: scoreObj.label || '',
    insights: uniq(insights).slice(0, 6),
    alerts: uniq(alerts).slice(0, 6),
    recommendations: uniq(recommendations).slice(0, 6),
    metadata: {
      month: month || null,
      chargesRate,
      savingsRate,
      rev,
      fixes,
      vari,
      savings,
      primaryGoal: primaryGoal || null,
      goalsSummary: goalsSummary || null
    }
  }
}

export { analyzeBudget }
