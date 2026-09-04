import assert from 'node:assert/strict'
import { TestDocument } from '../../../tests/helpers/uiTestDom.mjs'
import { renderDashboardQuickView } from './renderDashboardQuickView.js'

const documentRef = new TestDocument()
const ensureElement = (id) => {
  const el = documentRef.getElementById(id) || documentRef.createElement('div')
  el.id = id
  if (!el.parentNode) documentRef.body.appendChild(el)
  el.getBoundingClientRect = () => ({ top: 1000, bottom: 1200, left: 0, right: 0, width: 0, height: 0 })
  el.animate = () => ({ pause() {}, play() {}, cancel() {} })
  return el
}

const createWindowRef = () => {
  const rafQueue = []
  const win = {
    matchMedia: () => ({ matches: false }),
    requestAnimationFrame: (cb) => {
      rafQueue.push(cb)
      return rafQueue.length
    },
    cancelAnimationFrame: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    __rafQueue: rafQueue,
    __flushRaf: () => {
      const pending = [...rafQueue]
      rafQueue.length = 0
      for (const cb of pending) cb()
    }
  }
  win.IntersectionObserver = class {
    constructor(callback) {
      this.callback = callback
      this.observed = []
      this.isIntersecting = false
    }
    observe(target) {
      this.observed.push(target)
    }
    unobserve() {}
    disconnect() {}
  }
  return win
}

const prepareDonutDom = () => {
  ensureElement('treasury-line-path')
  ensureElement('treasury-area-path')
  ensureElement('treasury-line-highlight')
  ensureElement('treasury-hover-dot')
  ensureElement('donut-segment-charges')
  ensureElement('donut-segment-epargne')
  ensureElement('donut-segment-libre')
  ensureElement('donut-center-pct')
  ensureElement('donut-leg-charges')
  ensureElement('donut-leg-epargne')
  ensureElement('donut-leg-variables')
  ensureElement('analysis-projection-value')
  ensureElement('analysis-projection-trend')
  ensureElement('analysis-trend-value')
  ensureElement('analysis-ratio-value')
  ensureElement('complete-goal-bar')
  ensureElement('complete-goal-progress-text')
  ensureElement('complete-debt-monthly')
  ensureElement('complete-debt-total')
}

prepareDonutDom()

const firstWin = createWindowRef()
firstWin.innerHeight = 844
renderDashboardQuickView({
  revReel: 0,
  fixReel: 0,
  varReel: 0,
  solde: 0,
  soldeEstime: 0,
  totalDepRestant: 0,
  tauxCh: 0,
  variablesPct: 0,
  savingsRate: 0,
  annualProjection: 0,
  safetyMargin: 0,
  goalProgressPct: 0,
  goalTarget: 200,
  debtSummary: { total: 0, monthly: 0 },
  hydrationComplete: true
}, { documentRef, windowRef: firstWin })

const chargesEl = documentRef.getElementById('donut-segment-charges')
const epargneEl = documentRef.getElementById('donut-segment-epargne')
const libreEl = documentRef.getElementById('donut-segment-libre')
assert.equal(chargesEl.getAttribute('data-motion-state'), 'pending', 'first render should arm the donut reveal')

const secondWin = createWindowRef()
secondWin.innerHeight = 844
renderDashboardQuickView({
  revReel: 2000,
  fixReel: 1040,
  varReel: 320,
  solde: 320,
  soldeEstime: 320,
  totalDepRestant: 0,
  tauxCh: 52,
  variablesPct: 16,
  savingsRate: 16,
  annualProjection: 3840,
  safetyMargin: 960,
  goalProgressPct: 48,
  goalTarget: 400,
  debtSummary: { total: 0, monthly: 0 }
}, { documentRef, windowRef: secondWin })

const northStarPanel = documentRef.querySelector('.north-star-panel')
assert.ok(northStarPanel, 'North Star panel should be rendered')
assert.match(northStarPanel.textContent, /Situation stable|Déficit prévu|Marge faible/i, 'North Star verdict should be visible')
assert.ok(documentRef.querySelector('[data-role="north-star-current"]'), 'Current balance card should exist in North Star panel')
assert.ok(documentRef.querySelector('[data-role="north-star-projected"]'), 'Projected balance card should exist in North Star panel')
assert.ok(documentRef.querySelector('[data-role="north-star-available"]'), 'Available amount card should exist in North Star panel')

const staleCallback = firstWin.__rafQueue.shift()
assert.ok(staleCallback, 'old render should have scheduled reveal work')

chargesEl.getBoundingClientRect = () => ({ top: 0, bottom: 100, left: 0, right: 100, width: 100, height: 100 })

if (typeof staleCallback === 'function') {
  staleCallback()
}

firstWin.__flushRaf()
secondWin.__flushRaf()
secondWin.__flushRaf()

assert.ok(!chargesEl.getAttribute('stroke-dasharray')?.startsWith('0 '), 'stale reveal should not overwrite geometry with the zero-value render')
assert.ok(!epargneEl.getAttribute('stroke-dasharray')?.startsWith('0 '), 'stale reveal should not overwrite epargne geometry with the zero-value render')
assert.ok(!libreEl.getAttribute('stroke-dasharray')?.startsWith('0 '), 'stale reveal should not overwrite free geometry with the zero-value render')
assert.ok((chargesEl.getAttribute('stroke-dasharray') || '').includes('124') || (chargesEl.getAttribute('stroke-dasharray') || '').includes('238'), 'latest charges geometry should be present after reveal lifecycle')
chargesEl.__donutRevealCleanup?.()

console.info('renderDashboardQuickView stale-reveal regression tests: OK')
