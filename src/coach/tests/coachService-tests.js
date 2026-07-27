#!/usr/bin/env node
import assert from 'node:assert/strict'
import { createCoachService } from '../services/coachService.js'
import { deficitFixture } from './coachFixtures.js'

let buildCalls = 0
const context = deficitFixture()
const service = createCoachService({
  contextService: {
    buildContext: async ({ monthKey, asOf }) => {
      buildCalls += 1
      assert.equal(monthKey, '2026-07')
      assert.equal(asOf, context.asOf)
      return context
    }
  }
})

const first = await service.analyze({ monthKey: '2026-07', asOf: context.asOf })
const second = await service.getPrimaryRecommendation({ monthKey: '2026-07', asOf: context.asOf })

assert.equal(first.primary.ruleId, 'projectedDeficit')
assert.equal(first.presentation.title, 'Évite un solde négatif')
assert.deepEqual(first.primary, second.primary)
assert.equal(buildCalls, 2)

const failing = createCoachService({
  contextService: {
    buildContext: async () => {
      throw new Error('context unavailable')
    }
  }
})
await assert.rejects(() => failing.analyze({}), /context unavailable/)

console.log('coachService-tests: OK')
