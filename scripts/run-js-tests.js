import { existsSync, readdirSync, statSync } from 'node:fs'
import { isAbsolute, relative, resolve, sep } from 'node:path'
import { spawnSync } from 'node:child_process'

const workspaceRoot = resolve(import.meta.dirname, '..')
const defaultTestRoots = ['js', 'src']
const testFilePattern = /(?:-tests|run-tests)\.js$/

const parseTestRoots = (args) => {
  if (args.length === 0) return defaultTestRoots
  if (args.length !== 2 || args[0] !== '--root' || !args[1]) {
    throw new Error('Usage: node ./scripts/run-js-tests.js [--root <directory>]')
  }

  const requestedRoot = args[1]
  if (isAbsolute(requestedRoot)) {
    throw new Error('The test root must be relative to the workspace')
  }

  const resolvedRoot = resolve(workspaceRoot, requestedRoot)
  const workspaceRelativeRoot = relative(workspaceRoot, resolvedRoot)
  if (workspaceRelativeRoot === '..' || workspaceRelativeRoot.startsWith(`..${sep}`)) {
    throw new Error('The test root must stay inside the workspace')
  }
  if (!existsSync(resolvedRoot) || !statSync(resolvedRoot).isDirectory()) {
    throw new Error(`Test root does not exist or is not a directory: ${requestedRoot}`)
  }

  return [workspaceRelativeRoot]
}

const collectTestFiles = (directory) => readdirSync(directory, { withFileTypes: true })
  .flatMap((entry) => {
    const path = resolve(directory, entry.name)
    if (entry.isDirectory()) return collectTestFiles(path)
    return entry.isFile() && testFilePattern.test(entry.name) ? [path] : []
  })

const testFiles = parseTestRoots(process.argv.slice(2))
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
