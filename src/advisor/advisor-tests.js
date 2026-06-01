#!/usr/bin/env node
import assert from 'assert'
import AdvisorService from './advisorService.js'

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
