import assert from 'node:assert/strict'
import { writeFileSync, existsSync, mkdirSync, readFileSync, rmSync } from 'node:fs'
import { resolve } from 'node:path'
import { tmpdir } from 'node:os'
import { checkUiV2 } from '../../scripts/check-ui-v2.mjs'

function createTempDir() {
  const dir = resolve(tmpdir(), `ui-v2-test-${Date.now()}`)
  mkdirSync(dir, { recursive: true })
  return dir
}

function cleanup(dir) {
  if (existsSync(dir)) {
    rmSync(dir, { recursive: true, force: true })
  }
}

function createFixture(dir, file, content) {
  const filePath = resolve(dir, file)
  const parentDir = resolve(dir, file.split('/').slice(0, -1).join('/'))
  mkdirSync(parentDir, { recursive: true })
  writeFileSync(filePath, content, 'utf8')
}

console.log('Running UI V2 checker integration tests...')

// Test 1: Baseline matching current state
{
  const dir = createTempDir()
  const baselinePath = resolve(dir, 'baseline.json')

  try {
    createFixture(dir, 'tokens/colors.css', ':root { --nx-color-primary: #000; }')
    createFixture(dir, 'components/components.css', '.nx-valid { color: var(--nx-color-primary); }')

    writeFileSync(baselinePath, JSON.stringify({
      version: 1,
      allowed: []
    }, null, 2))

    const result = checkUiV2({ baselinePath, updateBaseline: false, uiRoot: dir, skipRequiredFiles: true })
    assert.ok(result.ok, 'Should pass with matching baseline')
    assert.strictEqual(result.knownDebtCount, 0, 'Should have 0 known debt')

    console.log('✓ Test 1: Baseline matching current state')
  } finally {
    cleanup(dir)
  }
}

// Test 2: New violation detection
{
  const dir = createTempDir()
  const baselinePath = resolve(dir, 'baseline.json')

  try {
    createFixture(dir, 'tokens/colors.css', ':root { --nx-color-primary: #000; }')
    createFixture(dir, 'components/components.css', '.nx-valid { color: var(--nx-color-primary); } .nx-invalid { background: rgba(0,0,0,0.1); }')

    writeFileSync(baselinePath, JSON.stringify({
      version: 1,
      allowed: []
    }, null, 2))

    const result = checkUiV2({ baselinePath, updateBaseline: false, uiRoot: dir, skipRequiredFiles: true })
    assert.ok(!result.ok, 'Should fail with new violation')
    assert.ok(result.newViolations.length > 0, 'Should detect new violations')

    console.log('✓ Test 2: New violation detection')
  } finally {
    cleanup(dir)
  }
}

// Test 3: Outdated baseline detection
{
  const dir = createTempDir()
  const baselinePath = resolve(dir, 'baseline.json')

  try {
    createFixture(dir, 'tokens/colors.css', ':root { --nx-color-primary: #000; }')

    writeFileSync(baselinePath, JSON.stringify({
      version: 1,
      allowed: [
        { file: 'components/components.css', rule: 'color-literal', line: 1, column: 1, detail: 'literal "rgba(" must be a token' }
      ]
    }, null, 2))

    const result = checkUiV2({ baselinePath, updateBaseline: false, uiRoot: dir, skipRequiredFiles: true })
    assert.ok(!result.ok, 'Should fail with outdated baseline')
    assert.ok(result.resolvedViolations.length > 0, 'Should detect resolved violations')

    console.log('✓ Test 3: Outdated baseline detection')
  } finally {
    cleanup(dir)
  }
}

// Test 4: Keyframes from/to/0%/50%/100% should not trigger selector-scope
{
  const dir = createTempDir()
  const baselinePath = resolve(dir, 'baseline.json')

  try {
    createFixture(dir, 'tokens/colors.css', ':root { --nx-color-primary: #000; }')
    createFixture(dir, 'components/components.css', `
@keyframes fadeIn {
  from { opacity: 0; }
  50% { opacity: 0.5; }
  to { opacity: 1; }
}
@keyframes slideIn {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(0); }
}
.nx-component { color: var(--nx-color-primary); }
`)

    writeFileSync(baselinePath, JSON.stringify({
      version: 1,
      allowed: []
    }, null, 2))

    const result = checkUiV2({ baselinePath, updateBaseline: false, uiRoot: dir, skipRequiredFiles: true })
    assert.ok(result.ok, 'Should pass - keyframes should not trigger selector-scope')

    console.log('✓ Test 4: Keyframes from/to/0%/50%/100% should not trigger selector-scope')
  } finally {
    cleanup(dir)
  }
}

// Test 5: @keyframes with brace on next line should not contaminate rest of file
{
  const dir = createTempDir()
  const baselinePath = resolve(dir, 'baseline.json')

  try {
    createFixture(dir, 'tokens/colors.css', ':root { --nx-color-primary: #000; }')
    createFixture(dir, 'components/components.css', `
@keyframes fadeIn
{
  from { opacity: 0; }
  to { opacity: 1; }
}
.nx-component { color: var(--nx-color-primary); }
`)

    writeFileSync(baselinePath, JSON.stringify({
      version: 1,
      allowed: []
    }, null, 2))

    const result = checkUiV2({ baselinePath, updateBaseline: false, uiRoot: dir, skipRequiredFiles: true })
    assert.ok(result.ok, 'Should pass - keyframes with brace on next line should not contaminate')

    console.log('✓ Test 5: @keyframes with brace on next line should not contaminate rest of file')
  } finally {
    cleanup(dir)
  }
}

// Test 6: True selector .legacy-class should trigger violation
{
  const dir = createTempDir()
  const baselinePath = resolve(dir, 'baseline.json')

  try {
    createFixture(dir, 'tokens/colors.css', ':root { --nx-color-primary: #000; }')
    createFixture(dir, 'components/components.css', '.legacy-class {\n  color: red;\n}')

    writeFileSync(baselinePath, JSON.stringify({
      version: 1,
      allowed: []
    }, null, 2))

    const result = checkUiV2({ baselinePath, updateBaseline: false, uiRoot: dir, skipRequiredFiles: true })
    assert.ok(!result.ok, 'Should fail with selector-scope violation')
    const selectorViolation = result.newViolations.find(v => v.rule === 'selector-scope')
    assert.ok(selectorViolation, 'Should detect selector-scope violation')

    console.log('✓ Test 6: True selector .legacy-class should trigger violation')
  } finally {
    cleanup(dir)
  }
}

// Test 7: Multiple rgba() on same line should have different columns
{
  const dir = createTempDir()
  const baselinePath = resolve(dir, 'baseline.json')

  try {
    createFixture(dir, 'tokens/colors.css', ':root { --nx-color-primary: #000; }')
    createFixture(dir, 'components/components.css', '.nx-component { background: linear-gradient(rgba(0,0,0,0.1), rgba(255,255,255,0.2), rgba(128,128,128,0.3)); }')

    writeFileSync(baselinePath, JSON.stringify({
      version: 1,
      allowed: []
    }, null, 2))

    const result = checkUiV2({ baselinePath, updateBaseline: false, uiRoot: dir, skipRequiredFiles: true })
    assert.ok(!result.ok, 'Should fail with color-literal violations')
    const colorViolations = result.newViolations.filter(v => v.rule === 'color-literal')
    assert.strictEqual(colorViolations.length, 3, 'Should detect all 3 rgba() occurrences')
    
    // Check that columns are different
    const columns = colorViolations.map(v => v.column)
    assert.strictEqual(new Set(columns).size, 3, 'Each occurrence should have a different column')

    console.log('✓ Test 7: Multiple rgba() on same line should have different columns')
  } finally {
    cleanup(dir)
  }
}

// Test 8: Colors in inline and multiline comments should not trigger violations
{
  const dir = createTempDir()
  const baselinePath = resolve(dir, 'baseline.json')

  try {
    createFixture(dir, 'tokens/colors.css', ':root { --nx-color-primary: #000; }')
    createFixture(dir, 'components/components.css', `
/* This is a comment with rgba(0,0,0,0.1) inside */
.nx-component {
  /* Another comment with #ff0000 */
  color: var(--nx-color-primary);
  /* Multiline comment
     with rgba(255,255,255,0.2)
     and #00ff00
  */
}
`)

    writeFileSync(baselinePath, JSON.stringify({
      version: 1,
      allowed: []
    }, null, 2))

    const result = checkUiV2({ baselinePath, updateBaseline: false, uiRoot: dir, skipRequiredFiles: true })
    assert.ok(result.ok, 'Should pass - colors in comments should not trigger violations')

    console.log('✓ Test 8: Colors in inline and multiline comments should not trigger violations')
  } finally {
    cleanup(dir)
  }
}

// Test 9: Deterministic ordering
{
  const dir = createTempDir()
  const baselinePath = resolve(dir, 'baseline.json')

  try {
    createFixture(dir, 'tokens/colors.css', ':root { --nx-color-primary: #000; }')
    createFixture(dir, 'components/components.css', '.nx-component { background: rgba(0,0,0,0.1); }')

    writeFileSync(baselinePath, JSON.stringify({
      version: 1,
      allowed: []
    }, null, 2))

    const result1 = checkUiV2({ baselinePath, updateBaseline: false, uiRoot: dir, skipRequiredFiles: true })
    const result2 = checkUiV2({ baselinePath, updateBaseline: false, uiRoot: dir, skipRequiredFiles: true })

    assert.strictEqual(JSON.stringify(result1.newViolations), JSON.stringify(result2.newViolations), 'Results should be deterministic')

    console.log('✓ Test 9: Deterministic ordering')
  } finally {
    cleanup(dir)
  }
}

// Test 10: Normal check should not modify baseline
{
  const dir = createTempDir()
  const baselinePath = resolve(dir, 'baseline.json')

  try {
    createFixture(dir, 'tokens/colors.css', ':root { --nx-color-primary: #000; }')

    writeFileSync(baselinePath, JSON.stringify({
      version: 1,
      allowed: []
    }, null, 2))

    const baselineBefore = readFileSync(baselinePath, 'utf8')

    checkUiV2({ baselinePath, updateBaseline: false, uiRoot: dir, skipRequiredFiles: true })

    const baselineAfter = readFileSync(baselinePath, 'utf8')

    assert.strictEqual(baselineBefore, baselineAfter, 'Baseline should not be modified during check')

    console.log('✓ Test 10: Normal check should not modify baseline')
  } finally {
    cleanup(dir)
  }
}

// Test A: Keyframes with brace on next line and multiline declarations
{
  const dir = createTempDir()
  const baselinePath = resolve(dir, 'baseline.json')

  try {
    createFixture(dir, 'tokens/colors.css', ':root { --nx-color-primary: #000; }')
    createFixture(dir, 'components/components.css', `
@keyframes fadeIn
{
  from {
    opacity: 0;
  }
  50% {
    opacity: 0.5;
  }
  to {
    opacity: 1;
  }
}
.nx-component {
  color: var(--nx-color-primary);
}
`)

    writeFileSync(baselinePath, JSON.stringify({
      version: 1,
      allowed: []
    }, null, 2))

    const result = checkUiV2({ baselinePath, updateBaseline: false, uiRoot: dir, skipRequiredFiles: true })
    assert.ok(result.ok, 'Should pass - no selector-scope violations for keyframe keywords')

    const selectorViolations = result.newViolations ? result.newViolations.filter(v => v.rule === 'selector-scope') : []
    assert.strictEqual(selectorViolations.length, 0, 'Should have no selector-scope violations')

    console.log('✓ Test A: Keyframes with brace on next line and multiline declarations')
  } finally {
    cleanup(dir)
  }
}

// Test B: Keyframes containing motion debt
{
  const dir = createTempDir()
  const baselinePath = resolve(dir, 'baseline.json')

  try {
    createFixture(dir, 'tokens/colors.css', ':root { --nx-color-primary: #000; }')
    createFixture(dir, 'components/components.css', `
@keyframes slowFade
{
  from {
    transition-duration: 400ms;
  }
  to {
    opacity: 1;
  }
}
`)

    writeFileSync(baselinePath, JSON.stringify({
      version: 1,
      allowed: []
    }, null, 2))

    const result = checkUiV2({ baselinePath, updateBaseline: false, uiRoot: dir, skipRequiredFiles: true })
    assert.ok(!result.ok, 'Should fail with motion violation')

    const motionViolations = result.newViolations.filter(v => v.rule === 'motion')
    assert.strictEqual(motionViolations.length, 1, 'Should detect motion violation inside keyframes')
    assert.ok(motionViolations[0].detail.includes('400ms'), 'Should be 400ms violation')

    console.log('✓ Test B: Keyframes containing motion debt')
  } finally {
    cleanup(dir)
  }
}

// Test C: Keyframes containing rgba
{
  const dir = createTempDir()
  const baselinePath = resolve(dir, 'baseline.json')

  try {
    createFixture(dir, 'tokens/colors.css', ':root { --nx-color-primary: #000; }')
    createFixture(dir, 'components/components.css', `
@keyframes glow
{
  from {
    background: rgba(0, 0, 0, 0.2);
  }
}
`)

    writeFileSync(baselinePath, JSON.stringify({
      version: 1,
      allowed: []
    }, null, 2))

    const result = checkUiV2({ baselinePath, updateBaseline: false, uiRoot: dir, skipRequiredFiles: true })
    assert.ok(!result.ok, 'Should fail with color-literal violation')

    const colorViolations = result.newViolations.filter(v => v.rule === 'color-literal')
    assert.strictEqual(colorViolations.length, 1, 'Should detect color-literal inside keyframes')

    console.log('✓ Test C: Keyframes containing rgba')
  } finally {
    cleanup(dir)
  }
}

// Test D: Inline comment before real color
{
  const dir = createTempDir()
  const baselinePath = resolve(dir, 'baseline.json')

  try {
    createFixture(dir, 'tokens/colors.css', ':root { --nx-color-primary: #000; }')
    createFixture(dir, 'components/components.css', '.nx-component {\n  color: /* commentaire rgba(1,2,3,0.4) */ rgba(0,0,0,0.2);\n}')

    writeFileSync(baselinePath, JSON.stringify({
      version: 1,
      allowed: []
    }, null, 2))

    const result = checkUiV2({ baselinePath, updateBaseline: false, uiRoot: dir, skipRequiredFiles: true })
    assert.ok(!result.ok, 'Should fail with color-literal violation')

    const colorViolations = result.newViolations.filter(v => v.rule === 'color-literal')
    assert.strictEqual(colorViolations.length, 1, 'Should detect only the real rgba')
    assert.ok(colorViolations[0].column > 40, 'Column should be after the comment')

    console.log('✓ Test D: Inline comment before real color')
  } finally {
    cleanup(dir)
  }
}

// Test E: Multiline comment with code on closing line
{
  const dir = createTempDir()
  const baselinePath = resolve(dir, 'baseline.json')

  try {
    createFixture(dir, 'tokens/colors.css', ':root { --nx-color-primary: #000; }')
    createFixture(dir, 'components/components.css', '.nx-component {\n  /* Multiline comment\n     with rgba(255,255,255,0.2)\n     and #00ff00\n  */ color: rgba(0,0,0,0.3);\n}')

    writeFileSync(baselinePath, JSON.stringify({
      version: 1,
      allowed: []
    }, null, 2))

    const result = checkUiV2({ baselinePath, updateBaseline: false, uiRoot: dir, skipRequiredFiles: true })
    assert.ok(!result.ok, 'Should fail with color-literal violation')

    const colorViolations = result.newViolations.filter(v => v.rule === 'color-literal')
    assert.strictEqual(colorViolations.length, 1, 'Should detect only the real rgba')
    assert.ok(colorViolations[0].column > 3, 'Column should be after the comment block')

    console.log('✓ Test E: Multiline comment with code on closing line')
  } finally {
    cleanup(dir)
  }
}

console.log('\nAll UI V2 checker integration tests passed!')
