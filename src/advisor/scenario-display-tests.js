#!/usr/bin/env node
import assert from 'node:assert/strict'
import { generateScenarios } from './scenarioService.js'

const empty = generateScenarios({ income: 0 })
assert.equal(empty.length, 3)
assert.deepEqual(empty.map((item) => item.label), ['Prudent', 'Équilibré', 'Agressif'])

const filled = generateScenarios({ income: 3000, expenses: 2000, projectedBalance: 1000 })
assert.equal(filled.length, 3)
assert.ok(filled.every((item) => item.label && typeof item.projectedBalance === 'number'))

console.log('scenario-display-tests: OK')
