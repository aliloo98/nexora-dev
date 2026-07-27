import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
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

function relativeToUi(path) {
  return relative(uiRoot, path).split('\\').join('/')
}

function addIssue(issues, file, rule, detail) {
  issues.push(`${relativeToUi(file)} [${rule}] ${detail}`)
}

function isUiTest(file) {
  return file.startsWith(testsRoot)
}

function isUiV2File(file) {
  const relativePath = relativeToUi(file)
  if (relativePath === 'index.js' || relativePath === 'index.css') return true
  return v2Directories.has(relativePath.split('/')[0])
}

function checkImports(file, source, issues) {
  if (isUiTest(file)) return
  const importPattern = /(?:import|export)\s+(?:[^'";]*?\s+from\s+)?['"]([^'"]+)['"]/g
  for (const match of source.matchAll(importPattern)) {
    const specifier = match[1]
    if (!specifier.startsWith('.')) {
      addIssue(issues, file, 'imports', `external import "${specifier}" is not allowed`)
      continue
    }
    const resolved = resolve(dirname(file), specifier)
    if (!resolved.startsWith(uiRoot)) {
      addIssue(issues, file, 'imports', `import escapes src/ui: "${specifier}"`)
    }
    if (/(supabase|storage|finance|coach\/engine|services?|advisor|treasury|goals|debt)/i.test(specifier)) {
      addIssue(issues, file, 'imports', `business or data import "${specifier}" is not allowed`)
    }
  }
}

function checkJavaScript(file, source, issues) {
  checkImports(file, source, issues)
  if (isUiTest(file)) return

  if (/\bstyle\s*=|\.style(?:\.|\[)/.test(source)) {
    addIssue(issues, file, 'inline-style', 'inline style mutation or attribute detected')
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
    if (invalid) addIssue(issues, file, 'class-prefix', `class "${invalid}" is not prefixed`)
  }
}

function checkCss(file, source, issues) {
  for (const match of source.matchAll(/([\d.]+)(ms|s)\b/g)) {
    const numeric = Number(match[1])
    const duration = match[2] === 's' ? numeric * 1000 : numeric
    if (duration > 250) addIssue(issues, file, 'motion', `${match[0]} exceeds 250ms`)
  }

  if (!file.startsWith(tokenRoot)) {
    const colorLiteral = source.match(/#[\da-f]{3,8}\b|(?:rgb|hsl)a?\(/i)
    if (colorLiteral) addIssue(issues, file, 'color-literal', `literal "${colorLiteral[0]}" must be a token`)
  }

  for (const match of source.matchAll(/font-size\s*:\s*([\d.]+)px/g)) {
    if (Number(match[1]) < 12) addIssue(issues, file, 'font-size', `${match[1]}px is below 12px`)
  }

  if (file.includes('/primitives/') || file.includes('/components/') || file.includes('/layout/')) {
    const selectorLines = source.split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.endsWith('{') && !line.startsWith('@') && line !== 'to {')
    for (const line of selectorLines) {
      if (!line.startsWith('.nx-')) {
        addIssue(issues, file, 'selector-scope', `unsafe selector "${line.slice(0, -1).trim()}"`)
      }
    }
  }
}

export function checkUiV2() {
  const issues = []
  for (const required of requiredFiles) {
    if (!existsSync(resolve(uiRoot, required))) {
      issues.push(`${required} [required-file] missing`)
    }
  }

  for (const file of listFiles(uiRoot)) {
    if (!isUiV2File(file)) continue
    const extension = extname(file)
    if (!['.js', '.css'].includes(extension)) continue
    const source = readFileSync(file, 'utf8')
    if (extension === '.js') checkJavaScript(file, source, issues)
    if (extension === '.css') checkCss(file, source, issues)
  }

  if (issues.length) {
    console.error('Nexora UI V2 architecture violations:')
    issues.forEach((issue) => console.error(`- ${issue}`))
    return { ok: false, issues }
  }

  console.info('Nexora UI V2 architecture check passed.')
  return { ok: true, issues: [] }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const result = checkUiV2()
  process.exitCode = result.ok ? 0 : 1
}
