#!/usr/bin/env node
import assert from 'assert'
import DebtPlanner from './debtPlanner.js'

const tests = [
  {
    name: 'simulate avalanche vs snowball simple case',
    fn: async () => {
      const debts = [
        { id: 'a', balance: 1000, ratePct: 10, minPayment: 50 },
        { id: 'b', balance: 300, ratePct: 5, minPayment: 30 }
      ]
      const r1 = DebtPlanner.simulate({ debts, monthlyExtra: 100, method: 'avalanche', maxMonths: 200 })
      const r2 = DebtPlanner.simulate({ debts, monthlyExtra: 100, method: 'snowball', maxMonths: 200 })
      assert(r1.months > 0)
      assert(r2.months > 0)
    }
  }
]

async function run() {
  console.log('\n🧪 Running Debt tests\n')
  let p=0,f=0
  for (const t of tests) {
    try { await t.fn(); console.log('✓', t.name); p++ } catch (e) { console.log('✗', t.name, e.message); f++ }
  }
  console.log(`\nResults: ${p} passed, ${f} failed\n`)
  process.exit(f>0?1:0)
}

run()
