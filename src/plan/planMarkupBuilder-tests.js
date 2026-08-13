#!/usr/bin/env node
import assert from 'assert'
import { buildTodayActionCard } from './planMarkupBuilder.js'

const tests = [
  {
    name: 'action card with income problem should have budget CTA',
    fn: () => {
      const judgment = {
        action: 'Saisir au moins un revenu fiable.',
        why: 'Cette action est prioritaire parce qu\'elle rend le jugement fiable.',
        primaryProblem: { kind: 'income' }
      }
      const markup = buildTodayActionCard(judgment)
      assert(markup.includes('data-plan-action="navigate-budget"'), 'Should include budget navigation action')
      assert(markup.includes('Saisir mes revenus'), 'Should have income-specific CTA label')
    }
  },
  {
    name: 'action card with charges problem should have budget CTA',
    fn: () => {
      const judgment = {
        action: 'Réduire les charges fixes ou reporter un engagement non prioritaire.',
        why: 'Cette action est prioritaire parce que les charges fixes structurent la totalité du budget.',
        primaryProblem: { kind: 'charges' }
      }
      const markup = buildTodayActionCard(judgment)
      assert(markup.includes('data-plan-action="navigate-budget"'), 'Should include budget navigation action')
      assert(markup.includes('Vérifier mon budget'), 'Should have budget CTA label')
    }
  },
  {
    name: 'action card with balance problem should have budget CTA',
    fn: () => {
      const judgment = {
        action: 'Réviser le budget pour éviter l\'écart négatif.',
        why: 'Cette action est prioritaire parce qu\'un solde négatif bloque toute sécurité financière.',
        primaryProblem: { kind: 'balance' }
      }
      const markup = buildTodayActionCard(judgment)
      assert(markup.includes('data-plan-action="navigate-budget"'), 'Should include budget navigation action')
    }
  },
  {
    name: 'action card with buffer problem should have budget CTA',
    fn: () => {
      const judgment = {
        action: 'Protéger une réserve minimale avant toute nouvelle allocation.',
        why: 'Cette action est prioritaire parce que la marge de sécurité protège les autres décisions.',
        primaryProblem: { kind: 'buffer' }
      }
      const markup = buildTodayActionCard(judgment)
      assert(markup.includes('data-plan-action="navigate-budget"'), 'Should include budget navigation action')
    }
  },
  {
    name: 'action card with variables problem should NOT have budget CTA',
    fn: () => {
      const judgment = {
        action: 'Limiter les dépenses variables cette semaine.',
        why: 'Cette action est prioritaire parce que les variables restent les plus flexibles à ajuster.',
        primaryProblem: { kind: 'variables' }
      }
      const markup = buildTodayActionCard(judgment)
      assert(!markup.includes('data-plan-action="navigate-budget"'), 'Should NOT include budget navigation for ambiguous action')
    }
  },
  {
    name: 'action card with goal problem should NOT have budget CTA',
    fn: () => {
      const judgment = {
        action: 'Augmenter l\'effort mensuel vers l\'objectif prioritaire.',
        why: 'Cette action est prioritaire parce qu\'elle réduit le retard et améliore la trajectoire.',
        primaryProblem: { kind: 'goal' }
      }
      const markup = buildTodayActionCard(judgment)
      assert(!markup.includes('data-plan-action="navigate-budget"'), 'Should NOT include budget navigation for goal action')
    }
  },
  {
    name: 'action card with debt problem should NOT have budget CTA',
    fn: () => {
      const judgment = {
        action: 'Prioriser le remboursement de la dette la plus coûteuse.',
        why: 'Cette action est prioritaire parce qu\'elle réduit le coût du crédit et libère du cash-flow.',
        primaryProblem: { kind: 'debt' }
      }
      const markup = buildTodayActionCard(judgment)
      assert(!markup.includes('data-plan-action="navigate-budget"'), 'Should NOT include budget navigation for debt action')
    }
  },
  {
    name: 'action card with stable problem should NOT have budget CTA',
    fn: () => {
      const judgment = {
        action: 'Conserver la marge existante et éviter les dépenses non essentielles.',
        why: 'Cette action est prioritaire parce qu\'elle préserver la stabilité tout en consolidant l\'épargne.',
        primaryProblem: { kind: 'stable' }
      }
      const markup = buildTodayActionCard(judgment)
      assert(!markup.includes('data-plan-action="navigate-budget"'), 'Should NOT include budget navigation for stable action')
    }
  },
  {
    name: 'action card without action should show empty state',
    fn: () => {
      const judgment = { action: '', why: '' }
      const markup = buildTodayActionCard(judgment)
      assert(markup.includes('Aucune action prioritaire disponible'), 'Should show empty state')
      assert(!markup.includes('data-plan-action="navigate-budget"'), 'Should NOT include CTA in empty state')
    }
  },
  {
    name: 'action card escapes user data safely',
    fn: () => {
      const judgment = {
        action: '<script>alert("xss")</script>',
        why: '<img src=x onerror=alert(1)>',
        primaryProblem: { kind: 'income' }
      }
      const markup = buildTodayActionCard(judgment)
      assert(!markup.includes('<script>'), 'Should escape script tags')
      assert(markup.includes('&lt;script&gt;'), 'Should escape script tags as HTML entities')
      assert(markup.includes('&lt;img src=x onerror=alert(1)&gt;'), 'Should escape img tags')
    }
  }
]

async function run() {
  console.log('\n🧪 Running Plan Markup Builder Tests\n')
  let passed = 0
  let failed = 0
  for (const t of tests) {
    try {
      await t.fn()
      console.log('✓', t.name)
      passed++
    } catch (e) {
      console.log('✗', t.name, e.message)
      failed++
    }
  }
  console.log(`\nResults: ${passed} passed, ${failed} failed\n`)
  process.exit(failed > 0 ? 1 : 0)
}

run()
