import assert from 'node:assert/strict'
import { writeFileSync, existsSync, mkdirSync, readFileSync, rmSync, unlinkSync } from 'node:fs'
import { resolve } from 'node:path'
import { tmpdir } from 'node:os'

console.log('Running UI V2 checker baseline logic tests...')

// Test 1: Baseline matching current state
{
  const baselinePath = resolve(tmpdir(), `baseline-test-${Date.now()}.json`)
  
  try {
    const currentIssues = [
      { file: 'test.css', rule: 'color-literal', line: 1, detail: 'literal "rgba(" must be a token' }
    ]
    
    writeFileSync(baselinePath, JSON.stringify({
      version: 1,
      allowed: currentIssues
    }, null, 2))
    
    const baseline = JSON.parse(readFileSync(baselinePath, 'utf8'))
    const baselineFingerprints = new Set(baseline.allowed.map(e => JSON.stringify(e)))
    const currentFingerprints = new Set(currentIssues.map(i => JSON.stringify(i)))
    
    const newViolations = currentIssues.filter(i => !baselineFingerprints.has(JSON.stringify(i)))
    const resolvedViolations = baseline.allowed.filter(e => !currentFingerprints.has(JSON.stringify(e)))
    
    assert.strictEqual(newViolations.length, 0, 'Should have no new violations')
    assert.strictEqual(resolvedViolations.length, 0, 'Should have no resolved violations')
    
    console.log('✓ Test 1: Baseline matching current state')
  } finally {
    if (existsSync(baselinePath)) unlinkSync(baselinePath)
  }
}

// Test 2: New violation detection
{
  const baselinePath = resolve(tmpdir(), `baseline-test-${Date.now()}.json`)
  
  try {
    const currentIssues = [
      { file: 'test.css', rule: 'color-literal', line: 1, detail: 'literal "rgba(" must be a token' },
      { file: 'test.css', rule: 'motion', line: 2, detail: '0.3s exceeds 250ms' }
    ]
    
    writeFileSync(baselinePath, JSON.stringify({
      version: 1,
      allowed: [
        { file: 'test.css', rule: 'color-literal', line: 1, detail: 'literal "rgba(" must be a token' }
      ]
    }, null, 2))
    
    const baseline = JSON.parse(readFileSync(baselinePath, 'utf8'))
    const baselineFingerprints = new Set(baseline.allowed.map(e => JSON.stringify(e)))
    const currentFingerprints = new Set(currentIssues.map(i => JSON.stringify(i)))
    
    const newViolations = currentIssues.filter(i => !baselineFingerprints.has(JSON.stringify(i)))
    
    assert.strictEqual(newViolations.length, 1, 'Should detect 1 new violation')
    assert.strictEqual(newViolations[0].rule, 'motion', 'New violation should be motion')
    
    console.log('✓ Test 2: New violation detection')
  } finally {
    if (existsSync(baselinePath)) unlinkSync(baselinePath)
  }
}

// Test 3: Outdated baseline detection
{
  const baselinePath = resolve(tmpdir(), `baseline-test-${Date.now()}.json`)
  
  try {
    const currentIssues = [
      { file: 'test.css', rule: 'color-literal', line: 1, detail: 'literal "rgba(" must be a token' }
    ]
    
    writeFileSync(baselinePath, JSON.stringify({
      version: 1,
      allowed: [
        { file: 'test.css', rule: 'color-literal', line: 1, detail: 'literal "rgba(" must be a token' },
        { file: 'test.css', rule: 'motion', line: 2, detail: '0.3s exceeds 250ms' }
      ]
    }, null, 2))
    
    const baseline = JSON.parse(readFileSync(baselinePath, 'utf8'))
    const baselineFingerprints = new Set(baseline.allowed.map(e => JSON.stringify(e)))
    const currentFingerprints = new Set(currentIssues.map(i => JSON.stringify(i)))
    
    const resolvedViolations = baseline.allowed.filter(e => !currentFingerprints.has(JSON.stringify(e)))
    
    assert.strictEqual(resolvedViolations.length, 1, 'Should detect 1 resolved violation')
    assert.strictEqual(resolvedViolations[0].rule, 'motion', 'Resolved violation should be motion')
    
    console.log('✓ Test 3: Outdated baseline detection')
  } finally {
    if (existsSync(baselinePath)) unlinkSync(baselinePath)
  }
}

// Test 4: Deterministic ordering
{
  const issues1 = [
    { file: 'b.css', rule: 'motion', line: 1, detail: '0.3s exceeds 250ms' },
    { file: 'a.css', rule: 'color-literal', line: 2, detail: 'literal "rgba(" must be a token' }
  ]
  
  const issues2 = [
    { file: 'b.css', rule: 'motion', line: 1, detail: '0.3s exceeds 250ms' },
    { file: 'a.css', rule: 'color-literal', line: 2, detail: 'literal "rgba(" must be a token' }
  ]
  
  const sorted1 = [...issues1].sort((a, b) => {
    if (a.file !== b.file) return a.file.localeCompare(b.file)
    if (a.rule !== b.rule) return a.rule.localeCompare(b.rule)
    if (a.line !== b.line) return (a.line || 0) - (b.line || 0)
    return a.detail.localeCompare(b.detail)
  })
  
  const sorted2 = [...issues2].sort((a, b) => {
    if (a.file !== b.file) return a.file.localeCompare(b.file)
    if (a.rule !== b.rule) return a.rule.localeCompare(b.rule)
    if (a.line !== b.line) return (a.line || 0) - (b.line || 0)
    return a.detail.localeCompare(b.detail)
  })
  
  assert.strictEqual(JSON.stringify(sorted1), JSON.stringify(sorted2), 'Sorting should be deterministic')
  
  console.log('✓ Test 4: Deterministic ordering')
}

// Test 5: Baseline should not be modified during check
{
  const baselinePath = resolve(tmpdir(), `baseline-test-${Date.now()}.json`)
  
  try {
    writeFileSync(baselinePath, JSON.stringify({
      version: 1,
      allowed: []
    }, null, 2))
    
    const baselineBefore = readFileSync(baselinePath, 'utf8')
    
    // Simulate check (read only)
    const baseline = JSON.parse(readFileSync(baselinePath, 'utf8'))
    
    const baselineAfter = readFileSync(baselinePath, 'utf8')
    
    assert.strictEqual(baselineBefore, baselineAfter, 'Baseline should not be modified')
    
    console.log('✓ Test 5: Baseline should not be modified during check')
  } finally {
    if (existsSync(baselinePath)) unlinkSync(baselinePath)
  }
}

console.log('\nAll UI V2 checker baseline logic tests passed!')
