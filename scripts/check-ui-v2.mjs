import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs'
import { dirname, extname, relative, resolve } from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

const scriptDirectory = dirname(fileURLToPath(import.meta.url))
const repositoryRoot = resolve(scriptDirectory, '..')
const uiRoot = resolve(repositoryRoot, 'src/ui')
const tokenRoot = resolve(uiRoot, 'tokens')
const testsRoot = resolve(uiRoot, 'tests')
const v2Directories = new Set([
  'tokens',
  'foundation',
  'layout',
  'primitives',
  'components',
  'icons',
  'internal',
  'catalog',
  'tests'
])

const requiredFiles = [
  'tokens/colors.css',
  'tokens/spacing.css',
  'tokens/typography.css',
  'tokens/radius.css',
  'tokens/shadows.css',
  'tokens/motion.css',
  'tokens/breakpoints.css',
  'tokens/z-index.css',
  'foundation/reset.css',
  'foundation/base.css',
  'foundation/accessibility.css',
  'foundation/utilities.css',
  'layout/AppShell.js',
  'layout/PageHeader.js',
  'layout/Stack.js',
  'layout/Cluster.js',
  'layout/Divider.js',
  'primitives/Button.js',
  'primitives/Card.js',
  'primitives/Input.js',
  'primitives/Badge.js',
  'primitives/Chip.js',
  'primitives/Progress.js',
  'components/MetricCard.js',
  'components/CoachCard.js',
  'components/GoalCard.js',
  'components/Modal.js',
  'components/Toast.js',
  'components/Skeleton.js',
  'components/SectionHeader.js',
  'components/EmptyState.js',
  'components/LoadingState.js',
  'components/StatRow.js',
  'icons/index.js',
  'index.js',
  'index.css'
]

function listFiles(directory) {
  if (!existsSync(directory)) return []
  return readdirSync(directory).flatMap((name) => {
    const path = resolve(directory, name)
    return statSync(path).isDirectory() ? listFiles(path) : [path]
  })
}

function relativeToUi(path, uiRoot) {
  return relative(uiRoot, path).split('\\').join('/')
}

function addIssue(issues, file, rule, detail, line = null, column = null, uiRoot) {
  const fingerprint = {
    file: relativeToUi(file, uiRoot),
    rule,
    line,
    column,
    detail
  }
  issues.push(fingerprint)
}

function isUiTest(file, testsRoot) {
  return file.startsWith(testsRoot)
}

function isUiV2File(file, uiRoot) {
  const relativePath = relative(uiRoot, file)
  if (relativePath === 'index.js' || relativePath === 'index.css') return true
  return v2Directories.has(relativePath.split('/')[0])
}

function checkImports(file, source, issues, uiRoot, testsRoot) {
  if (isUiTest(file, testsRoot)) return
  const importPattern = /(?:import|export)\s+(?:[^'";]*?\s+from\s+)?['"]([^'"]+)['"]/g
  for (const match of source.matchAll(importPattern)) {
    const specifier = match[1]
    if (!specifier.startsWith('.')) {
      addIssue(issues, file, 'imports', `external import "${specifier}" is not allowed`, null, null, uiRoot)
      continue
    }
    const resolved = resolve(dirname(file), specifier)
    if (!resolved.startsWith(uiRoot)) {
      addIssue(issues, file, 'imports', `import escapes src/ui: "${specifier}"`, null, null, uiRoot)
    }
    if (/(supabase|storage|finance|coach\/engine|services?|advisor|treasury|goals|debt)/i.test(specifier)) {
      addIssue(issues, file, 'imports', `business or data import "${specifier}" is not allowed`, null, null, uiRoot)
    }
  }
}

function checkJavaScript(file, source, issues, uiRoot, testsRoot) {
  checkImports(file, source, issues, uiRoot, testsRoot)
  if (isUiTest(file, testsRoot)) return

  if (/\bstyle\s*=|\.style(?:\.|\[)/.test(source)) {
    addIssue(issues, file, 'inline-style', 'inline style mutation or attribute detected', null, null, uiRoot)
  }

  const classLiterals = [
    ...[...source.matchAll(/className\s*=\s*(['"`])([\s\S]*?)\1/g)].map((match) => match[2]),
    ...[...source.matchAll(/classList\.(?:add|remove|toggle)\(([^)]*)\)/g)]
      .flatMap((match) => [...match[1].matchAll(/(['"`])([^'"`]+)\1/g)].map((literal) => literal[2]))
  ]
  for (const classLiteral of classLiterals) {
    const literal = classLiteral.replace(/\$\{[^}]+\}/g, '').trim()
    const classes = literal.split(/\s+/).filter(Boolean)
    const invalid = classes.find((name) => !name.startsWith('nx-'))
    if (invalid) addIssue(issues, file, 'class-prefix', `class "${invalid}" is not prefixed`, null, null, uiRoot)
  }
}

function checkCss(file, source, issues, tokenRoot, uiRoot) {
  // Remove CSS comments while preserving line positions
  const sourceWithoutComments = source.replace(/\/\*[\s\S]*?\*\//g, (match) => {
    // Replace with same number of newlines to preserve line numbers
    const newlineCount = (match.match(/\n/g) || []).length
    return '\n'.repeat(newlineCount)
  })

  const lines = sourceWithoutComments.split(/\r?\n/)
  const relativePath = relativeToUi(file, uiRoot)

  // Track if we're inside a @keyframes block
  let inKeyframes = false
  let keyframeDepth = 0

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const trimmedLine = line.trim()
    const lineNumber = i + 1

    // Track @keyframes blocks more robustly (handle brace on same line or next line)
    if (trimmedLine.startsWith('@keyframes')) {
      inKeyframes = true
      keyframeDepth = (trimmedLine.match(/{/g) || []).length - (trimmedLine.match(/}/g) || []).length
      if (keyframeDepth <= 0) {
        inKeyframes = false
        keyframeDepth = 0
      }
      continue
    }

    if (inKeyframes) {
      // Count braces to track nested blocks
      keyframeDepth += (trimmedLine.match(/{/g) || []).length
      keyframeDepth -= (trimmedLine.match(/}/g) || []).length

      if (keyframeDepth <= 0) {
        inKeyframes = false
        keyframeDepth = 0
      }
      continue // Skip all lines inside @keyframes
    }

    // Motion check with column tracking
    for (const match of line.matchAll(/([\d.]+)(ms|s)\b/g)) {
      const numeric = Number(match[1])
      const duration = match[2] === 's' ? numeric * 1000 : numeric
      if (duration > 250) {
        const column = match.index + 1
        addIssue(issues, file, 'motion', `${match[0]} exceeds 250ms`, lineNumber, column, uiRoot)
      }
    }

    // Color literal check (comments already removed, tokenRoot check still applies)
    if (!file.startsWith(tokenRoot)) {
      for (const match of line.matchAll(/#[\da-f]{3,8}\b|(?:rgb|hsl)a?\(/gi)) {
        const column = match.index + 1
        addIssue(issues, file, 'color-literal', `literal "${match[0]}" must be a token`, lineNumber, column, uiRoot)
      }
    }

    // Font size check
    const fontSizeMatch = line.match(/font-size\s*:\s*([\d.]+)px/)
    if (fontSizeMatch && Number(fontSizeMatch[1]) < 12) {
      const column = fontSizeMatch.index + 1
      addIssue(issues, file, 'font-size', `${fontSizeMatch[1]}px is below 12px`, lineNumber, column, uiRoot)
    }

    // Selector scope check (only in primitives/components/layout) - use relative path
    if (relativePath.startsWith('primitives/') || relativePath.startsWith('components/') || relativePath.startsWith('layout/') ||
        relativePath.includes('/primitives/') || relativePath.includes('/components/') || relativePath.includes('/layout/')) {
      if (trimmedLine.endsWith('{') && !trimmedLine.startsWith('@') && !inKeyframes) {
        const selector = trimmedLine.slice(0, -1).trim()
        if (selector && !selector.startsWith('.nx-')) {
          const column = line.indexOf(selector) + 1
          addIssue(issues, file, 'selector-scope', `unsafe selector "${selector}"`, lineNumber, column, uiRoot)
        }
      }
    }
  }
}

export function checkUiV2(options = {}) {
  const {
    baselinePath = null,
    updateBaseline = false,
    uiRoot: customUiRoot = null,
    skipRequiredFiles = false
  } = options

  const actualUiRoot = customUiRoot || uiRoot
  const actualTokenRoot = resolve(actualUiRoot, 'tokens')
  const actualTestsRoot = resolve(actualUiRoot, 'tests')

  const issues = []

  if (!skipRequiredFiles) {
    for (const required of requiredFiles) {
      if (!existsSync(resolve(actualUiRoot, required))) {
        issues.push({
          file: required,
          rule: 'required-file',
          line: null,
          detail: 'missing'
        })
      }
    }
  }

  for (const file of listFiles(actualUiRoot)) {
    if (!isUiV2File(file, actualUiRoot)) continue
    const extension = extname(file)
    if (!['.js', '.css'].includes(extension)) continue
    const source = readFileSync(file, 'utf8')
    if (extension === '.js') checkJavaScript(file, source, issues, actualUiRoot, actualTestsRoot)
    if (extension === '.css') checkCss(file, source, issues, actualTokenRoot, actualUiRoot)
  }

  // Sort issues deterministically
  issues.sort((a, b) => {
    if (a.file !== b.file) return a.file.localeCompare(b.file)
    if (a.rule !== b.rule) return a.rule.localeCompare(b.rule)
    if (a.line !== b.line) return (a.line || 0) - (b.line || 0)
    if (a.column !== b.column) return (a.column || 0) - (b.column || 0)
    return a.detail.localeCompare(b.detail)
  })

  // Handle baseline
  if (baselinePath) {
    return checkAgainstBaseline(issues, baselinePath, updateBaseline)
  }

  if (issues.length) {
    console.error('Nexora UI V2 architecture violations:')
    issues.forEach((issue) => {
      const lineInfo = issue.line ? `:${issue.line}` : ''
      const columnInfo = issue.column ? `:${issue.column}` : ''
      console.error(`- ${issue.file}${lineInfo}${columnInfo} [${issue.rule}] ${issue.detail}`)
    })
    return { ok: false, issues }
  }

  console.info('Nexora UI V2 architecture check passed.')
  return { ok: true, issues: [] }
}

function checkAgainstBaseline(issues, baselinePath, updateBaseline) {
  let baseline = { version: 1, allowed: [] }
  if (existsSync(baselinePath)) {
    baseline = JSON.parse(readFileSync(baselinePath, 'utf8'))
  }

  if (updateBaseline) {
    baseline.allowed = issues.map(issue => ({
      file: issue.file,
      rule: issue.rule,
      line: issue.line,
      column: issue.column,
      detail: issue.detail
    }))
    writeFileSync(baselinePath, JSON.stringify(baseline, null, 2) + '\n', 'utf8')
    console.log(`UI V2 baseline updated with ${issues.length} allowed violations`)
    return { ok: true, issues, baselineUpdated: true }
  }

  // Create fingerprint for each issue
  const currentFingerprints = new Set(
    issues.map(issue => JSON.stringify({
      file: issue.file,
      rule: issue.rule,
      line: issue.line,
      column: issue.column,
      detail: issue.detail
    }))
  )

  const baselineFingerprints = new Set(
    baseline.allowed.map(entry => JSON.stringify(entry))
  )

  // New violations (in current but not in baseline)
  const newViolations = issues.filter(issue => {
    const fp = JSON.stringify({
      file: issue.file,
      rule: issue.rule,
      line: issue.line,
      column: issue.column,
      detail: issue.detail
    })
    return !baselineFingerprints.has(fp)
  })

  // Resolved violations (in baseline but not in current)
  const resolvedViolations = baseline.allowed.filter(entry => {
    const fp = JSON.stringify(entry)
    return !currentFingerprints.has(fp)
  })

  if (newViolations.length > 0) {
    console.error('New UI V2 architecture violations:')
    newViolations.forEach((issue) => {
      const lineInfo = issue.line ? `:${issue.line}` : ''
      const columnInfo = issue.column ? `:${issue.column}` : ''
      console.error(`- ${issue.file}${lineInfo}${columnInfo} [${issue.rule}] ${issue.detail}`)
    })
    return { ok: false, issues: newViolations, newViolations, resolvedViolations }
  }

  if (resolvedViolations.length > 0) {
    console.error('UI V2 baseline is outdated - these violations are resolved but still in baseline:')
    resolvedViolations.forEach((entry) => {
      const lineInfo = entry.line ? `:${entry.line}` : ''
      const columnInfo = entry.column ? `:${entry.column}` : ''
      console.error(`- ${entry.file}${lineInfo}${columnInfo} [${entry.rule}] ${entry.detail}`)
    })
    console.error('Run npm run architecture:ui:baseline to update the baseline')
    return { ok: false, issues: [], newViolations, resolvedViolations }
  }

  const knownDebtCount = issues.length
  console.log(`UI V2 architecture check passed with ${knownDebtCount} known debt entries`)
  return { ok: true, issues, knownDebtCount }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2)
  const updateBaseline = args.includes('--update-baseline')
  const baselinePath = resolve(scriptDirectory, 'ui-v2-baseline.json')

  const result = checkUiV2({ baselinePath, updateBaseline })
  process.exitCode = result.ok ? 0 : 1
}
