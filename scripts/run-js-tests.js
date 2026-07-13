import { readdirSync } from 'node:fs'
import { relative, resolve } from 'node:path'
import { spawnSync } from 'node:child_process'

const workspaceRoot = resolve(import.meta.dirname, '..')
const testRoots = ['js', 'src']
const testFilePattern = /(?:-tests|run-tests)\.js$/

const collectTestFiles = (directory) => readdirSync(directory, { withFileTypes: true })
  .flatMap((entry) => {
    const path = resolve(directory, entry.name)
    if (entry.isDirectory()) return collectTestFiles(path)
    return entry.isFile() && testFilePattern.test(entry.name) ? [path] : []
  })

const testFiles = testRoots
  .flatMap((directory) => collectTestFiles(resolve(workspaceRoot, directory)))
  .sort((left, right) => left.localeCompare(right))

if (testFiles.length === 0) {
  throw new Error('No JavaScript test files were discovered')
}

for (const testFile of testFiles) {
  console.info(`\n=== ${relative(workspaceRoot, testFile)} ===`)

  const result = spawnSync(process.execPath, [testFile], {
    cwd: workspaceRoot,
    env: process.env,
    stdio: 'inherit'
  })

  if (result.error) throw result.error
  if (result.status !== 0) process.exit(result.status ?? 1)
}

console.info(`\nJavaScript tests: ${testFiles.length} file(s) passed`)
