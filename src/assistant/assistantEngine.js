// Assistant Nexora - lightweight rules-based engine
// No external APIs. Uses existing app services and DOM helpers.

const clamp = (n, a = 0, b = 100) => Math.max(a, Math.min(b, n))

async function analyzeBudget(monthKey) {
  try {
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
  const goals = Array.isArray(goalsSummary?.goals) ? goalsSummary.goals : []

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

  const normalizeLabel = (text) => String(text || '').toLowerCase()
  const subscriptionKeywords = ['abonnement', 'stream', 'box', 'téléphone', 'internet', 'netflix', 'spotify', 'prime', 'canal', 'sfr', 'orange', 'free', 'bouygues', 'deezer', 'spotify', 'disney']
  const detectSubscriptions = () => {
    try {
      if (typeof getBudgetKeysByType !== 'function' || typeof getBudgetLabel !== 'function' || typeof getVal !== 'function') return []
      const fixedKeys = getBudgetKeysByType('fixed_expense') || []
      return fixedKeys
        .map(key => ({ key, label: getBudgetLabel(key), amount: Number(getVal(key) || 0) }))
        .filter(item => item.amount > 0 && subscriptionKeywords.some(keyword => normalizeLabel(item.label).includes(keyword)))
    } catch {
      return []
    }
  }

  const sampleMonths = [addMonths(new Date(), -1), addMonths(new Date(), -2), addMonths(new Date(), -3)]
  const sampledHistorical = []
  let previousMonthMetrics = null
  try {
    for (const d of sampleMonths) {
      if (typeof getMonthMetrics === 'function') {
        const m = getMonthMetrics(formatMonthYear(d), { fromDom: false })
        if (m && typeof m.income === 'number') {
          sampledHistorical.push(m)
          if (!previousMonthMetrics) previousMonthMetrics = m
        }
      }
    }
  } catch (e) {
    // ignore sampling errors
  }

  const histCount = sampledHistorical.length
  const histAvgIncome = histCount > 0 ? sampledHistorical.reduce((acc, item) => acc + Number(item.income || 0), 0) / histCount : rev
  const histAvgExpenses = histCount > 0 ? sampledHistorical.reduce((acc, item) => acc + Number(item.expenses || 0), 0) / histCount : totalCharges
  const incomeTrendPct = histAvgIncome > 0 ? Math.round(((rev - histAvgIncome) / histAvgIncome) * 100) : 0
  const expenseInflationRate = histAvgExpenses > 0 ? Math.round(((totalCharges - histAvgExpenses) / histAvgExpenses) * 100) : 0
  const historicalSavings = histCount > 0 ? sampledHistorical.reduce((acc, item) => acc + Number(item.savings || 0), 0) / histCount : savings

  const budgetInflection = expenseInflationRate >= 10

  const subscriptionItems = detectSubscriptions()
  const subscriptionCount = subscriptionItems.length
  const subscriptionInsights = subscriptionItems.map(item => `${item.label || item.key} ${item.amount} €`).join(', ')
  const subscriptionFlag = subscriptionCount > 0

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

    // Observations with anti-duplication flags to avoid repeating the same
    // indicator multiple times in the diagnostics (mainAnalysis + observations)
    const budgetObservations = []
    const seenIndicators = { fixed: false, variable: false, total: false, savings: false, goal: false }

    // mark indicators already described in mainAnalysis to avoid repetition
    const ma = String(mainAnalysis || '').toLowerCase()
    // Only mark an indicator as seen if the mainAnalysis uses an explicit
    // "représentent" phrasing for that indicator — otherwise keep the
    // observation line so tests and UX have a clear, uniform sentence.
    // For total charges, only treat as seen when mainAnalysis already uses the
    // exact 'atteignent' phrasing; otherwise keep the uniform observation line.
    if (ma.includes('charges totales atteignent') || ma.includes('les charges totales atteignent')) seenIndicators.total = true
    if (ma.includes('charges fixes représentent') || ma.includes('les charges fixes représentent')) seenIndicators.fixed = ma.includes('charges fixes représentent') || ma.includes('les charges fixes représentent')
    if (ma.includes('dépenses variables représentent') || ma.includes('les dépenses variables représentent')) seenIndicators.variable = ma.includes('dépenses variables représentent') || ma.includes('les dépenses variables représentent')
    if (ma.includes('épargne') || ma.includes("taux d'épargne") || ma.includes('taux d epargne')) seenIndicators.savings = true
    if (ma.includes('objectif principal') || ma.includes('objectif')) seenIndicators.goal = true

    if (rev > 0 && fixes > 0 && !seenIndicators.fixed) {
      if (fixedRate > 30) {
        budgetObservations.push(`Les charges fixes représentent ${fixedRate}% des revenus.`)
        seenIndicators.fixed = true
      }
    }
    if (rev > 0 && vari > 0 && !seenIndicators.variable) {
      if (variableRate <= 25) {
        budgetObservations.push('Les dépenses variables sont maîtrisées.')
        seenIndicators.variable = true
      } else if (variableRate > 40) {
        budgetObservations.push('Les dépenses variables sont élevées et pèsent sur votre capacité d’épargne.')
        seenIndicators.variable = true
      }
    }
    if (rev > 0 && totalCharges > 0 && totalChargesRate > 70 && !seenIndicators.total) {
      budgetObservations.push(`Les charges totales atteignent ${totalChargesRate}% des revenus.`)
      seenIndicators.total = true
    }

  const goalInsights = []
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

  const forecastHorizons = [1, 3, 6, 12]
  const budgetForecasts = forecastHorizons.map(months => ({
    months,
    label: months === 1 ? '1 mois' : `${months} mois`,
    cumulativeSavings: Math.round(monthlyContribution * months),
    cumulativeExpenses: Math.round(totalCharges * months),
    projectedBalance: Math.round(savings + monthlyContribution * months)
  }))

  const goalForecasts = goals
    .filter(goal => goal && Number(goal.target || 0) > Number(goal.current || 0))
    .map(goal => {
      const current = Number(goal.current || 0)
      const target = Number(goal.target || 0)
      const remaining = Math.max(0, target - current)
      const estimatedMonths = monthlyContribution > 0 ? Math.ceil(remaining / monthlyContribution) : null
      const estimatedDate = estimatedMonths !== null ? formatMonthYear(addMonths(new Date(), estimatedMonths)) : null
      const horizons = forecastHorizons.map(months => {
        const projectedCurrent = Math.min(target, current + monthlyContribution * months)
        const progressPct = target > 0 ? Math.round(Math.min(100, (projectedCurrent / target) * 100)) : 0
        return {
          months,
          label: months === 1 ? '1 mois' : `${months} mois`,
          projectedCurrent,
          progressPct,
          reached: projectedCurrent >= target,
          dateAttained: projectedCurrent >= target ? estimatedDate : null
        }
      })
      return {
        name: goal.name || 'Objectif',
        current,
        target,
        remaining,
        estimatedMonths,
        estimatedDate,
        horizons
      }
    })

  // --- Phase 4 : Analyse avancée + score breakdown
  // Basic historical sampling (last 3 months) when available to detect instability
  const historySampleMonths = [addMonths(new Date(), -1), addMonths(new Date(), -2), addMonths(new Date(), -3)]
  const incomes = []
  try {
    for (const d of historySampleMonths) {
      if (typeof getMonthMetrics === 'function') {
        const m = getMonthMetrics(formatMonthYear(d), { fromDom: true })
        incomes.push(Number(m?.income || 0))
      }
    }
  } catch (e) {
    // ignore sampling errors
  }

  const avgIncome = incomes.length > 0 ? incomes.reduce((a, b) => a + b, 0) / incomes.length : rev
  const incomeVariancePct = avgIncome > 0 ? Math.round((Math.abs(rev - avgIncome) / avgIncome) * 100) : 0
  const stabilityScore = clamp(100 - incomeVariancePct, 0, 100)
  const expenseControlScore = clamp(100 - variableRate - Math.max(0, totalChargesRate - 70), 0, 100)
  const totalRemainingGoals = goals.reduce((sum, goal) => sum + Math.max(0, Number(goal.target || 0) - Number(goal.current || 0)), 0)
  const goalProgressScore = goals.length > 0 ? clamp(100 - Math.round((totalRemainingGoals / Math.max(1, rev)) * 10), 0, 100) : 100

  // monthsAtRisk: first horizon where projectedBalance < 0
  let monthsAtRisk = null
  for (const f of budgetForecasts) {
    if (typeof f.projectedBalance === 'number' && f.projectedBalance < 0) { monthsAtRisk = f.months; break }
  }

  // abnormal expenses detection (variable spending spike)
  const abnormalExpenses = []
  if (avgIncome > 0 && vari > 0) {
    const typicalVariablePct = avgIncome > 0 ? Math.round((vari / Math.max(1, avgIncome)) * 100) : variableRate
    if (variableRate > Math.max(30, typicalVariablePct * 1.5)) {
      abnormalExpenses.push('Dépenses variables anormalement élevées ce mois-ci.')
    }
  }

  const irregularRevenue = incomeVariancePct > 30

  const unrealisticGoals = goalForecasts.filter(g => g.estimatedMonths !== null && g.estimatedMonths > 60).map(g => g.name)

  const peaks = []
  if (vari > rev * 0.5) peaks.push('Pic important de dépenses variables détecté.')

  // Score breakdown (simple heuristics)
  const scoreBreakdown = {
    savingsComponent: clamp(savingsRate, 0, 100),
    stabilityComponent: clamp(stabilityScore, 0, 100),
    goalsComponent: clamp(goalProgressScore, 0, 100),
    expenseControlComponent: clamp(expenseControlScore, 0, 100)
  }

  const healthFactors = []
  if (incomeTrendPct > 5) healthFactors.push('Revenus en hausse')
  if (incomeTrendPct < -5) healthFactors.push('Revenus en baisse')
  if (budgetInflection) healthFactors.push('Inflation du budget')
  if (subscriptionFlag) healthFactors.push('Abonnements actifs')
  if (irregularRevenue) healthFactors.push('Revenus instables')

  const advancedFinancialInsights = [
    `Comparaison historique : revenus ${incomeTrendPct >= 0 ? 'supérieurs' : 'inférieurs'} de ${Math.abs(incomeTrendPct)}% à la moyenne des 3 derniers mois.`,
    `Inflation des charges : ${expenseInflationRate >= 0 ? '+' : ''}${expenseInflationRate}% par rapport aux charges moyennes historiques.`,
    budgetInflection ? 'Le budget montre une inflation marquée des charges ce mois-ci.' : 'Le budget reste stable par rapport aux derniers mois.',
    subscriptionFlag ? `Abonnements identifiés : ${subscriptionInsights}` : 'Aucun abonnement récurrent détecté dans les charges fixes.'
  ].filter(Boolean).slice(0, 4)

  const advancedRecommendations = []
  if (subscriptionFlag) {
    advancedRecommendations.push('Vérifiez vos abonnements récurrents et résiliez ceux qui ne sont plus utiles.')
  }
  if (budgetInflection) {
    advancedRecommendations.push('Comparez vos charges actuelles aux 3 mois précédents et identifiez les hausses ponctuelles ou durables.')
  }
  if (irregularRevenue) {
    advancedRecommendations.push('Stabilisez vos rentrées en priorisant des revenus plus réguliers ou en construisant une réserve de trésorerie.')
  }
  if (!subscriptionFlag && !budgetInflection && !irregularRevenue) {
    advancedRecommendations.push('Continuez à surveiller votre budget : maintenez ce niveau de contrôle et testez des scénarios d’épargne.')
  }

  const riskAnalysis = {
    incomeTrendPct,
    expenseInflationRate,
    subscriptionCount,
    subscriptionItems: subscriptionItems.slice(0, 3),
    riskScore: Math.round((100 - stabilityScore) * 0.4 + (100 - expenseControlScore) * 0.3 + (100 - goalProgressScore) * 0.3),
    riskLevel: scoreObj.score >= 90 ? 'low' : scoreObj.score >= 75 ? 'medium' : scoreObj.score >= 60 ? 'high' : 'critical'
  }

  const financialHealthIndex = clamp(Math.round((scoreObj.score * 0.35) + (stabilityScore * 0.2) + (expenseControlScore * 0.2) + (goalProgressScore * 0.25)), 0, 100)

  // Add intelligent alerts based on advanced analysis
  const advancedAlerts = []
  if (monthsAtRisk !== null) advancedAlerts.push(`Risque de découvert dans environ ${monthsAtRisk} mois.`)
  if (abnormalExpenses.length) advancedAlerts.push(...abnormalExpenses)
  if (irregularRevenue) advancedAlerts.push('Revenus irréguliers détectés — veillez à stabiliser vos rentrées.')
  if (budgetInflection) advancedAlerts.push('Augmentation rapide des charges détectée par rapport à la moyenne des derniers mois.')
  if (subscriptionFlag) advancedAlerts.push(`Abonnements récurrents détectés : ${subscriptionCount}.`)
  unrealisticGoals.forEach(n => advancedAlerts.push(`Objectif probablement irréaliste : ${n}`))
  peaks.forEach(p => advancedAlerts.push(p))

  // --- Phase 5: KPI advanced calculations for Dashboard Premium
  const kpis = {
    realSavingsRate: rev > 0 ? Math.round((savings / rev) * 10000) / 100 : 0,
    dailyLeftover: Math.round((savings > 0 ? savings : 0) / 30),
    projectionEndOfYear: Math.round(savings + monthlyContribution * (12 - (new Date().getMonth()))),
    annualSavingsProjection: Math.round((savings > 0 ? savings : 0) * 12)
  }


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

    // Variable expenses high
    if (vari > 0 && rev > 0 && Math.round((vari / rev) * 100) > 40) {
      pushAlert('variable_expenses', 'Dépenses variables élevées', 'Dépenses variables élevées', 50, 'Réduisez environ 50 € de dépenses variables pour soulager votre budget.')
    }

    // High fixed charges recommendation
    if (fixedRate > 50) {
      const targetFixed = Math.round(rev * 0.5)
      const reductionNeeded = Math.max(0, fixes - targetFixed)
      recommendations.push(`Réduire environ ${reductionNeeded} € de charges fixes vous rapprocherait d’un niveau sain.`)
    }

    const targetEp = (typeof getVal === 'function' ? getVal('target_epargne') : null) || 0
    if (targetEp > 0 && savings < targetEp) {
      const shortfall = targetEp - savings
      recommendations.push(`Il manque ${shortfall} € pour atteindre votre objectif d’épargne mensuel de ${targetEp} €.`)
    }

    if (savings > 0) {
      const safetyAllocation = Math.max(0, Math.round(savings * 0.6))
      if (primaryGoal && Number(primaryGoal.current || 0) < Number(primaryGoal.target || 0) && safetyAllocation >= 50) {
        const available = Math.min(safetyAllocation, Math.max(0, Math.round((Number(primaryGoal.target || 0) - Number(primaryGoal.current || 0)))))
        recommendations.push(`Vous pouvez affecter environ ${available} € à votre objectif principal tout en gardant une marge de sécurité.`)
      } else if (!primaryGoal && safetyAllocation >= 50) {
        recommendations.push(`Votre solde est positif : vous pouvez affecter environ ${safetyAllocation} € à vos objectifs ou à l’épargne tout en conservant une marge de sécurité.`)
      }
    }

    // Negative balance - highest priority
    if (savings < 0) {
      pushAlert('deficit', `Attention, ce cycle risque de se terminer avec un déficit estimé de ${Math.abs(savings)} €.`, 'Solde prévisionnel négatif', 100, 'Priorisez la réduction des dépenses variables et des charges fixes avant de financer des objectifs.')
    }

    // High charges
    if (chargesRate > 80) {
      pushAlert('charges', `Les charges totales représentent ${chargesRate}% des revenus.`, 'Taux de charges très élevé', 90, 'Réduire 50 € de charges fixes améliorerait immédiatement votre taux d’épargne.')
    }

    if (primaryGoal) {
      const current = Number(primaryGoal.current || 0)
      const target = Number(primaryGoal.target || 0)
      const pct = target > 0 ? Math.round((current / target) * 100) : 0
      insights.push(`Objectif principal: ${primaryGoal.name || '—'} ${pct}% atteint`)
      if (pct >= 100) recommendations.push('Félicitations — objectif principal atteint.')
      else if (pct === 0) {
        const remaining = Math.max(0, target - current)
        const suggestedMonthly = Math.max(100, Math.round(remaining / 24))
        const monthsNeeded = Math.ceil(remaining / suggestedMonthly)
        recommendations.push(`En mettant ${suggestedMonthly} €/mois sur ${primaryGoal.name || 'cet objectif'}, vous pourriez l’atteindre en environ ${monthsNeeded} mois.`)
        pushAlert('goal_zero', `Objectif principal "${primaryGoal.name || '—'}" à 0%`, 'Objectif principal à 0%', 80, `Commencez à alimenter l'objectif ${primaryGoal.name || '—'} avec une première contribution de ${suggestedMonthly} € par mois.`)
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
    budgetForecasts: budgetForecasts || [],
    goalForecasts: goalForecasts || [],
    advancedAnalysis: {
      monthsAtRisk: monthsAtRisk || null,
      abnormalExpenses: abnormalExpenses || [],
      irregularRevenue: !!irregularRevenue,
      unrealisticGoals: unrealisticGoals || [],
      peaks: peaks || []
    },
    scoreBreakdown: scoreBreakdown || null,
    advancedFinancialInsights: advancedFinancialInsights || [],
    advancedRecommendations: advancedRecommendations || [],
    riskAnalysis: riskAnalysis || null,
    financialHealthIndex: financialHealthIndex || 0,
    advancedAlerts: advancedAlerts || [],
    timeline: timelineEntries,
    kpis: kpis || null,
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
  } catch (err) {
    // Robust fallback: never throw to the caller, return minimal safe payload
    return {
      status: 'error',
      trajectoryLabel: 'Analyse indisponible',
      currentSituation: 'Analyse indisponible',
      naturalAnalysis: 'Une erreur est survenue lors de l’analyse.',
      score: 0,
      scoreLabel: 'Indisponible',
      insights: [],
      alerts: [],
      recommendations: [],
      goalProjectionText: null,
      goalProjections: [],
      budgetForecasts: [],
      goalForecasts: [],
      advancedAnalysis: {},
      scoreBreakdown: null,
      advancedAlerts: [],
      timeline: [],
      kpis: null,
      metadata: {}
    }
  }

}

export { analyzeBudget }
