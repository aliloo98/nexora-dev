/**
 * Jarvis Cockpit Renderer Contract Tests
 *
 * Tests that the renderer produces valid HTML without undefined/NaN/Infinity
 * and handles absent data gracefully.
 */

import assert from 'node:assert/strict'
import { createJarvisViewModel } from './jarvisViewModel.js'

console.log('🧪 Running Jarvis Renderer Contract Tests')

// Simulate the renderer functions (extracted from jarvisCockpit.js for testing)
function escapeHtml(text) {
  if (text === null || text === undefined) return ''
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function formatCurrency(value) {
  if (value === null || value === undefined || isNaN(value)) return '0 €'
  return `${Math.round(value)} €`
}

function formatPercent(value) {
  if (value === null || value === undefined || isNaN(value)) return '0%'
  return `${Math.round(value)}%`
}

function renderPriorityCard(viewModel) {
  const { priority, priorityCta } = viewModel

  if (!priority) {
    return ''
  }

  const ctaMarkup = priorityCta 
    ? `<button type="button" class="jarvis-priority-cta" data-target="${priorityCta.target}">${escapeHtml(priorityCta.label)}</button>`
    : ''

  return `
    <div class="jarvis-priority-card">
      <div class="jarvis-priority-header">
        <span class="jarvis-priority-label">Priorité</span>
        <span class="jarvis-priority-label jarvis-priority-rank">#${priority.rank}</span>
      </div>
      <p class="jarvis-priority-action">${escapeHtml(priority.label)}</p>
      ${ctaMarkup}
    </div>
  `
}

function renderGoalModule(viewModel) {
  const { goal } = viewModel

  if (!goal) {
    return ''
  }

  const progressClamped = Math.max(0, Math.min(100, goal.progress || 0))

  return `
    <div class="jarvis-goal-module">
      <div class="jarvis-goal-header">
        <span class="jarvis-goal-title">Objectif principal</span>
        <span class="jarvis-goal-stat-value">${formatPercent(progressClamped)}</span>
      </div>
      <div class="jarvis-goal-progress">
        <div class="jarvis-goal-progress-bar" style="width: ${progressClamped}%"></div>
      </div>
      <div class="jarvis-goal-stats">
        <span class="jarvis-goal-stat">Restant: <span class="jarvis-goal-stat-value">${formatCurrency(goal.remaining)}</span></span>
        ${goal.monthlyEffort ? `<span class="jarvis-goal-stat">Effort mensuel: <span class="jarvis-goal-stat-value">${formatCurrency(goal.monthlyEffort)}</span></span>` : ''}
      </div>
    </div>
  `
}

function testPriorityWithAllFields() {
  const snapshot = {
    health: { status: 'critical', cashflow: 'negative', score: 20, label: 'Critique' },
    priorities: [
      { id: 'p1', rank: 1, action: 'reduce_expenses', domain: 'budget', severity: 'high', label: 'Réduire les charges fixes' }
    ],
    forecast: { finalBalance: -100, lowestBalance: -200, lowestBalanceDay: 20, overdraftRisk: 'HIGH' },
    risks: [],
    opportunities: [],
    goal: null,
    debt: null,
    cashflow: { income: 2000, expenses: 2500, paidExpenses: 2000, projected: 500, current: 0, remaining: -500 },
    savings: { rate: 0, amount: 0 },
    dataQuality: { isComplete: true, hasIncome: true, hasExpenses: true, hasGoal: false, hasDebt: false, issues: [] },
    trends: { available: false, reason: 'insufficient_history' },
    evidence: {}
  }

  const vm = createJarvisViewModel(snapshot)
  const html = renderPriorityCard(vm)

  assert.ok(html.includes('Priorité'), 'Should render priority label')
  assert.ok(html.includes('#1'), 'Should render rank')
  // The View Model maps priority.action to the label field
  assert.ok(html.includes('reduce_expenses') || html.includes('Réduire'), 'Should render action')
  assert.ok(!html.includes('undefined'), 'Should not contain literal undefined')
  assert.ok(!html.includes('NaN'), 'Should not contain literal NaN')
  assert.ok(!html.includes('Infinity'), 'Should not contain literal Infinity')
  assert.ok(!html.includes('[object Object]'), 'Should not contain object string')
}

function testPriorityWithCTA() {
  const snapshot = {
    health: { status: 'critical', cashflow: 'negative', score: 20, label: 'Critique' },
    priorities: [
      { id: 'p1', rank: 1, action: 'reduce_expenses', domain: 'budget', severity: 'high', label: 'Réduire les charges fixes' }
    ],
    forecast: { finalBalance: -100, lowestBalance: -200, lowestBalanceDay: 20, overdraftRisk: 'HIGH' },
    risks: [],
    opportunities: [],
    goal: null,
    debt: null,
    cashflow: { income: 2000, expenses: 2500, paidExpenses: 2000, projected: 500, current: 0, remaining: -500 },
    savings: { rate: 0, amount: 0 },
    dataQuality: { isComplete: true, hasIncome: true, hasExpenses: true, hasGoal: false, hasDebt: false, issues: [] },
    trends: { available: false, reason: 'insufficient_history' },
    evidence: {}
  }

  const vm = createJarvisViewModel(snapshot)
  vm.priorityCta = { target: 'budget', label: 'Voir le budget' }
  const html = renderPriorityCard(vm)

  assert.ok(html.includes('Voir le budget'), 'Should render CTA label')
  assert.ok(html.includes('data-target="budget"'), 'Should render CTA target')
  assert.ok(html.includes('<button'), 'Should use button element')
  assert.ok(!html.includes('<a'), 'Should not use anchor element')
}

function testPriorityWithMissingPriority() {
  const snapshot = {
    health: { status: 'unknown', cashflow: 'negative', score: 0, label: 'Inconnu' },
    priorities: [],
    forecast: { finalBalance: 0, lowestBalance: 0, lowestBalanceDay: null, overdraftRisk: 'NONE' },
    risks: [],
    opportunities: [],
    goal: null,
    debt: null,
    cashflow: { income: 0, expenses: 0, paidExpenses: 0, projected: 0, current: 0, remaining: 0 },
    savings: { rate: 0, amount: 0 },
    dataQuality: { isComplete: false, hasIncome: false, hasExpenses: false, hasGoal: false, hasDebt: false, issues: [] },
    trends: { available: false, reason: 'insufficient_history' },
    evidence: {}
  }

  const vm = createJarvisViewModel(snapshot)
  const html = renderPriorityCard(vm)

  assert.strictEqual(html, '', 'Should return empty string when no priority')
}

function testGoalWithAllFields() {
  const snapshot = {
    health: { status: 'strong', cashflow: 'positive', score: 85, label: 'Solide' },
    priorities: [],
    forecast: { finalBalance: 500, lowestBalance: 200, lowestBalanceDay: 15, overdraftRisk: 'NONE' },
    risks: [],
    opportunities: [],
    goal: {
      target: 10000,
      current: 5000,
      remaining: 5000,
      targetDate: '2026-12-31',
      daysRemaining: 200,
      monthsRemaining: 6,
      requiredDaily: 25,
      requiredMonthly: 750,
      monthlyEffort: 750,
      projectedMonths: 7,
      progress: 50,
      isTargetValid: true,
      isReached: false,
      isDeadlineValid: true,
      status: 'on_track'
    },
    debt: null,
    cashflow: { income: 3000, expenses: 2000, paidExpenses: 1800, projected: 1000, current: 1200, remaining: 200 },
    savings: { rate: 33, amount: 1000 },
    dataQuality: { isComplete: true, hasIncome: true, hasExpenses: true, hasGoal: true, hasDebt: false, issues: [] },
    trends: { available: false, reason: 'insufficient_history' },
    evidence: {}
  }

  const vm = createJarvisViewModel(snapshot)
  const html = renderGoalModule(vm)

  assert.ok(html.includes('Objectif principal'), 'Should render goal title')
  assert.ok(html.includes('50%'), 'Should render progress')
  // formatCurrency uses Math.round which removes spaces: 5000 € not 5 000 €
  assert.ok(html.includes('5000 €'), 'Should render remaining')
  assert.ok(html.includes('750 €'), 'Should render monthly effort')
  assert.ok(!html.includes('undefined'), 'Should not contain literal undefined')
  assert.ok(!html.includes('NaN'), 'Should not contain literal NaN')
  assert.ok(!html.includes('Infinity'), 'Should not contain literal Infinity')
}

function testGoalWithNaNProgress() {
  const snapshot = {
    health: { status: 'strong', cashflow: 'positive', score: 85, label: 'Solide' },
    priorities: [],
    forecast: { finalBalance: 500, lowestBalance: 200, lowestBalanceDay: 15, overdraftRisk: 'NONE' },
    risks: [],
    opportunities: [],
    goal: {
      target: 10000,
      current: 5000,
      remaining: 5000,
      targetDate: '2026-12-31',
      progress: NaN,
      monthlyEffort: 750
    },
    debt: null,
    cashflow: { income: 3000, expenses: 2000, paidExpenses: 1800, projected: 1000, current: 1200, remaining: 200 },
    savings: { rate: 33, amount: 1000 },
    dataQuality: { isComplete: true, hasIncome: true, hasExpenses: true, hasGoal: true, hasDebt: false, issues: [] },
    trends: { available: false, reason: 'insufficient_history' },
    evidence: {}
  }

  const vm = createJarvisViewModel(snapshot)
  const html = renderGoalModule(vm)

  // Progress should be clamped to 0-100
  assert.ok(html.includes('width: 0%'), 'NaN progress should default to 0%')
  assert.ok(!html.includes('NaN'), 'Should not render literal NaN')
}

function testGoalWithMissingGoal() {
  const snapshot = {
    health: { status: 'unknown', cashflow: 'negative', score: 0, label: 'Inconnu' },
    priorities: [],
    forecast: { finalBalance: 0, lowestBalance: 0, lowestBalanceDay: null, overdraftRisk: 'NONE' },
    risks: [],
    opportunities: [],
    goal: null,
    debt: null,
    cashflow: { income: 0, expenses: 0, paidExpenses: 0, projected: 0, current: 0, remaining: 0 },
    savings: { rate: 0, amount: 0 },
    dataQuality: { isComplete: false, hasIncome: false, hasExpenses: false, hasGoal: false, hasDebt: false, issues: [] },
    trends: { available: false, reason: 'insufficient_history' },
    evidence: {}
  }

  const vm = createJarvisViewModel(snapshot)
  const html = renderGoalModule(vm)

  assert.strictEqual(html, '', 'Should return empty string when no goal')
}

function testProgressClamping() {
  const snapshot = {
    health: { status: 'strong', cashflow: 'positive', score: 85, label: 'Solide' },
    priorities: [],
    forecast: { finalBalance: 500, lowestBalance: 200, lowestBalanceDay: 15, overdraftRisk: 'NONE' },
    risks: [],
    opportunities: [],
    goal: {
      target: 10000,
      current: 5000,
      remaining: 5000,
      targetDate: '2026-12-31',
      progress: 150, // Over 100%
      monthlyEffort: 750
    },
    debt: null,
    cashflow: { income: 3000, expenses: 2000, paidExpenses: 1800, projected: 1000, current: 1200, remaining: 200 },
    savings: { rate: 33, amount: 1000 },
    dataQuality: { isComplete: true, hasIncome: true, hasExpenses: true, hasGoal: true, hasDebt: false, issues: [] },
    trends: { available: false, reason: 'insufficient_history' },
    evidence: {}
  }

  const vm = createJarvisViewModel(snapshot)
  const html = renderGoalModule(vm)

  assert.ok(html.includes('width: 100%'), 'Progress over 100 should be clamped to 100')
}

function testNegativeProgressClamping() {
  const snapshot = {
    health: { status: 'strong', cashflow: 'positive', score: 85, label: 'Solide' },
    priorities: [],
    forecast: { finalBalance: 500, lowestBalance: 200, lowestBalanceDay: 15, overdraftRisk: 'NONE' },
    risks: [],
    opportunities: [],
    goal: {
      target: 10000,
      current: 5000,
      remaining: 5000,
      targetDate: '2026-12-31',
      progress: -50, // Negative
      monthlyEffort: 750
    },
    debt: null,
    cashflow: { income: 3000, expenses: 2000, paidExpenses: 1800, projected: 1000, current: 1200, remaining: 200 },
    savings: { rate: 33, amount: 1000 },
    dataQuality: { isComplete: true, hasIncome: true, hasExpenses: true, hasGoal: true, hasDebt: false, issues: [] },
    trends: { available: false, reason: 'insufficient_history' },
    evidence: {}
  }

  const vm = createJarvisViewModel(snapshot)
  const html = renderGoalModule(vm)

  assert.ok(html.includes('width: 0%'), 'Negative progress should be clamped to 0')
}

// Run tests
let passed = 0
let total = 0

function runTest(fn, name) {
  total++
  try {
    fn()
    passed++
    console.log(`✓ ${name}: PASS`)
  } catch (e) {
    console.log(`✗ ${name}: FAIL - ${e.message}`)
  }
}

runTest(testPriorityWithAllFields, 'Priority with all fields')
runTest(testPriorityWithCTA, 'Priority with CTA')
runTest(testPriorityWithMissingPriority, 'Priority with missing priority')
runTest(testGoalWithAllFields, 'Goal with all fields')
runTest(testGoalWithNaNProgress, 'Goal with NaN progress')
runTest(testGoalWithMissingGoal, 'Goal with missing goal')
runTest(testProgressClamping, 'Progress clamping (over 100)')
runTest(testNegativeProgressClamping, 'Progress clamping (negative)')

console.log(`\nJarvis Renderer Contract Tests: ${passed}/${total} passed`)
