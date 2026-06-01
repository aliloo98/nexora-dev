#!/usr/bin/env node
import assert from 'assert'
import TreasuryService from './treasuryService.js'

const tests = [
  {
    name: 'generate simple monthly revenue and charge timeline',
    fn: async () => {
      const from = new Date('2026-05-28')
      const revenues = [{ amount: 1700, frequency: 'monthly', day: 5 }]
      const charges = [{ amount: 850, date: 2, title: 'Loyer', priority: 'critique' }, { amount: 65, date: '2026-05-29', title: 'Internet', priority: 'importante' }]
      const { timeline, endingBalance } = TreasuryService.buildTimeline({ baseBalance: 2085, revenues, charges, fromDate: from, days: 14 })
      assert(Array.isArray(timeline))
      // Expect events like 2026-05-29 internet and 2026-06-02 loyer and 2026-06-05 revenue
      const titles = timeline.map(t => t.title)
      assert(titles.includes('Internet'))
      assert(titles.includes('Loyer'))
    }
  },
  {
    name: 'suggest payments near term',
    fn: async () => {
      const from = new Date('2026-05-28')
      const revenues = [{ amount: 1700, frequency: 'monthly', day: 5 }]
      const charges = [{ amount: 850, date: 2, title: 'Loyer', priority: 'critique' }, { amount: 65, date: '2026-05-29', title: 'Internet', priority: 'importante' }]
      const res = TreasuryService.suggestPayments({ baseBalance: 100, revenues, charges, fromDate: from, days: 14 })
      assert(Array.isArray(res.toPayNow))
      assert(res.toPayNow.some(p => p.name === 'Internet'))
    }
  }
]

async function run() {
  console.log('\n🧪 Running Treasury tests\n')
  let p=0,f=0
  for (const t of tests) {
    try { await t.fn(); console.log('✓', t.name); p++ } catch (e) { console.log('✗', t.name, e.message); f++ }
  }
  console.log(`\nResults: ${p} passed, ${f} failed\n`)
  process.exit(f>0?1:0)
}

run()
