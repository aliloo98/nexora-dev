import assert from 'node:assert/strict'
import { buildJudgmentEngine } from './judgmentEngine.js'

const baseContext = {
  income: 3000,
  fixedExpenses: 1200,
  variableExpenses: 500,
  expenses: 1700,
  projectedBalance: 1300,
  currentBalance: 1300,
  debts: [],
  goals: [],
  primaryGoal: null,
  targetSavings: 300,
  settings: { thresholds: { chargesRate: 75, variableRate: 35, minBalance: 150 } }
}

const judgment = buildJudgmentEngine({
  ...baseContext,
  expenses: 2500,
  fixedExpenses: 1800,
  variableExpenses: 700,
  projectedBalance: 500
})

assert.equal(judgment.primaryProblem.kind, 'charges')
assert.equal(judgment.primaryProblem.priority, 1)
assert.match(judgment.diagnostic, /charges/i)
assert.match(judgment.impact, /pression/i)
assert.match(judgment.action, /réduire/i)
assert.match(judgment.why, /prioritaire/i)

const stable = buildJudgmentEngine({
  ...baseContext,
  expenses: 1500,
  fixedExpenses: 1000,
  variableExpenses: 300,
  projectedBalance: 1500
})
assert.equal(stable.primaryProblem.kind, 'stable')
assert.match(stable.diagnostic, /stable|situation claire/i)

console.log('judgmentEngine-tests: OK')
