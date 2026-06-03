#!/usr/bin/env node
import assert from 'node:assert/strict'
import { generateScenarios } from './scenarioService.js'
import {
  countScenarioCardsInMarkup,
  getNeutralScenarios,
  getScenarioLabelsFromMarkup,
  renderScenarioCardsMarkup,
  resolveScenariosForDisplay
} from './scenarioDisplay.js'

const empty = generateScenarios({ income: 0 })
assert.equal(empty.length, 3)
assert.deepEqual(empty.map((item) => item.label), ['Prudent', 'Équilibré', 'Agressif'])

const filled = generateScenarios({ income: 3000, expenses: 2000, projectedBalance: 1000 })
assert.equal(filled.length, 3)
assert.ok(filled.every((item) => item.label && typeof item.projectedBalance === 'number'))

assert.equal(resolveScenariosForDisplay([]).length, 3)
assert.equal(resolveScenariosForDisplay(null).length, 3)
assert.equal(resolveScenariosForDisplay([{ id: 'prudent', label: 'Prudent' }]).length, 3)

const neutralMarkup = renderScenarioCardsMarkup([])
assert.equal(countScenarioCardsInMarkup(neutralMarkup), 3)
assert.deepEqual(getScenarioLabelsFromMarkup(neutralMarkup), ['Prudent', 'Équilibré', 'Agressif'])
assert.match(neutralMarkup, /À compléter/)
assert.match(neutralMarkup, /advisor-scenario-card/)

const partialMarkup = renderScenarioCardsMarkup([filled[0]])
assert.equal(countScenarioCardsInMarkup(partialMarkup), 3)

const brokenMarkup = renderScenarioCardsMarkup(undefined)
assert.equal(countScenarioCardsInMarkup(brokenMarkup), 3)
assert.ok(getNeutralScenarios().every((item) => item.label))

console.log('scenario-display-tests: OK')
