import assert from 'node:assert/strict'
import { createJarvisCopilotEngine, getJarvisQuickPrompts } from './jarvisCopilotEngine.js'
import { INTENTS, parseAmount, parseJarvisIntent, SCENARIO_TYPES } from './jarvisIntentParser.js'
import { simulateJarvisScenario } from './jarvisScenarioEngine.js'

const snapshot = Object.freeze({
  dataQuality: {
    hasIncome: true,
    hasExpenses: true,
    hasGoal: true,
    hasDebt: true,
    hasHistory: true,
    issues: []
  },
  health: { status: 'stable', label: 'Situation stable' },
  cashflow: {
    income: 3200,
    expenses: 2350,
    paidExpenses: 1400,
    projected: 850,
    current: 1800,
    remaining: 950
  },
  budget: {
    fixed: 1400,
    variable: 950,
    total: 2350,
    categories: [
      { id: 'rent', name: 'Loyer', type: 'fixed_expense', amount: 1200, paidAmount: 1200 },
      { id: 'food', name: 'Courses', type: 'variable_expense', amount: 540, paidAmount: 240 },
      { id: 'transport', name: 'Transport', type: 'variable_expense', amount: 180, paidAmount: 80 }
    ]
  },
  savings: { amount: 850, rate: 26.5625 },
  forecast: { finalBalance: 850, lowestBalance: 420, lowestBalanceDay: 24, overdraftRisk: 'NONE' },
  risks: [
    { id: 'overdraft_risk', domain: 'cashflow', severity: 'high', evidence: { lowestBalance: 420, lowestBalanceDay: 24 } }
  ],
  opportunities: [
    { id: 'positive_cashflow', title: 'Marge disponible', description: 'Marge projetée positive', estimatedGain: 850 }
  ],
  priorities: [
    { id: 'capture_opportunity', rank: 3, action: 'Affecter la marge disponible', domain: 'cashflow', severity: 'low' }
  ],
  trends: {
    available: true,
    income: 'up',
    expenses: 'down',
    comparison: {
      income: { current: 3200, previous: 3000 },
      expenses: { current: 2350, previous: 2500 }
    }
  },
  goal: {
    target: 5000,
    current: 2100,
    remaining: 2900,
    progress: 42,
    monthlyEffort: 420,
    status: 'on_track',
    isReached: false
  },
  debt: {
    total: 1800,
    monthlyTotal: 160,
    payoffMonths: 12,
    totalInterest: 95
  }
})

const noDataSnapshot = Object.freeze({
  dataQuality: {
    hasIncome: false,
    hasExpenses: false,
    hasGoal: false,
    hasDebt: false,
    hasHistory: false,
    issues: [
      { code: 'NO_INCOME', severity: 'high' },
      { code: 'INSUFFICIENT_HISTORY', severity: 'medium' }
    ]
  },
  health: { status: 'no_income', label: 'Revenus manquants' },
  cashflow: { income: 0, expenses: 0, paidExpenses: 0, projected: 0, current: 0, remaining: 0 },
  budget: { fixed: 0, variable: 0, total: 0, categories: [] },
  savings: { amount: 0, rate: 0 },
  forecast: { finalBalance: 0, lowestBalance: 0, overdraftRisk: 'NONE' },
  risks: [{ id: 'no_income', domain: 'income', severity: 'high', evidence: { income: 0 } }],
  opportunities: [],
  priorities: [{ id: 'secure_income', rank: 2, action: 'Enregistrer des revenus', domain: 'income', severity: 'high' }],
  trends: { available: false, reason: 'insufficient_history' },
  goal: null,
  debt: null
})

function assertIntent(text, expectedIntent) {
  assert.equal(parseJarvisIntent(text).intent, expectedIntent, text)
}

function assertEveryFinancialFactIsTraceable(response, allowedValues) {
  const allowed = new Set(allowedValues.map(value => Number(value)))
  for (const fact of response.financialFacts || []) {
    if (fact.unit !== 'EUR' && fact.unit !== 'PERCENT') continue
    assert.ok(allowed.has(Number(fact.value)), `${fact.label}=${fact.value} is not traceable`)
  }
}

function testParserIntents() {
  assertIntent('Comment va mon budget ?', INTENTS.GLOBAL_STATUS)
  assertIntent('Pourquoi ma situation se dégrade ?', INTENTS.WHY_STATUS)
  assertIntent('Quel est mon plus gros risque ?', INTENTS.TOP_RISK)
  assertIntent('Que dois-je faire en priorité ?', INTENTS.PRIORITY)
  assertIntent('Je peux dépenser 100 € ?', INTENTS.AFFORDABILITY)
  assertIntent('Combien je peux encore dépenser ?', INTENTS.REMAINING_SPEND)
  assertIntent('Combien je peux épargner ?', INTENTS.SAVINGS)
  assertIntent('Où part mon argent ?', INTENTS.EXPENSE_ANALYSIS)
  assertIntent('Compare au mois dernier', INTENTS.HISTORY_COMPARE)
  assertIntent('Suis-je dans les temps pour mon objectif ?', INTENTS.GOAL)
  assertIntent('Quelle dette rembourser en premier ?', INTENTS.DEBT)
  assertIntent('Comment va finir le mois ?', INTENTS.FORECAST)
  assertIntent('Et si je réduis mes dépenses de 80 € ?', INTENTS.WHAT_IF)
  assertIntent('Je veux parler de cinéma', INTENTS.UNSUPPORTED)
}

function testAmountParsing() {
  assert.equal(parseAmount('100€'), 100)
  assert.equal(parseAmount('100 euros'), 100)
  assert.equal(parseAmount('100,50 €'), 100.5)
  assert.equal(parseAmount('100.50'), 100.5)
}

function testFollowUpContext() {
  const engine = createJarvisCopilotEngine()
  const first = engine.ask(snapshot, 'Je peux dépenser 100 € ?')
  assert.equal(first.response.intent, INTENTS.AFFORDABILITY)

  const second = engine.ask(snapshot, 'Et 200 € ?')
  assert.equal(second.parsedIntent.intent, INTENTS.AFFORDABILITY)
  assert.equal(second.parsedIntent.amount, 200)
  assert.equal(second.response.scenario.amount, 200)

  engine.ask(snapshot, 'Quel est mon risque principal ?')
  const why = engine.ask(snapshot, 'Pourquoi ?')
  assert.equal(why.parsedIntent.intent, INTENTS.EXPLAIN_RECOMMENDATION)
  assert.ok(why.response.evidence.length > 0)
}

function testScenarioEnginePure() {
  const before = JSON.stringify(snapshot)
  const scenario = simulateJarvisScenario(snapshot, { type: SCENARIO_TYPES.ADD_EXPENSE, amount: 900 })

  assert.equal(JSON.stringify(snapshot), before)
  assert.equal(scenario.ok, true)
  assert.equal(scenario.before.margin, 850)
  assert.equal(scenario.after.margin, -50)
  assert.equal(scenario.diff.margin, -900)
  assert.equal(scenario.risk.after, 'critical')
  assert.equal(scenario.readonly, true)
}

function testScenarioVariants() {
  const reduce = simulateJarvisScenario(snapshot, { type: SCENARIO_TYPES.REDUCE_EXPENSE, amount: 100 })
  assert.equal(reduce.after.margin, 950)

  const savings = simulateJarvisScenario(snapshot, { type: SCENARIO_TYPES.ADD_SAVINGS, amount: 200 })
  assert.equal(savings.after.margin, 650)
  assert.equal(savings.after.savingsAmount, 1050)

  const debt = simulateJarvisScenario(snapshot, { type: SCENARIO_TYPES.DEBT_EXTRA_PAYMENT, amount: 50 })
  assert.equal(debt.after.debtTotal, 1750)
}

function testDataQualityResponses() {
  const engine = createJarvisCopilotEngine()
  const status = engine.ask(noDataSnapshot, 'Comment va mon budget ?').response
  assert.equal(status.dataQuality.blocking, true)
  assert.ok(status.dataQuality.limits.includes('revenus non renseignés'))

  const history = engine.ask(noDataSnapshot, 'Compare au mois dernier').response
  assert.equal(history.dataQuality.blocking, true)
  assert.ok(history.dataQuality.limits.includes('comparaison historique indisponible'))

  const goal = engine.ask(noDataSnapshot, 'Où en est mon objectif ?').response
  assert.ok(goal.dataQuality.limits.includes('objectif absent'))

  const debt = engine.ask(noDataSnapshot, 'Et mes dettes ?').response
  assert.equal(debt.verdict, 'Aucune dette active')
}

function testAllResponsesStructured() {
  const engine = createJarvisCopilotEngine()
  const questions = [
    'Comment va mon budget ?',
    'Pourquoi ?',
    'Quel est mon risque principal ?',
    'Que dois-je faire en priorité ?',
    'Je peux dépenser 100 € ?',
    'Combien je peux encore dépenser ?',
    'Combien je peux épargner ?',
    'Où part mon argent ?',
    'Compare au mois dernier',
    'Où en est mon objectif ?',
    'Quelle dette rembourser ?',
    'Comment va finir le mois ?',
    'Et si je dépense 200 € de plus ?',
    'Pourquoi tu me conseilles ça ?',
    'Question incompréhensible hors finance'
  ]

  for (const question of questions) {
    const { response } = engine.ask(snapshot, question)
    assert.ok(response.intent)
    assert.ok(response.verdict)
    assert.ok(response.title)
    assert.ok(Array.isArray(response.evidence))
    assert.ok(Array.isArray(response.actions))
    assert.ok(Array.isArray(response.financialFacts))
  }
}

function testAntiHallucinationFacts() {
  const engine = createJarvisCopilotEngine()
  const affordability = engine.ask(snapshot, 'Je peux dépenser 100 € ?').response
  assertEveryFinancialFactIsTraceable(affordability, [
    100,
    850,
    750,
    -100,
    950,
    420,
    320,
    1800,
    160
  ])

  const expenses = engine.ask(snapshot, 'Où part mon argent ?').response
  assertEveryFinancialFactIsTraceable(expenses, [
    1200,
    540,
    180
  ])
}

function testQuickPromptsContextual() {
  const prompts = getJarvisQuickPrompts(snapshot)
  assert.ok(prompts.length <= 4)
  assert.ok(prompts.some(prompt => prompt.intent === INTENTS.TOP_RISK))
  assert.ok(prompts.some(prompt => prompt.intent === INTENTS.GOAL))
}

function run() {
  testParserIntents()
  testAmountParsing()
  testFollowUpContext()
  testScenarioEnginePure()
  testScenarioVariants()
  testDataQualityResponses()
  testAllResponsesStructured()
  testAntiHallucinationFacts()
  testQuickPromptsContextual()
}

run()
