#!/usr/bin/env node
import assert from 'assert'
import TreasuryService from './treasuryService.js'
import { MonthlyBudgetStateService } from '../../js/monthlyBudgetStateService.js'

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
  },
  {
    name: 'calculate selected month current balance from paid expenses',
    fn: async () => {
      const balance = MonthlyBudgetStateService.calculateBalance({
        rev_ali: '1700',
        rev_megane: '1300',
        loyer: '850',
        loyer_paye: '850',
        courses: '400',
        courses_paye: '125',
        note_loyer: 'payé début de mois'
      })
      assert.strictEqual(balance, 2025)
    }
  },
  {
    name: 'timeline clamps missing or impossible dates safely',
    fn: async () => {
      const { timeline, endingBalance } = TreasuryService.buildTimeline({
        baseBalance: 1000,
        revenues: [{ amount: 1300, frequency: 'monthly', day: 31, title: 'Salaire' }],
        charges: [{ amount: 850, date: 31, title: 'Loyer', priority: 'critique', dateEstimated: true }],
        fromDate: new Date('2026-02-01T00:00:00'),
        days: 30
      })
      assert(timeline.length > 0)
      assert(timeline.every((item) => Number.isFinite(item.balance)))
      assert(Number.isFinite(endingBalance))
      assert(timeline.every((item) => !String(item.date).includes('NaN')))
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
