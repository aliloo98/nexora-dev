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
  const trajectoryLabel = status === 'excellent' || status === 'healthy' ? 'Bonne trajectoire' : status === 'neutral' ? 'Sous surveillance' : 'Risque élevé'

  const currentSituation = rev <= 0
    ? 'Aucun revenu saisi pour ce cycle.'
    : savings < 0
      ? `Attention, ce cycle risque de se terminer avec un déficit estimé de ${Math.abs(savings)} €.`
      : savings <= 100
        ? `Votre marge de fin de cycle devient limitée avec seulement ${savings} € prévus.`
        : `Votre budget reste positif. Vous devriez terminer ce cycle avec environ ${savings} € disponibles.`

  const naturalAnalysis = rev <= 0
    ? 'Aucun revenu saisi pour ce cycle.'
    : savings < 0
      ? 'La situation est fragile ce mois-ci avec un risque de déficit si les dépenses ne sont pas réduites.'
      : chargesRate > 80
        ? 'Votre situation reste saine malgré une pression importante des dépenses fixes.'
        : vari > 0 && rev > 0 && Math.round((vari / rev) * 100) > 40
          ? 'La hausse des dépenses variables limite votre capacité d’épargne ce mois-ci.'
          : savingsRate >= 15
            ? 'Votre niveau d’épargne progresse correctement par rapport à vos dépenses.'
            : 'Votre budget reste équilibré mais les charges fixes réduisent votre capacité d’épargne ce mois-ci.'

  // Rules -> insights, alerts, recommendations
  const insights = []

  // Build prioritized alert objects so we can select the most important vigilance and related action
  const alertObjs = []
  const pushAlert = (category, text, label, priority = 10, recommendation = null) => {
    alertObjs.push({ category, text, label, priority, recommendation })
  }

  const recommendations = []

  if (rev <= 0) {
    insights.push('Aucun revenu saisi pour le mois.')
    recommendations.push('Saisissez vos revenus pour activer l’analyse.')
  } else {
    insights.push(`Revenus: ${rev} € — Taux d’épargne estimé ${savingsRate}%`)
    if (savings >= 0) insights.push(`Solde estimé positif: ${savings} €`)
    else insights.push(`Solde estimé négatif: ${savings} €`)

    // Negative balance - highest priority
    if (savings < 0) {
      pushAlert('deficit', `Attention, ce cycle risque de se terminer avec un déficit estimé de ${Math.abs(savings)} €.`, 'Solde prévisionnel négatif', 100, 'Réduisez les dépenses variables prioritaires avant la fin du cycle.')
    }

    // Variable expenses high
    if (vari > 0 && rev > 0 && Math.round((vari / rev) * 100) > 40) {
      pushAlert('variable_expenses', 'Dépenses variables élevées', 'Dépenses variables élevées', 50, 'Réduisez environ 50 € de dépenses variables pour soulager votre budget.')
    }

    // High charges
    if (chargesRate > 80) {
      pushAlert('charges', `Les charges représentent ${chargesRate}% des revenus.`, 'Taux de charges très élevé', 90, 'Réduire 50 € de charges fixes améliorerait immédiatement votre taux d’épargne.')
    }

    const targetEp = (typeof getVal === 'function' ? getVal('target_epargne') : null) || 0
    if (targetEp > 0) {
      if (savings >= targetEp) {
        insights.push('Objectif d’épargne atteint ou dépassé.')
      } else {
        insights.push(`Épargne: ${savings} € — Objectif: ${targetEp} €`)
        const pctEpargne = Math.round((savings / targetEp) * 100)
        if (pctEpargne < 50) pushAlert('savings_insufficient', `Épargne sous objectif: ${savings}€ sur ${targetEp}€ (${pctEpargne}%)`, 'Épargne sous objectif', 40, 'Augmentez vos versements d’environ 30 € pour rapprocher l’objectif.')
      }
    }

    if (primaryGoal) {
      const current = Number(primaryGoal.current || 0)
      const target = Number(primaryGoal.target || 0)
      const pct = target > 0 ? Math.round((current / target) * 100) : 0
      insights.push(`Objectif principal: ${primaryGoal.name || '—'} ${pct}% atteint`)
      if (pct >= 100) recommendations.push('Félicitations — objectif principal atteint.')
      else if (pct === 0) pushAlert('goal_zero', `Objectif principal "${primaryGoal.name || '—'}" à 0%`, 'Objectif principal à 0%', 80, `Commencez à alimenter l'objectif ${primaryGoal.name || '—'} avec une première contribution de 20 à 50 €.`)
    }
  }

  // Convert alertObjs into sorted alerts + collect recommendations prioritized
  // Sort by priority desc
  alertObjs.sort((a, b) => b.priority - a.priority)
  const alerts = []
  const alertTexts = []
  const seenCategories = new Set()
  const recCandidates = []
  alertObjs.forEach(a => {
    if (a.category && seenCategories.has(a.category)) return
    seenCategories.add(a.category)
    if (a.label) alerts.push(a.label)
    if (a.text) alertTexts.push(a.text)
    if (a.recommendation) recCandidates.push({ rec: a.recommendation, priority: a.priority })
  })

  // keep only the top 3 most important alerts
  const dedupedAlerts = alerts.slice(0, 3)
  const dedupedAlertTexts = alertTexts.slice(0, 3)

  // choose highest priority recommendation if any
  if (recCandidates.length > 0) {
    recCandidates.sort((x, y) => y.priority - x.priority)
    recommendations.push(recCandidates[0].rec)
  }

  // Deduplicate and limit lists
  const uniq = (arr) => Array.from(new Set((arr || []).filter(Boolean))).slice(0, 10)
  const finalInsights = uniq(insights).slice(0, 6)
  const finalAlerts = uniq(dedupedAlerts).slice(0, 3)
  const finalAlertTexts = uniq(dedupedAlertTexts).slice(0, 3)
  const finalRecommendations = uniq(recommendations).slice(0, 6)

  // Ensure minimal outputs for UX: at least one analysis, one vigilance, one action
  if (finalInsights.length === 0) finalInsights.push('Aucune anomalie majeure détectée pour ce cycle.')
  if (finalAlerts.length === 0) finalAlerts.push('Aucun point de vigilance majeur identifié.')
  if (finalRecommendations.length === 0) finalRecommendations.push('Continuez à mettre à jour vos paiements pour affiner l’analyse.')

  return {
    status,
    trajectoryLabel,
    currentSituation,
    naturalAnalysis,
    score: scoreObj.score || 0,
    scoreLabel: scoreObj.label || '',
    insights: finalInsights,
    alerts: finalAlerts,
    alertDisplay: finalAlertTexts,
    recommendations: finalRecommendations,
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
