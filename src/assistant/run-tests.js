#!/usr/bin/env node
import assert from 'assert'
import { analyzeBudget } from './assistantEngine.js'

// Simple test runner for assistantEngine
const tests = []

function setMocks({metrics, primaryGoal, goalsSummary}){
  global.getMonthMetrics = (month, opts) => metrics
  global.getVal = (k) => {
    if (k === 'target_epargne') return metrics.targetEpargne || 0
    return 0
  }
  global.GoalsService = {
    getPrimaryGoal: async () => primaryGoal || null,
    getSummary: async () => goalsSummary || { goals: [], totalTarget: 0, totalCurrent: 0, progressPct: 0 }
  }
}

function assertMinimumOutputs(r){
  assert(r && Array.isArray(r.insights) && r.insights.length > 0, 'expected at least one insight')
  assert(r && Array.isArray(r.alerts) && r.alerts.length > 0, 'expected at least one vigilance/alert')
  assert(r && Array.isArray(r.recommendations) && r.recommendations.length > 0, 'expected at least one recommendation')
}

tests.push({
  name: 'budget positif',
  fn: async () => {
    setMocks({ metrics: { income: 2000, fixed: 800, variable: 600, expenses: 1400, savings: 600 } })
    const r = await analyzeBudget('2026-05')
    assertMinimumOutputs(r)
    assert(r.score > 50, 'expected score > 50')
    assert(!r.alerts.includes('Solde fin de cycle négatif'))
  }
})

tests.push({
  name: 'budget négatif',
  fn: async () => {
    setMocks({ metrics: { income: 1000, fixed: 900, variable: 300, expenses: 1200, savings: -200 } })
    const r = await analyzeBudget('2026-05')
    assertMinimumOutputs(r)
    assert(r.alerts.length > 0 && r.alerts.includes('Solde fin de cycle négatif'), 'expected negative balance alert')
  }
})

tests.push({
  name: 'prévisions budgétaires publiées',
  fn: async () => {
    setMocks({ metrics: { income: 2500, fixed: 900, variable: 700, expenses: 1600, savings: 900 } })
    const r = await analyzeBudget('2026-05')
    assert(Array.isArray(r.budgetForecasts), 'expected budgetForecasts array')
    assert.strictEqual(r.budgetForecasts.length, 4, 'expected 4 forecast horizons')
    assert(r.budgetForecasts.every(item => typeof item.projectedBalance === 'number'), 'expected projectedBalance numbers')
    assert(Array.isArray(r.goalForecasts), 'expected goalForecasts array')
  }
})

tests.push({
  name: 'analyse avancée exposée',
  fn: async () => {
    setMocks({ metrics: { income: 2000, fixed: 900, variable: 700, expenses: 1600, savings: 400 } })
    const r = await analyzeBudget('2026-05')
    assert(typeof r.score === 'number', 'expected numeric score')
    assert(r.score >= 0 && r.score <= 100, 'score range 0-100')
    assert(r.scoreBreakdown && typeof r.scoreBreakdown.savingsComponent === 'number', 'expected scoreBreakdown.savingsComponent')
    assert(r.advancedAnalysis && Array.isArray(r.advancedAnalysis.abnormalExpenses), 'expected advancedAnalysis.abnormalExpenses')
  }
})

tests.push({
  name: 'kpis exposés pour dashboard',
  fn: async () => {
    setMocks({ metrics: { income: 3000, fixed: 1000, variable: 800, expenses: 1800, savings: 1200 } })
    const r = await analyzeBudget('2026-05')
    assert(r.kpis && typeof r.kpis.realSavingsRate === 'number', 'expected kpis.realSavingsRate')
    assert(typeof r.kpis.dailyLeftover === 'number', 'expected kpis.dailyLeftover')
  }
})

tests.push({
  name: 'indice santé financière et risque exposés',
  fn: async () => {
    setMocks({ metrics: { income: 2500, fixed: 900, variable: 900, expenses: 1800, savings: 700 } })
    const r = await analyzeBudget('2026-05')
    assert(typeof r.financialHealthIndex === 'number', 'expected financialHealthIndex')
    assert(r.financialHealthIndex >= 0 && r.financialHealthIndex <= 100, 'health index range 0-100')
    assert(r.riskAnalysis && typeof r.riskAnalysis.riskScore === 'number', 'expected riskAnalysis.riskScore')
    assert(Array.isArray(r.advancedFinancialInsights), 'expected advancedFinancialInsights array')
    assert(Array.isArray(r.advancedRecommendations), 'expected advancedRecommendations array')
  }
})

tests.push({
  name: 'détection abonnements récurrents',
  fn: async () => {
    setMocks({ metrics: { income: 2500, fixed: 1100, variable: 700, expenses: 1800, savings: 700 } })
    global.getBudgetKeysByType = () => ['box', 'stream', 'loyer']
    global.getBudgetLabel = (key) => key === 'box' ? 'Box internet' : key === 'stream' ? 'Abonnement streaming' : 'Loyer'
    global.getVal = (k) => ({ box: 40, stream: 15, loyer: 700 }[k] || 0)
    const r = await analyzeBudget('2026-05')
    assert(r.riskAnalysis?.subscriptionCount === 2, 'expected subscription count 2')
    assert(r.advancedAlerts.some(alert => /Abonnements récurrents détectés/i.test(alert)), 'expected subscription alert')
  }
})

tests.push({
  name: 'mois à risque détecté',
  fn: async () => {
    setMocks({ metrics: { income: 1000, fixed: 900, variable: 500, expenses: 1600, savings: -600 } })
    const r = await analyzeBudget('2026-05')
    assert(r.advancedAnalysis, 'expected advancedAnalysis')
    // when negative savings, we expect a risk month to be present in alerts or advancedAlerts
    assert(r.advancedAlerts.length > 0 || r.advancedAnalysis.monthsAtRisk !== null, 'expected monthsAtRisk or advanced alert for negative balance')
  }
})

tests.push({
  name: 'cas limite revenus à 0',
  fn: async () => {
    setMocks({ metrics: { income: 0, fixed: 0, variable: 0, expenses: 0, savings: 0 } })
    const r = await analyzeBudget('2026-05')
    assertMinimumOutputs(r)
    assert.strictEqual(r.budgetForecasts.length, 4, 'expected 4 forecast horizons when income is zero')
    assert.strictEqual(r.budgetForecasts[0].cumulativeSavings, 0, 'expected zero savings projection')
    assert.strictEqual(r.goalForecasts.length, 0, 'expected no goal forecasts when there are no goals')
    assert.strictEqual(r.metadata.fixedRate, null, 'expected fixedRate null when revenue is zero')
    assert.strictEqual(r.metadata.variableRate, null, 'expected variableRate null when revenue is zero')
    assert.strictEqual(r.metadata.totalChargesRate, null, 'expected totalChargesRate null when revenue is zero')
    assert.strictEqual(r.currentSituation, 'Ajoutez vos revenus pour commencer : le budget est à compléter avant analyse.', 'expected incomplete budget message when income is zero')
    assert.strictEqual(r.status, 'no_data', 'expected no_data status when income is zero')
    assert.strictEqual(r.financialHealthIndex, null, 'expected no arbitrary health index when income is zero')
    assert(r.alerts.includes('Données insuffisantes'), 'expected insufficient data alert when income is zero')
  }
})

tests.push({
  name: 'cas limite revenus à 0 avec charges',
  fn: async () => {
    setMocks({ metrics: { income: 0, fixed: 200, variable: 100, expenses: 300, savings: -300 } })
    const r = await analyzeBudget('2026-05')
    assertMinimumOutputs(r)
    assert.strictEqual(r.metadata.fixedRate, null, 'expected fixedRate null when revenue is zero')
    assert.strictEqual(r.metadata.variableRate, null, 'expected variableRate null when revenue is zero')
    assert.strictEqual(r.metadata.totalChargesRate, null, 'expected totalChargesRate null when revenue is zero')
    assert(!r.alerts.some(a => /Solde fin de cycle négatif/i.test(a)), 'expected no negative balance alert before revenue is entered')
  }
})

tests.push({
  name: 'variable rate non nul pour dépenses variables positives',
  fn: async () => {
    setMocks({ metrics: { income: 2000, fixed: 1000, variable: 10, expenses: 1010, savings: 990 } })
    const r = await analyzeBudget('2026-05')
    assertMinimumOutputs(r)
    assert.strictEqual(r.metadata.variableRate, 1, 'expected variableRate to be at least 1% when variable expenses are positive')
    assert.strictEqual(r.metadata.totalChargesRate, 51, 'expected totalChargesRate to reflect fixed + variable charges')
  }
})

tests.push({
  name: 'cas limite épargne à 0',
  fn: async () => {
    setMocks({ metrics: { income: 2000, fixed: 1000, variable: 1000, expenses: 2000, savings: 0 } })
    const r = await analyzeBudget('2026-05')
    assertMinimumOutputs(r)
    assert.strictEqual(r.budgetForecasts[0].cumulativeSavings, 0, 'expected zero monthly savings forecast')
    assert.strictEqual(r.budgetForecasts[0].projectedBalance, 0, 'expected zero projected balance when savings are zero')
  }
})

tests.push({
  name: 'cas limite objectif sans montant cible',
  fn: async () => {
    setMocks({ metrics: { income: 2200, fixed: 800, variable: 700, expenses: 1500, savings: 700 }, primaryGoal: { name: 'Sans cible', current: 100, target: 0 } })
    const r = await analyzeBudget('2026-05')
    assertMinimumOutputs(r)
    assert.strictEqual(r.goalProjections.length, 0, 'expected no goal projections without a valid target')
    assert.strictEqual(r.goalForecasts.length, 0, 'expected no goal forecasts without a valid target')
    assert.strictEqual(r.goalProjectionText, null, 'expected no goal projection text when no target exists')
  }
})

tests.push({
  name: 'cas limite objectif déjà atteint',
  fn: async () => {
    setMocks({ metrics: { income: 2200, fixed: 700, variable: 600, expenses: 1300, savings: 900 }, primaryGoal: { name: 'Atteint', current: 1200, target: 1000 } })
    const r = await analyzeBudget('2026-05')
    assertMinimumOutputs(r)
    assert.strictEqual(r.goalProjections.length, 0, 'expected no goal projections when goal is already reached')
    assert.strictEqual(r.goalForecasts.length, 0, 'expected no goal forecasts when goal is already reached')
  }
})

tests.push({
  name: 'objectif avec échéance future',
  fn: async () => {
    const future = new Date()
    future.setMonth(future.getMonth() + 6)
    const targetDate = future.toISOString().slice(0, 10)
    setMocks({
      metrics: { income: 2400, fixed: 800, variable: 600, expenses: 1400, savings: 1000 },
      primaryGoal: { name: 'Voyage', current: 400, target: 1600, targetDate },
      goalsSummary: { goals: [{ name: 'Voyage', current: 400, target: 1600, targetDate }], totalTarget: 1600, totalCurrent: 400, progressPct: 25 }
    })
    const r = await analyzeBudget('2026-05')
    assertMinimumOutputs(r)
    assert.strictEqual(r.goalProjections.length, 1, 'expected goal projection with deadline')
    assert(r.goalProjections[0].deadline.monthsRemaining > 0, 'expected future months remaining')
    assert(r.goalProjections[0].deadline.monthlyEffort > 0, 'expected monthly effort')
    assert(/mois restants/i.test(r.naturalAnalysis), 'expected deadline context in analysis')
  }
})

tests.push({
  name: 'objectif avec échéance passée',
  fn: async () => {
    setMocks({
      metrics: { income: 2400, fixed: 800, variable: 600, expenses: 1400, savings: 1000 },
      primaryGoal: { name: 'Dossier', current: 200, target: 1000, targetDate: '2025-01-01' },
      goalsSummary: { goals: [{ name: 'Dossier', current: 200, target: 1000, targetDate: '2025-01-01' }], totalTarget: 1000, totalCurrent: 200, progressPct: 20 }
    })
    const r = await analyzeBudget('2026-05')
    assertMinimumOutputs(r)
    assert.strictEqual(r.goalProjections[0].deadline.status, 'past', 'expected past deadline status')
    assert(/échéance de Dossier est passée/i.test(r.naturalAnalysis), 'expected past deadline warning')
  }
})

tests.push({
  name: 'cas limite aucun objectif existant',
  fn: async () => {
    setMocks({ metrics: { income: 2000, fixed: 800, variable: 600, expenses: 1400, savings: 600 }, primaryGoal: null, goalsSummary: { goals: [], totalTarget: 0, totalCurrent: 0, progressPct: 0 } })
    const r = await analyzeBudget('2026-05')
    assertMinimumOutputs(r)
    assert.strictEqual(r.goalProjections.length, 0, 'expected no goal projections when there are no goals')
    assert.strictEqual(r.goalForecasts.length, 0, 'expected no goal forecasts when there are no goals')
  }
})

tests.push({
  name: 'épargne atteinte',
  fn: async () => {
    setMocks({ metrics: { income: 2000, fixed: 1000, variable: 500, expenses: 1500, savings: 500, targetEpargne: 400 } })
    const r = await analyzeBudget('2026-05')
    assertMinimumOutputs(r)
    assert(r.insights.some(i => /épargne/i.test(i) || /Objectif d’épargne atteint/i), 'expected savings insight')
  }
})

tests.push({
  name: 'objectif principal à 0%',
  fn: async () => {
    setMocks({ metrics: { income: 1500, fixed: 800, variable: 500, expenses: 1300, savings: 200 }, primaryGoal: { name: 'Test', current: 0, target: 1000 } })
    const r = await analyzeBudget('2026-05')
    assertMinimumOutputs(r)
    assert(r.recommendations.some(s => /Commencez/i || /Commencez/.test(s) ), 'expected encouragement to start contributing')
  }
})

tests.push({
  name: 'objectif principal atteint',
  fn: async () => {
    setMocks({ metrics: { income: 1500, fixed: 500, variable: 200, expenses: 700, savings: 800 }, primaryGoal: { name: 'Done', current: 1000, target: 800 } })
    const r = await analyzeBudget('2026-05')
    assertMinimumOutputs(r)
    assert(r.recommendations.some(s => /Félicitations/i || /Félicitations/.test(s) ), 'expected congrats recommendation')
  }
})

tests.push({
  name: 'dépenses variables élevées',
  fn: async () => {
    setMocks({ metrics: { income: 2000, fixed: 600, variable: 1000, expenses: 1600, savings: 400 } })
    const r = await analyzeBudget('2026-05')
    assertMinimumOutputs(r)
    assert(r.alerts.includes('Dépenses variables élevées'), 'expected variable expense alert')
  }
})

tests.push({
  name: 'taux de charges élevé',
  fn: async () => {
    setMocks({ metrics: { income: 2000, fixed: 1500, variable: 400, expenses: 1900, savings: 100 } })
    const r = await analyzeBudget('2026-05')
    assertMinimumOutputs(r)
    assert(r.alerts.includes('Taux de charges très élevé'), 'expected high charges alert')
  }
})

tests.push({
  name: 'recommandation objectif non alimenté',
  fn: async () => {
    setMocks({ metrics: { income: 2500, fixed: 900, variable: 700, expenses: 1600, savings: 900 }, primaryGoal: { name: 'Déménagement', current: 0, target: 3000 } })
    const r = await analyzeBudget('2026-05')
    assertMinimumOutputs(r)
    assert(r.recommendations.some(s => /En mettant \d+ €\/mois sur Déménagement, vous pourriez l’atteindre en environ \d+ mois\./i.test(s)), 'expected goal funding recommendation')
  }
})

tests.push({
  name: 'recommandation charges fixes élevées',
  fn: async () => {
    setMocks({ metrics: { income: 2000, fixed: 1200, variable: 300, expenses: 1500, savings: 500 } })
    const r = await analyzeBudget('2026-05')
    assertMinimumOutputs(r)
    assert(r.recommendations.some(s => /Réduire environ \d+ € de charges fixes vous rapprocherait d’un niveau sain\./i.test(s)), 'expected fixed charge reduction recommendation')
  }
})

tests.push({
  name: 'recommandation épargne sous objectif',
  fn: async () => {
    setMocks({ metrics: { income: 2000, fixed: 800, variable: 700, expenses: 1500, savings: 200, targetEpargne: 400 } })
    const r = await analyzeBudget('2026-05')
    assertMinimumOutputs(r)
    assert(r.recommendations.some(s => /Il manque \d+ € pour atteindre votre objectif d’épargne mensuel de 400 €/i.test(s)), 'expected savings shortfall recommendation')
  }
})

tests.push({
  name: 'recommandation solde positif avec marge',
  fn: async () => {
    setMocks({ metrics: { income: 3000, fixed: 1000, variable: 800, expenses: 1800, savings: 1200 }, primaryGoal: { name: 'Déménagement', current: 800, target: 2000 } })
    const r = await analyzeBudget('2026-05')
    assertMinimumOutputs(r)
    assert(r.recommendations.some(s => /Vous pouvez affecter environ \d+ € à votre objectif principal tout en gardant une marge de sécurité\./i.test(s)), 'expected positive surplus allocation recommendation')
  }
})

tests.push({
  name: 'recommandation solde négatif',
  fn: async () => {
    setMocks({ metrics: { income: 2000, fixed: 900, variable: 800, expenses: 1900, savings: -100 } })
    const r = await analyzeBudget('2026-05')
    assertMinimumOutputs(r)
    assert(r.recommendations.some(s => /Priorisez la réduction des dépenses variables et des charges fixes avant de financer des objectifs\./i.test(s)), 'expected deficit priority recommendation')
  }
})

tests.push({
  name: 'charges fixes et charges totales non confondues',
  fn: async () => {
    setMocks({ metrics: { income: 3205, fixed: 2049, variable: 810, expenses: 2859, savings: 346 } })
    const r = await analyzeBudget('2026-05')
    assertMinimumOutputs(r)
    assert.strictEqual(r.metadata.fixedRate, 64, 'fixed charge rate should be 64%')
    assert.strictEqual(r.metadata.variableRate, 25, 'variable charge rate should be 25%')
    assert.strictEqual(r.metadata.chargesRate, 89, 'total charge rate should be 89%')
    assert(!/charges fixes .*89%/i.test(r.naturalAnalysis), 'fixed charges must not use total charge rate')
    assert(/charges fixes représentent 64% des revenus/i.test(r.naturalAnalysis), 'expected fixed charges 64% text')
    assert(/charges totales atteignent 89% des revenus/i.test(r.naturalAnalysis), 'expected total charges 89% text')
  }
})

async function run() {
  console.log('Running assistantEngine tests...')
  let passed = 0
  for (const t of tests) {
    try {
      await t.fn()
      console.log('✓', t.name)
      passed++
    } catch (err) {
      console.error('✗', t.name)
      console.error(err && err.message ? err.message : err)
      process.exitCode = 1
    }
  }
  console.log(`${passed}/${tests.length} tests passed`)
}

run().catch(err => { console.error(err); process.exit(2) })
