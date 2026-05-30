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
  const totalCharges = Number(metrics.expenses || fixes + vari)
  const savings = Number(metrics.savings || rev - totalCharges)
  const fixedRate = rev > 0 ? Math.round((fixes / rev) * 100) : 0
  const variableRate = rev > 0 ? Math.round((vari / rev) * 100) : 0
  const totalChargesRate = rev > 0 ? Math.round((totalCharges / rev) * 100) : 0
  const savingsRate = rev > 0 ? Math.round((savings / rev) * 100) : 0
  const chargesRate = totalChargesRate

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

  const formatMonthYear = (date) => date.toLocaleString('fr-FR', { month: 'long', year: 'numeric' })
  const addMonths = (date, months) => {
    const result = new Date(date)
    result.setMonth(result.getMonth() + months)
    return result
  }

  // Status from score
  const status = scoreObj.score >= 90 ? 'excellent' : scoreObj.score >= 75 ? 'healthy' : scoreObj.score >= 60 ? 'attention' : 'critical'
  const trajectoryLabel = scoreObj.score >= 90
    ? '🟢 Excellente trajectoire'
    : scoreObj.score >= 75
      ? '🟢 Situation saine'
      : scoreObj.score >= 60
        ? '🟡 Sous surveillance'
        : scoreObj.score >= 40
          ? '🟠 Attention budget'
          : '🔴 Situation critique'

  const currentSituation = rev <= 0
    ? 'Aucun revenu saisi pour ce cycle.'
    : savings < 0
      ? `Attention, ce cycle risque de se terminer avec un déficit estimé de ${Math.abs(savings)} €.`
      : savings <= 100
        ? `Votre marge de fin de cycle devient limitée avec seulement ${savings} € prévus.`
        : `Votre budget reste positif. Vous devriez terminer ce cycle avec environ ${savings} € disponibles.`

  const mainAnalysis = rev <= 0
    ? 'Aucun revenu saisi pour ce cycle.'
    : savings < 0
      ? `Votre budget est en déficit de ${Math.abs(savings)} €, principalement sous l'effet des charges actuelles.`
      : chargesRate > 80
        ? `Votre budget devrait terminer le cycle avec ${savings} € disponibles, mais les charges totales représentent actuellement ${chargesRate}% des revenus. Les charges fixes pèsent ${fixedRate}% et les dépenses variables ${variableRate}% des revenus.`
        : vari > 0 && rev > 0 && variableRate > 40
          ? `Votre budget reste positif, mais la part des dépenses variables est élevée et réduit votre capacité à renforcer votre épargne.`
          : savingsRate >= 15
            ? `Votre budget reste positif et votre taux d’épargne progresse correctement par rapport à votre niveau de dépenses.`
            : `Votre budget reste équilibré, mais la pression des charges limite votre marge d’épargne.`

  const budgetObservations = []
  if (rev > 0 && fixes > 0) {
    if (fixedRate > 30) {
      budgetObservations.push(`Les charges fixes représentent ${fixedRate}% des revenus.`)
    }
  }
  if (rev > 0 && vari > 0) {
    if (variableRate <= 25) {
      budgetObservations.push('Les dépenses variables sont maîtrisées.')
    } else if (variableRate > 40) {
      budgetObservations.push('Les dépenses variables sont élevées et pèsent sur votre capacité d’épargne.')
    }
  }
  if (rev > 0 && totalCharges > 0 && totalChargesRate > 70) {
    budgetObservations.push(`Les charges totales atteignent ${totalChargesRate}% des revenus.`)
  }

  const goalInsights = []
  const goals = Array.isArray(goalsSummary?.goals) ? goalsSummary.goals : []
  if (primaryGoal && Number(primaryGoal.current || 0) === 0) {
    goalInsights.push('L’objectif principal n’est pas encore alimenté.')
  }
  goals.forEach(goal => {
    if (goal && goal.targetDate) {
      const targetDate = new Date(goal.targetDate)
      const now = new Date()
      const diffMonths = Math.ceil((targetDate - now) / (1000 * 60 * 60 * 24 * 30))
      if (diffMonths > 0 && diffMonths <= 4 && /crédit|credit|loyer|logement/i.test(goal.name || '')) {
        goalInsights.push('Le crédit lié à cet objectif sera bientôt terminé.')
      }
    }
  })

  const analysisExtras = [...budgetObservations, ...goalInsights].slice(0, 3)
  const naturalAnalysis = [mainAnalysis, ...analysisExtras].join('\n\n')

  const monthlyContribution = Math.max(0, Math.round(savings))
  const goalProjections = goals
    .filter(goal => goal && Number(goal.target || 0) > Number(goal.current || 0))
    .map(goal => {
      const remaining = Math.max(0, Number(goal.target || 0) - Number(goal.current || 0))
      const currentMonths = monthlyContribution > 0 ? Math.ceil(remaining / monthlyContribution) : null
      const months50 = monthlyContribution + 50 > 0 ? Math.ceil(remaining / (monthlyContribution + 50)) : null
      const months100 = monthlyContribution + 100 > 0 ? Math.ceil(remaining / (monthlyContribution + 100)) : null
      const eta = currentMonths !== null ? formatMonthYear(addMonths(new Date(), currentMonths)) : null
      return {
        name: goal.name || 'Objectif',
        remaining,
        currentMonths,
        months50,
        months100,
        eta
      }
    })

  const goalProjectionText = goalProjections.length > 0
    ? goalProjections.map(proj => {
      const current = proj.currentMonths !== null ? `${proj.currentMonths} mois` : 'sans rythme actuel'
      const plus50 = proj.months50 !== null ? `${proj.months50} mois` : '–'
      const plus100 = proj.months100 !== null ? `${proj.months100} mois` : '–'
      return `${proj.name} — rythme actuel : ${current}, +50 €/mois : ${plus50}, +100 €/mois : ${plus100}.`
    }).join('\n')
    : null

  const timelineEntries = goalProjections
    .filter(p => p.eta)
    .sort((a, b) => a.currentMonths - b.currentMonths)
    .slice(0, 3)
    .map(p => `${p.eta} : ${p.name} prévu`)

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
      pushAlert('charges', `Les charges totales représentent ${chargesRate}% des revenus.`, 'Taux de charges très élevé', 90, 'Réduire 50 € de charges fixes améliorerait immédiatement votre taux d’épargne.')
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
    goalProjectionText: goalProjectionText || null,
    goalProjections: goalProjections || [],
    timeline: timelineEntries,
    metadata: {
      month: month || null,
      chargesRate,
      totalChargesRate,
      fixedRate,
      variableRate,
      totalCharges,
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
