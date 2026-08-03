#!/usr/bin/env node
import assert from 'node:assert/strict'
import { computeBudgetCycle, resolveActiveBudgetMonth } from './budgetCycle.js'

const calendar = computeBudgetCycle({
  monthKey: '2026-07',
  settings: { mode: 'calendar' },
  asOf: '2026-07-15T18:00:00.000Z'
})

assert.deepEqual(calendar, {
  mode: 'calendar',
  start: '2026-07-01',
  end: '2026-07-31',
  elapsedDays: 15,
  remainingDays: 16,
  totalDays: 31,
  progress: (15 / 31) * 100
})

const custom = computeBudgetCycle({
  monthKey: '2026-07',
  settings: { mode: 'custom', startDay: 28, endDay: 27 },
  asOf: '2026-07-01'
})
assert.equal(custom.start, '2026-06-28')
assert.equal(custom.end, '2026-07-27')
assert.equal(custom.elapsedDays, 4)
assert.equal(custom.remainingDays, 26)

const lastDay = computeBudgetCycle({
  monthKey: '2026-07',
  settings: { mode: 'calendar' },
  asOf: '2026-07-31'
})
assert.equal(lastDay.remainingDays, 0)
assert.equal(lastDay.progress, 100)

const outsideSelectedCycle = computeBudgetCycle({
  monthKey: '2026-08',
  settings: { mode: 'calendar' },
  asOf: '2026-07-15'
})
assert.equal(outsideSelectedCycle.elapsedDays, 31, 'historical runtime behavior must remain unchanged outside the cycle')
assert.equal(outsideSelectedCycle.remainingDays, 0)

assert.throws(
  () => computeBudgetCycle({ monthKey: '2026-13', asOf: '2026-07-15' }),
  /Invalid budget month/
)
assert.throws(
  () => computeBudgetCycle({ monthKey: '2026-07' }),
  /asOf/
)

assert.equal(
  resolveActiveBudgetMonth({ settings: { mode: 'calendar' }, asOf: '2026-08-03' }),
  '2026-08',
  'calendar mode should select the current calendar month'
)
assert.equal(
  resolveActiveBudgetMonth({ settings: { mode: 'calendar' }, asOf: new Date(2026, 7, 3, 0, 30) }),
  '2026-08',
  'Date instances should use the local calendar day without a UTC month shift'
)
assert.equal(
  resolveActiveBudgetMonth({ settings: { mode: 'custom', startDay: 28, endDay: 27 }, asOf: '2026-08-03' }),
  '2026-08',
  'a cross-month cycle should use its ending month as the budget key'
)
assert.equal(
  resolveActiveBudgetMonth({ settings: { mode: 'custom', startDay: 28, endDay: 27 }, asOf: '2026-08-28' }),
  '2026-09',
  'the first day of the next custom cycle should select its ending month'
)
assert.equal(
  resolveActiveBudgetMonth({ settings: { mode: 'custom', startDay: 28, endDay: 27 }, asOf: '2026-12-28' }),
  '2027-01',
  'custom cycle resolution should cross year boundaries'
)
assert.equal(
  resolveActiveBudgetMonth({ settings: { mode: 'custom', startDay: 10, endDay: 20 }, asOf: '2026-08-25' }),
  '2026-08',
  'legacy custom gaps should fall back to the current calendar month'
)

console.log('budgetCycle-tests: OK')
