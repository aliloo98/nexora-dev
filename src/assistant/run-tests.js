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

tests.push({
  name: 'budget positif',
  fn: async () => {
    setMocks({ metrics: { income: 2000, fixed: 800, variable: 600, expenses: 1400, savings: 600 } })
    const r = await analyzeBudget('2026-05')
    assert(r.score > 50, 'expected score > 50')
    assert(!r.alerts.includes('Solde prévisionnel négatif'))
  }
})

tests.push({
  name: 'budget négatif',
  fn: async () => {
    setMocks({ metrics: { income: 1000, fixed: 900, variable: 300, expenses: 1200, savings: -200 } })
    const r = await analyzeBudget('2026-05')
    assert(r.alerts.length > 0 && r.alerts.includes('Solde prévisionnel négatif'), 'expected negative balance alert')
  }
})

tests.push({
  name: 'épargne atteinte',
  fn: async () => {
    setMocks({ metrics: { income: 2000, fixed: 1000, variable: 500, expenses: 1500, savings: 500, targetEpargne: 400 } })
    const r = await analyzeBudget('2026-05')
    assert(r.insights.some(i => /épargne/i.test(i) || /Objectif d’épargne atteint/i), 'expected savings insight')
  }
})

tests.push({
  name: 'objectif principal à 0%',
  fn: async () => {
    setMocks({ metrics: { income: 1500, fixed: 800, variable: 500, expenses: 1300, savings: 200 }, primaryGoal: { name: 'Test', current: 0, target: 1000 } })
    const r = await analyzeBudget('2026-05')
    assert(r.recommendations.some(s => /Commencez/i || /Commencez/.test(s) ), 'expected encouragement to start contributing')
  }
})

tests.push({
  name: 'objectif principal atteint',
  fn: async () => {
    setMocks({ metrics: { income: 1500, fixed: 500, variable: 200, expenses: 700, savings: 800 }, primaryGoal: { name: 'Done', current: 1000, target: 800 } })
    const r = await analyzeBudget('2026-05')
    assert(r.recommendations.some(s => /Félicitations/i || /Félicitations/.test(s) ), 'expected congrats recommendation')
  }
})

tests.push({
  name: 'dépenses variables élevées',
  fn: async () => {
    setMocks({ metrics: { income: 2000, fixed: 600, variable: 1000, expenses: 1600, savings: 400 } })
    const r = await analyzeBudget('2026-05')
    assert(r.alerts.includes('Dépenses variables élevées'), 'expected variable expense alert')
  }
})

tests.push({
  name: 'taux de charges élevé',
  fn: async () => {
    setMocks({ metrics: { income: 2000, fixed: 1500, variable: 400, expenses: 1900, savings: 100 } })
    const r = await analyzeBudget('2026-05')
    assert(r.alerts.includes('Taux de charges très élevé'), 'expected high charges alert')
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
