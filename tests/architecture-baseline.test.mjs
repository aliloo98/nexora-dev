import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { collectBaseline, writeBaseline } from '../scripts/architecture-baseline.mjs'
import { checkArchitectureBaseline } from '../scripts/check-architecture-baseline.mjs'

function createTempRepo() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'nexora-baseline-'))
  fs.mkdirSync(path.join(dir, 'src'), { recursive: true })
  fs.mkdirSync(path.join(dir, 'tests'), { recursive: true })
  fs.mkdirSync(path.join(dir, 'scripts'), { recursive: true })
  fs.mkdirSync(path.join(dir, 'dist'), { recursive: true })
  return dir
}

test('excludes dist and node_modules from production metrics', () => {
  const dir = createTempRepo()
  fs.writeFileSync(path.join(dir, 'src', 'app.js'), 'export const value = 1\n')
  fs.writeFileSync(path.join(dir, 'dist', 'bundle.js'), 'console.log(1)\n')
  fs.mkdirSync(path.join(dir, 'node_modules', 'pkg'), { recursive: true })
  fs.writeFileSync(path.join(dir, 'node_modules', 'pkg', 'index.js'), 'console.log(2)\n')
  const baseline = collectBaseline(dir)
  assert.deepEqual(baseline.production.files, ['src/app.js'])
  assert.equal(baseline.production.lineCount, 1)
})

test('separates production and test files', () => {
  const dir = createTempRepo()
  fs.writeFileSync(path.join(dir, 'src', 'app.js'), 'export const value = 1\n')
  fs.writeFileSync(path.join(dir, 'src', 'app-tests.js'), 'test("demo", () => {})\n')
  fs.writeFileSync(path.join(dir, 'tests', 'helper.test.js'), 'it("works", () => {})\n')
  const baseline = collectBaseline(dir)
  assert.deepEqual(baseline.production.files, ['src/app.js'])
  assert.equal(baseline.tests.files.length, 2)
})

test('detects window assignments', () => {
  const dir = createTempRepo()
  fs.writeFileSync(path.join(dir, 'src', 'app.js'), 'window.foo = 1\n')
  const baseline = collectBaseline(dir)
  assert.equal(baseline.production.windowAssignments, 1)
})

test('detects a simple dependency cycle', () => {
  const dir = createTempRepo()
  fs.writeFileSync(path.join(dir, 'src', 'a.js'), 'import { x } from "./b.js"\nexport const x = 1\n')
  fs.writeFileSync(path.join(dir, 'src', 'b.js'), 'import { x } from "./a.js"\nexport const y = 2\n')
  const baseline = collectBaseline(dir)
  assert.equal(baseline.dependencies.cycles.length, 1)
})

test('detects unresolved relative imports', () => {
  const dir = createTempRepo()
  fs.writeFileSync(path.join(dir, 'src', 'app.js'), 'import { x } from "./missing.js"\n')
  const baseline = collectBaseline(dir)
  assert.equal(baseline.dependencies.unresolvedImports.length, 1)
})

test('produces deterministic output', () => {
  const dir = createTempRepo()
  fs.writeFileSync(path.join(dir, 'src', 'app.js'), 'export const value = 1\n')
  const first = collectBaseline(dir)
  const second = collectBaseline(dir)
  assert.deepEqual(first, second)
})

test('returns success when values remain equal to the baseline', () => {
  const dir = createTempRepo()
  fs.writeFileSync(path.join(dir, 'src', 'app.js'), 'export const value = 1\n')
  const baselinePath = path.join(dir, 'architecture-baseline.json')
  writeBaseline(dir, baselinePath)
  const result = checkArchitectureBaseline(dir, baselinePath)
  assert.equal(result.ok, true)
})

test('fails on a blocking regression', () => {
  const dir = createTempRepo()
  fs.writeFileSync(path.join(dir, 'src', 'app.js'), 'window.foo = 1\n')
  const baselinePath = path.join(dir, 'architecture-baseline.json')
  const baseline = {
    production: {
      windowAssignments: 0,
      filesOver1000Lines: [],
      filesOver700Lines: []
    },
    dependencies: {
      cycles: [],
      unresolvedImports: []
    }
  }
  fs.writeFileSync(baselinePath, JSON.stringify(baseline, null, 2))
  const result = checkArchitectureBaseline(dir, baselinePath)
  assert.equal(result.ok, false)
  assert.equal(result.issues.length, 1)
})
