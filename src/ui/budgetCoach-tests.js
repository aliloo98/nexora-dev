import assert from 'node:assert/strict'
import { buildBudgetCoachState } from './budgetCoach.js'

const cases = [
  {
    name: 'empty budget suggests starting with income',
    values: {},
    expected: {
      tone: 'info',
      kicker: 'Prochaine étape',
      title: 'Commence par saisir un revenu',
      actionLabel: 'Ajouter un revenu'
    }
  },
  {
    name: 'income-only state nudges to fixed expenses',
    values: { rev_ali: 2500 },
    expected: {
      tone: 'info',
      kicker: 'Prochaine étape',
      title: 'Ajoute tes charges fixes',
      actionLabel: 'Saisir les charges'
    }
  },
  {
    name: 'income and fixed expenses nudge to a variable expense',
    values: { rev_ali: 2500, loyer: 800 },
    expected: {
      tone: 'info',
      kicker: 'Prochaine étape',
      title: 'Ajoute une dépense variable',
      actionLabel: 'Ajouter une dépense'
    }
  },
  {
    name: 'balanced budget celebrates momentum',
    values: { rev_ali: 2500, loyer: 800, courses: 250 },
    expected: {
      tone: 'success',
      kicker: 'Situation claire',
      title: 'Le budget tient bien',
      actionLabel: 'Voir la synthèse'
    }
  },
  {
    name: 'overspending warns about pressure',
    values: { rev_ali: 1000, loyer: 900, courses: 300 },
    expected: {
      tone: 'warning',
      kicker: 'À surveiller',
      title: 'Réduis la pression du mois',
      actionLabel: 'Réviser le budget'
    }
  }
]

let failed = 0

for (const testCase of cases) {
  try {
    const result = buildBudgetCoachState(testCase.values)
    assert.equal(result.title, testCase.expected.title)
    assert.equal(result.tone, testCase.expected.tone)
    assert.equal(result.kicker, testCase.expected.kicker)
    assert.equal(result.actionLabel, testCase.expected.actionLabel)
  } catch (error) {
    failed += 1
    console.error(`✖ ${testCase.name}:`, error.message)
  }
}

if (failed > 0) {
  console.error(`Budget entry guide tests failed: ${failed}`)
  process.exit(1)
}

console.log('Budget entry guide tests passed')
