#!/usr/bin/env node
import assert from 'assert'
import AdvisorService from './advisorService.js'
import { analyzeProactiveCoach, readFinancialMemory } from './proactiveCoachService.js'
import { generateScenarios } from './scenarioService.js'

const memoryStore = new Map()
global.localStorage = {
  getItem: (key) => memoryStore.has(key) ? memoryStore.get(key) : null,
  setItem: (key, value) => memoryStore.set(key, String(value)),
  removeItem: (key) => memoryStore.delete(key)
}

const baseContext = {
  income: 3000,
  fixedExpenses: 1200,
  variableExpenses: 500,
  expenses: 1700,
  currentBalance: 1300,
  projectedBalance: 1300,
  debts: [],
  goals: [],
  today: new Date('2026-06-02T00:00:00')
}

const tests = [
  {
    name: 'advisor purchase evaluation simple',
    fn: async () => {
      const res = await AdvisorService.evaluatePurchase({ price: 450, baseBalance: 500, revenues: [], charges: [], fromDate: new Date('2026-05-28'), days: 7 })
      assert.strictEqual(res.canAfford, true)
    }
  },
  {
    name: 'advisor purchase blocked',
    fn: async () => {
      const res = await AdvisorService.evaluatePurchase({ price: 600, baseBalance: 100, revenues: [], charges: [], fromDate: new Date('2026-05-28'), days: 7 })
      assert.strictEqual(res.canAfford, false)
    }
  },
  {
    name: 'conseil du jour sans données',
    fn: async () => {
      const res = analyzeProactiveCoach({ income: 0, expenses: 0, projectedBalance: 0 })
      assert.match(res.dailyAdvice, /il me manque encore tes revenus/i)
      assert(res.risks.includes('Revenu non configuré'))
    }
  },
  {
    name: 'conseil avec charges élevées',
    fn: async () => {
      const res = analyzeProactiveCoach({ ...baseContext, expenses: 2500, fixedExpenses: 1800, variableExpenses: 700, projectedBalance: 500 })
      assert(res.risks.some((risk) => /Charges élevées/.test(risk)))
      assert.strictEqual(res.priority, 'Limiter les dépenses variables')
    }
  },
  {
    name: 'conseil avec objectif en retard',
    fn: async () => {
      const goal = { id: 'g1', name: 'Déménagement', target: 2000, current: 400, targetDate: '2026-05-01', isPrimary: true }
      const res = analyzeProactiveCoach({ ...baseContext, primaryGoal: goal, goals: [goal] })
      assert(res.risks.some((risk) => /Déménagement en retard/.test(risk)))
      assert.match(res.dailyAdvice, /Déménagement/)
    }
  },
  {
    name: 'achat non recommandé',
    fn: async () => {
      const res = await AdvisorService.evaluateQuery({ query: 'Puis-je acheter un PC à 600 € ?', income: 1600, expenses: 1300, projectedBalance: 300 })
      assert.strictEqual(res.verdict, 'no')
      assert.match(res.today, /Pas maintenant/i)
      assert.match(res.alternative, /Budget plus sûr|Attends/)
    }
  },
  {
    name: 'achat recommandé',
    fn: async () => {
      const res = await AdvisorService.evaluateQuery({ query: 'Puis-je acheter une chaise à 120 € ?', income: 3000, expenses: 1200, projectedBalance: 1800 })
      assert.strictEqual(res.verdict, 'ok')
      assert.match(res.today, /Oui/)
    }
  },
  {
    name: 'scénario prudent',
    fn: async () => {
      const res = generateScenarios(baseContext).find((scenario) => scenario.id === 'prudent')
      assert(res)
      assert.strictEqual(res.risk, 'faible')
      assert(res.possibleSaving > 0)
    }
  },
  {
    name: 'scénario équilibré',
    fn: async () => {
      const res = generateScenarios(baseContext).find((scenario) => scenario.id === 'equilibre')
      assert(res)
      assert.strictEqual(res.risk, 'modéré')
      assert(res.possibleSaving > generateScenarios(baseContext).find((scenario) => scenario.id === 'prudent').possibleSaving)
    }
  },
  {
    name: 'scénario agressif',
    fn: async () => {
      const res = generateScenarios(baseContext).find((scenario) => scenario.id === 'agressif')
      assert(res)
      assert.strictEqual(res.risk, 'élevé')
      assert(res.possibleSaving > generateScenarios(baseContext).find((scenario) => scenario.id === 'equilibre').possibleSaving)
    }
  },
  {
    name: 'mémoire locale sans doublon',
    fn: async () => {
      memoryStore.clear()
      analyzeProactiveCoach({ ...baseContext, projectedBalance: -50 })
      analyzeProactiveCoach({ ...baseContext, projectedBalance: -50 })
      const memory = readFinancialMemory()
      assert.strictEqual(new Set(memory.lastImportantAlerts).size, memory.lastImportantAlerts.length)
      assert(memory.lastRecommendation)
    }
  },
  {
    name: 'données invalides',
    fn: async () => {
      const res = analyzeProactiveCoach({ income: 'abc', expenses: undefined, projectedBalance: Number.NaN })
      assert(!/NaN|undefined|null/.test(JSON.stringify(res)))
      assert.strictEqual(res.summary.income, 0)
    }
  }
]

async function run() {
  console.log('\n🧪 Running Advisor tests\n')
  let p=0,f=0
  for (const t of tests) {
    try { await t.fn(); console.log('✓', t.name); p++ } catch (e) { console.log('✗', t.name, e.message); f++ }
  }
  console.log(`\nResults: ${p} passed, ${f} failed\n`)
  process.exit(f>0?1:0)
}

run()
