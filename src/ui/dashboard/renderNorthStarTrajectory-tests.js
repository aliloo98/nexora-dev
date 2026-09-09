import assert from 'node:assert/strict'
import { buildTrajectoryEvents } from './renderNorthStarTrajectory.js'

const positiveEvents = buildTrajectoryEvents({
  soldeEstime: 2716,
  solde: 1651,
  totalDepRestant: 1065,
  revReel: 3000
})

assert.deepEqual(positiveEvents.map((event) => event.type), ['today', 'upcoming', 'cycle_end'])
assert.equal(positiveEvents[0].amount, 2716)
assert.equal(positiveEvents[1].amount, 1065)
assert.equal(positiveEvents[1].secondaryAmount, 3000)
assert.equal(positiveEvents[2].amount, 1651)
assert.equal(positiveEvents[2].isRisk, false)

const riskEvents = buildTrajectoryEvents({
  soldeEstime: 100,
  solde: -350,
  totalDepRestant: 450
})
assert.equal(riskEvents.at(-1).isRisk, true)
assert.match(riskEvents.at(-1).context, /Risque de découvert/)

assert.deepEqual(buildTrajectoryEvents({}), [])

console.info('renderNorthStarTrajectory tests: OK')
