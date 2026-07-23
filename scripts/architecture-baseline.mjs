import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const repoRoot = path.resolve(__dirname, '..')

const EXCLUDED_DIRS = new Set(['node_modules', 'dist', 'test-results', 'test-screenshots', 'coverage', '.git', 'design'])
const PRODUCTION_ROOTS = ['src', 'js']
const TOOLING_ROOTS = ['scripts', 'tools']
const TOOLING_CONFIG_FILES = ['vite.config.js', 'playwright.config.js', 'validate-couple-mode.js']

function normalizeRel(filePath, rootDir) {
  return path.relative(rootDir, filePath).split(path.sep).join('/')
}

function isExcluded(relPath) {
  const parts = relPath.split('/')
  return parts.some((part) => EXCLUDED_DIRS.has(part)) || relPath.startsWith('design/')
}

function listFiles(rootDir, predicate) {
  const result = []
  const stack = [rootDir]
  while (stack.length > 0) {
    const current = stack.pop()
    if (!fs.existsSync(current)) continue
    const entries = fs.readdirSync(current, { withFileTypes: true })
    for (const entry of entries) {
      const fullPath = path.join(current, entry.name)
      const relPath = normalizeRel(fullPath, rootDir)
      if (entry.isDirectory()) {
        if (!isExcluded(relPath) && !EXCLUDED_DIRS.has(entry.name)) {
          stack.push(fullPath)
        }
      } else if (entry.isFile()) {
        if (!isExcluded(relPath) && predicate(fullPath, relPath)) {
          result.push(fullPath)
        }
      }
    }
  }
  return result.sort((a, b) => a.localeCompare(b))
}

function stripCommentsAndStrings(code) {
  let result = ''
  let i = 0
  let state = 'code'
  let quote = null
  let escape = false

  while (i < code.length) {
    const char = code[i]
    const next = code[i + 1]

    if (state === 'code') {
      if (char === '/' && next === '/') {
        result += '\n'
        i += 2
        while (i < code.length && code[i] !== '\n') {
          i += 1
        }
        continue
      }
      if (char === '/' && next === '*') {
        result += '\n'
        i += 2
        while (i < code.length && !(code[i] === '*' && code[i + 1] === '/')) {
          if (code[i] === '\n') result += '\n'
          i += 1
        }
        i += 2
        continue
      }
      if (char === '"' || char === "'" || char === '`') {
        state = 'string'
        quote = char
        result += ' '
        i += 1
        continue
      }
      result += char
      i += 1
      continue
    }

    if (state === 'string') {
      if (escape) {
        escape = false
        result += ' '
        i += 1
        continue
      }
      if (char === '\\') {
        escape = true
        result += ' '
        i += 1
        continue
      }
      if (char === quote) {
        state = 'code'
        quote = null
        result += ' '
        i += 1
        continue
      }
      if (char === '\n') {
        result += '\n'
      } else {
        result += ' '
      }
      i += 1
    }
  }

  return result
}

function countRegex(code, regex) {
  return (code.match(regex) || []).length
}

function stripCommentsPreserveStrings(code) {
  let result = ''
  let i = 0
  let state = 'code'
  let quote = null
  let escape = false

  while (i < code.length) {
    const char = code[i]
    const next = code[i + 1]

    if (state === 'code') {
      if (char === '/' && next === '/') {
        result += '\n'
        i += 2
        while (i < code.length && code[i] !== '\n') {
          i += 1
        }
        continue
      }
      if (char === '/' && next === '*') {
        result += '\n'
        i += 2
        while (i < code.length && !(code[i] === '*' && code[i + 1] === '/')) {
          if (code[i] === '\n') result += '\n'
          i += 1
        }
        i += 2
        continue
      }
      if (char === '"' || char === "'" || char === '`') {
        state = 'string'
        quote = char
        result += char
        i += 1
        continue
      }
      result += char
      i += 1
      continue
    }

    if (state === 'string') {
      if (escape) {
        escape = false
        result += char
        i += 1
        continue
      }
      if (char === '\\') {
        escape = true
        result += char
        i += 1
        continue
      }
      if (char === quote) {
        state = 'code'
        result += char
        i += 1
        continue
      }
      result += char
      i += 1
    }
  }

  return result
}

function countLogicalLines(raw) {
  if (raw.length === 0) return 0
  const lines = raw.split(/\r?\n/)
  if (raw.endsWith('\n') || raw.endsWith('\r')) {
    return Math.max(0, lines.length - 1)
  }
  return lines.length
}

function getMedian(values) {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1] + sorted[mid]) / 2
  }
  return sorted[mid]
}

function collectProductionMetrics(rootDir, files) {
  const contents = []
  const lineCounts = []
  const topFiles = []
  let staticImports = 0
  let staticExports = 0
  let windowRefs = 0
  let windowAssignments = 0
  let documentRefs = 0
  let localStorageRefs = 0
  let todoFixmeCount = 0
  let consoleLog = 0
  let consoleInfo = 0
  let consoleWarn = 0
  let consoleError = 0
  let consoleDebug = 0

  for (const file of files) {
    const relPath = normalizeRel(file, rootDir)
    const raw = fs.readFileSync(file, 'utf8')
    const cleaned = stripCommentsAndStrings(raw)
    const lines = countLogicalLines(raw)
    lineCounts.push(lines)
    contents.push({ file: relPath, lines, raw, cleaned })

    staticImports += countRegex(cleaned, /\bimport\b/g)
    staticExports += countRegex(cleaned, /\bexport\b/g)
    windowRefs += countRegex(cleaned, /\bwindow\./g)
    windowAssignments += countRegex(cleaned, /\bwindow\.[A-Za-z_$][\w$]*\s*(\+=|-=|\*=|\/=|%=|&&=|\|\|=|\?=|=)/g)
    documentRefs += countRegex(cleaned, /\bdocument\./g)
    localStorageRefs += countRegex(cleaned, /\blocalStorage\./g)
    todoFixmeCount += countRegex(cleaned, /\b(TODO|FIXME)\b/g)
    consoleLog += countRegex(cleaned, /\bconsole\.log\s*\(/g)
    consoleInfo += countRegex(cleaned, /\bconsole\.info\s*\(/g)
    consoleWarn += countRegex(cleaned, /\bconsole\.warn\s*\(/g)
    consoleError += countRegex(cleaned, /\bconsole\.error\s*\(/g)
    consoleDebug += countRegex(cleaned, /\bconsole\.debug\s*\(/g)
  }

  topFiles.push(...contents.map(({ file, lines }) => ({ file, lines })).sort((a, b) => b.lines - a.lines || a.file.localeCompare(b.file)).slice(0, 20))

  return {
    files: contents.map(({ file }) => file).sort((a, b) => a.localeCompare(b)),
    lineCount: lineCounts.reduce((sum, value) => sum + value, 0),
    averageLinesPerFile: lineCounts.length === 0 ? 0 : Number((lineCounts.reduce((sum, value) => sum + value, 0) / lineCounts.length).toFixed(2)),
    medianLinesPerFile: getMedian(lineCounts),
    largestFiles: topFiles,
    staticImports,
    staticExports,
    windowRefs,
    windowAssignments,
    documentRefs,
    localStorageRefs,
    todoFixmeCount,
    consoleLog,
    consoleInfo,
    consoleWarn,
    consoleError,
    consoleDebug,
    filesOver700Lines: contents.filter(({ lines }) => lines > 700).map(({ file }) => file).sort((a, b) => a.localeCompare(b)),
    filesOver1000Lines: contents.filter(({ lines }) => lines > 1000).map(({ file }) => file).sort((a, b) => a.localeCompare(b))
  }
}

function collectTestMetrics(rootDir, files) {
  const testFiles = files.map((file) => normalizeRel(file, rootDir)).sort((a, b) => a.localeCompare(b))
  let testCaseCount = 0
  let itCount = 0
  let describeCount = 0
  for (const file of files) {
    const raw = fs.readFileSync(file, 'utf8')
    const cleaned = stripCommentsAndStrings(raw)
    testCaseCount += countRegex(cleaned, /\btest\s*\(/g)
    itCount += countRegex(cleaned, /\bit\s*\(/g)
    describeCount += countRegex(cleaned, /\bdescribe\s*\(/g)
  }
  return {
    files: testFiles,
    testCaseCount,
    itCaseCount: itCount,
    describeCount,
    playwrightFiles: []
  }
}

function collectPlaywrightMetrics(rootDir, files) {
  const metrics = files.map((file) => normalizeRel(file, rootDir)).sort((a, b) => a.localeCompare(b))
  let playwrightCaseCount = 0
  for (const file of files) {
    const raw = fs.readFileSync(file, 'utf8')
    const cleaned = stripCommentsAndStrings(raw)
    playwrightCaseCount += countRegex(cleaned, /\btest\s*\(/g)
  }
  return {
    files: metrics,
    playwrightCaseCount
  }
}

function collectToolingMetrics(rootDir, files) {
  return {
    files: files.map((file) => normalizeRel(file, rootDir)).sort((a, b) => a.localeCompare(b))
  }
}

function collectDependencyMetrics(rootDir, productionFiles) {
  const fileMap = new Map(productionFiles.map((file) => [normalizeRel(file, rootDir), file]))
  const graph = new Map()
  const unresolvedImports = []
  const incoming = new Map()
  const outgoing = new Map()

  for (const relPath of fileMap.keys()) {
    incoming.set(relPath, 0)
    outgoing.set(relPath, 0)
  }

  for (const [relPath, file] of fileMap.entries()) {
    const raw = fs.readFileSync(file, 'utf8')
    const cleaned = stripCommentsPreserveStrings(raw)
    const regex = /(?:import|export)\s+(?:[^'";]*?\s+from\s+)?['"]([^'"]+)['"]/g
    const matches = [...cleaned.matchAll(regex)]
    const deps = []
    for (const match of matches) {
      const spec = match[1]
      if (!spec || !spec.startsWith('.')) continue
      const resolved = path.resolve(path.dirname(file), spec)
      const candidates = [
        resolved,
        `${resolved}.js`,
        `${resolved}.ts`,
        `${resolved}.mjs`,
        `${resolved}.cjs`,
        path.join(resolved, 'index.js'),
        path.join(resolved, 'index.ts')
      ]
      const resolvedFile = candidates.find((candidate) => fs.existsSync(candidate))
      if (!resolvedFile) {
        unresolvedImports.push({ source: relPath, spec })
        continue
      }
      const resolvedRel = normalizeRel(resolvedFile, rootDir)
      if (!fileMap.has(resolvedRel)) continue
      deps.push(resolvedRel)
    }
    graph.set(relPath, deps)
  }

  for (const [source, deps] of graph.entries()) {
    outgoing.set(source, deps.length)
    for (const dep of deps) {
      incoming.set(dep, (incoming.get(dep) || 0) + 1)
    }
  }

  const cycles = []
  const visited = new Set()
  const pathStack = []
  const stackSet = new Set()

  const visit = (node) => {
    visited.add(node)
    pathStack.push(node)
    stackSet.add(node)
    const deps = graph.get(node) || []
    for (const dep of deps) {
      if (!visited.has(dep)) {
        visit(dep)
      } else if (stackSet.has(dep)) {
        const startIndex = pathStack.indexOf(dep)
        if (startIndex >= 0) {
          cycles.push([...pathStack.slice(startIndex), dep])
        }
      }
    }
    pathStack.pop()
    stackSet.delete(node)
  }

  for (const node of [...graph.keys()].sort()) {
    if (!visited.has(node)) visit(node)
  }

  const uniqueCycles = Array.from(new Map(cycles.map((cycle) => [cycle.join('->'), cycle])).values())

  const incomingSorted = [...incoming.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
  const outgoingSorted = [...outgoing.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))

  return {
    internalDependencies: [...graph.values()].reduce((sum, deps) => sum + deps.length, 0),
    cycles: uniqueCycles,
    unresolvedImports: unresolvedImports.sort((a, b) => a.source.localeCompare(b.source) || a.spec.localeCompare(b.spec)),
    modulesWithoutIncomingImports: [...incoming.entries()].filter(([, count]) => count === 0).map(([name]) => name).sort((a, b) => a.localeCompare(b)),
    modulesWithMostOutgoingDependencies: outgoingSorted.slice(0, 10).map(([name, count]) => ({ name, count })),
    modulesWithMostIncomingDependencies: incomingSorted.slice(0, 10).map(([name, count]) => ({ name, count }))
  }
}

export function collectBaseline(rootDir = repoRoot) {
  const productionFiles = listFiles(rootDir, (filePath, relPath) => {
    const ext = path.extname(filePath)
    if (!['.js', '.ts', '.mjs', '.cjs'].includes(ext)) return false
    if (!PRODUCTION_ROOTS.some((root) => relPath.startsWith(`${root}/`) || relPath === root)) return false
    return !/(^|\/)[^/]*-tests\.js$/.test(relPath) && !/\.test\.js$/.test(relPath)
  })

  const unitTestFiles = listFiles(rootDir, (filePath, relPath) => {
    const ext = path.extname(filePath)
    if (!['.js', '.ts', '.mjs', '.cjs'].includes(ext)) return false
    return /(^|\/)[^/]*-tests\.js$/.test(relPath) || /\.test\.js$/.test(relPath) || relPath.startsWith('tests/') && !relPath.includes('/playwright/')
  })

  const playwrightFiles = listFiles(rootDir, (filePath, relPath) => {
    const ext = path.extname(filePath)
    if (!['.js', '.ts', '.mjs', '.cjs'].includes(ext)) return false
    return relPath.includes('/playwright/') || /\.spec\.(js|ts)$/.test(relPath)
  })

  const toolingFiles = listFiles(rootDir, (filePath, relPath) => {
    const ext = path.extname(filePath)
    if (!['.js', '.ts', '.mjs', '.cjs'].includes(ext)) return false
    if (TOOLING_ROOTS.some((root) => relPath.startsWith(`${root}/`) || relPath === root)) return true
    return TOOLING_CONFIG_FILES.includes(path.basename(filePath))
  })

  return {
    production: collectProductionMetrics(rootDir, productionFiles),
    tests: collectTestMetrics(rootDir, unitTestFiles),
    playwright: collectPlaywrightMetrics(rootDir, playwrightFiles),
    tooling: collectToolingMetrics(rootDir, toolingFiles),
    dependencies: collectDependencyMetrics(rootDir, productionFiles)
  }
}

export function writeBaseline(rootDir = repoRoot, outputPath = path.join(rootDir, 'architecture-baseline.json')) {
  const baseline = collectBaseline(rootDir)
  const output = JSON.stringify(sortObject(baseline), null, 2) + '\n'
  fs.writeFileSync(outputPath, output, 'utf8')
  return baseline
}

function sortObject(value) {
  if (Array.isArray(value)) {
    return value.map(sortObject)
  }
  if (value && typeof value === 'object') {
    const result = {}
    for (const key of Object.keys(value).sort()) {
      result[key] = sortObject(value[key])
    }
    return result
  }
  return value
}

function main() {
  const targetRoot = process.argv[2] ? path.resolve(process.cwd(), process.argv[2]) : repoRoot
  const outputPath = process.argv[3] ? path.resolve(process.cwd(), process.argv[3]) : path.join(targetRoot, 'architecture-baseline.json')
  writeBaseline(targetRoot, outputPath)
  process.stdout.write(`Wrote ${normalizeRel(outputPath, targetRoot)}\n`)
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main()
}
