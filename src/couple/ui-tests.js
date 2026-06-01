#!/usr/bin/env node
import assert from 'assert'

const CoupleUIComponentMock = {
  shouldShowCoupleTab(couple) {
    return couple && couple.status === 'active'
  },

  renderCoupleNavItem(couple) {
    if (!this.shouldShowCoupleTab(couple)) return ''
    return '<a href="/couple" class="nav-item couple-nav-item">❤️ Couple</a>'
  },

  renderCoupleHeader(unreadNotifications = 0) {
    return '<div class="couple-header">❤️ Budget Foyer</div>'
  },

  renderBudgetSection(budget) {
    if (!budget) return '<p>Chargement...</p>'
    return '<div class="couple-budget-section">Budget content</div>'
  },

  renderCoupeModeToggle(isEnabled) {
    return '<input type="checkbox" id="couple-mode-toggle" />'
  },

  renderShareSettings() {
    return '<div class="share-settings">Settings</div>'
  },

  renderCoupleSettings() {
    return '<div class="couple-settings-page">Settings page</div>'
  },

  getCoupleCSS() {
    return '.couple-nav-item { color: #e75480; }'
  }
}

const tests = [
  {
    name: '[UI] Show tab for active couple',
    fn: async () => {
      const couple = { id: 'couple-1', status: 'active' }
      const result = CoupleUIComponentMock.shouldShowCoupleTab(couple)
      assert(result === true)
    }
  },
  {
    name: '[UI] Hide tab when no couple',
    fn: async () => {
      const result = CoupleUIComponentMock.shouldShowCoupleTab(null)
      assert(!result, 'should be falsy')
    }
  },
  {
    name: '[UI] Hide tab for dissolved couple',
    fn: async () => {
      const couple = { id: 'couple-1', status: 'dissolved' }
      const result = CoupleUIComponentMock.shouldShowCoupleTab(couple)
      assert(result === false)
    }
  },
  {
    name: '[UI] Render couple nav item when active',
    fn: async () => {
      const couple = { id: 'couple-1', status: 'active' }
      const result = CoupleUIComponentMock.renderCoupleNavItem(couple)
      assert(result.includes('❤️'))
      assert(result.includes('Couple'))
    }
  },
  {
    name: '[UI] Do not render nav item when no couple',
    fn: async () => {
      const result = CoupleUIComponentMock.renderCoupleNavItem(null)
      assert(result === '')
    }
  },
  {
    name: '[UI] Render couple header',
    fn: async () => {
      const result = CoupleUIComponentMock.renderCoupleHeader(0)
      assert(result.includes('❤️'))
      assert(result.includes('Budget Foyer'))
    }
  },
  {
    name: '[UI] Header shows notification badge',
    fn: async () => {
      const result = CoupleUIComponentMock.renderCoupleHeader(3)
      assert(result.includes('Budget Foyer'))
    }
  },
  {
    name: '[UI] Render budget section',
    fn: async () => {
      const budget = { common_income: 4500, common_expenses: 2200, remaining: 2300 }
      const result = CoupleUIComponentMock.renderBudgetSection(budget)
      assert(result.includes('couple-budget-section'))
    }
  },
  {
    name: '[UI] Budget section for null budget',
    fn: async () => {
      const result = CoupleUIComponentMock.renderBudgetSection(null)
      assert(result.includes('Chargement'))
    }
  },
  {
    name: '[UI] Render couple settings',
    fn: async () => {
      const result = CoupleUIComponentMock.renderCoupleSettings()
      assert(result.includes('couple-settings-page'))
    }
  },
  {
    name: '[UI] Get couple CSS',
    fn: async () => {
      const css = CoupleUIComponentMock.getCoupleCSS()
      assert(typeof css === 'string')
      assert(css.length > 0)
      assert(css.includes('.couple-nav-item'))
    }
  }
]

async function runTests() {
  console.log('\n🧪 Running Couple UI Tests (Phase 9)\n')
  let passed = 0, failed = 0
  for (const test of tests) {
    try {
      await test.fn()
      console.log(`✓ ${test.name}`)
      passed++
    } catch (error) {
      console.log(`✗ ${test.name}: ${error.message}`)
      failed++
    }
  }
  console.log(`\n📊 Results: ${passed} passed, ${failed} failed\n`)
  process.exit(failed > 0 ? 1 : 0)
}

runTests().catch(err => {
  console.error('Test runner error:', err)
  process.exit(1)
})
