import assert from 'node:assert/strict'
import { renderJarvisCopilot } from './copilot/jarvisCopilot.js'
import { buildIntelligenceSnapshot } from '../intelligence/IntelligenceEngine.js'
import { createJarvisViewModel } from './jarvisViewModel.js'

console.log('[Test] Running Jarvis Premium Motion contracts test...')

// 1. Test multi-layer Jarvis Core markup in Copilot string
const copilotMarkup = renderJarvisCopilot({})
assert.ok(copilotMarkup.includes('jarvis-core-signal'), 'Multi-layer .jarvis-core-signal must exist in Copilot')
assert.ok(copilotMarkup.includes('data-state="idle"'), 'Initial signal state must be idle')
assert.ok(copilotMarkup.includes('jarvis-core-outer'), 'Outer precision ring must exist')
assert.ok(copilotMarkup.includes('jarvis-core-arc'), 'Secondary arc ring must exist')
assert.ok(copilotMarkup.includes('jarvis-core-inner'), 'Inner energy ring must exist')
assert.ok(copilotMarkup.includes('jarvis-core-center'), 'Central luminous core must exist')

// 2. Test ViewModel deterministic values intact
const dummyInput = {
  currentMonth: {
    monthKey: '2026-08',
    income: { total: 3000, fixed: 3000, variable: 0 },
    fixedExpenses: { total: 1200 },
    variableExpenses: { total: 500 }
  }
}
const snapshot = buildIntelligenceSnapshot(dummyInput, { referenceDate: new Date() })
const viewModel = createJarvisViewModel(snapshot)
assert.ok(viewModel && typeof viewModel.capabilities === 'object', 'ViewModel capabilities structure intact')

console.log('✅ Jarvis Motion unit tests passed successfully!')
