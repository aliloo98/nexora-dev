import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { collectBaseline } from './architecture-baseline.mjs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const repoRoot = path.resolve(__dirname, '..')

function formatValue(value) {
  return typeof value === 'number' ? value : JSON.stringify(value)
}

function readBaseline(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'))
}

export function checkArchitectureBaseline(rootDir = repoRoot, baselinePath = path.join(rootDir, 'architecture-baseline.json')) {
  if (!fs.existsSync(baselinePath)) {
    throw new Error(`Baseline file not found: ${baselinePath}`)
  }

  const baseline = readBaseline(baselinePath)
  const current = collectBaseline(rootDir)

  const issues = []

  const currentWindowAssignments = current.production.windowAssignments
  const baselineWindowAssignments = baseline.production.windowAssignments
  if (currentWindowAssignments > baselineWindowAssignments) {
    issues.push({
      metric: 'production.windowAssignments',
      reference: baselineWindowAssignments,
      current: currentWindowAssignments,
      details: current.production.files.filter((file) => file.includes('src/') || file.includes('js/'))
    })
  }

  const currentCycles = current.dependencies.cycles.length
  const baselineCycles = baseline.dependencies.cycles.length
  if (currentCycles > baselineCycles) {
    issues.push({
      metric: 'dependencies.cycles',
      reference: baselineCycles,
      current: currentCycles,
      details: current.dependencies.cycles
    })
  }

  const currentUnresolvedImports = current.dependencies.unresolvedImports.length
  const baselineUnresolvedImports = baseline.dependencies.unresolvedImports.length
  if (currentUnresolvedImports > baselineUnresolvedImports) {
    issues.push({
      metric: 'dependencies.unresolvedImports',
      reference: baselineUnresolvedImports,
      current: currentUnresolvedImports,
      details: current.dependencies.unresolvedImports.slice(0, 10)
    })
  }

  const currentOver1000 = current.production.filesOver1000Lines.length
  const baselineOver1000 = baseline.production.filesOver1000Lines.length
  if (currentOver1000 > baselineOver1000) {
    issues.push({
      metric: 'production.filesOver1000Lines',
      reference: baselineOver1000,
      current: currentOver1000,
      details: current.production.filesOver1000Lines
    })
  }

  const currentOver700 = current.production.filesOver700Lines.length
  const baselineOver700 = baseline.production.filesOver700Lines.length
  if (currentOver700 > baselineOver700) {
    issues.push({
      metric: 'production.filesOver700Lines',
      reference: baselineOver700,
      current: currentOver700,
      details: current.production.filesOver700Lines
    })
  }

  if (issues.length > 0) {
    console.error('Architecture baseline regression detected:')
    for (const issue of issues) {
      console.error(`- ${issue.metric}: reference=${formatValue(issue.reference)} current=${formatValue(issue.current)}`)
      if (issue.details && issue.details.length > 0) {
        console.error(`  details: ${JSON.stringify(issue.details)}`)
      }
    }
    return { ok: false, issues }
  }

  console.log('Architecture baseline check passed: no blocking regression detected.')
  return { ok: true, issues: [] }
}

function main() {
  const targetRoot = process.argv[2] ? path.resolve(process.cwd(), process.argv[2]) : repoRoot
  const baselinePath = process.argv[3] ? path.resolve(process.cwd(), process.argv[3]) : path.join(targetRoot, 'architecture-baseline.json')
  const result = checkArchitectureBaseline(targetRoot, baselinePath)
  process.exitCode = result.ok ? 0 : 1
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main()
}
