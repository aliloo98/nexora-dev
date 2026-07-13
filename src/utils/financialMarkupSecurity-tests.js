import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { escapeHtml } from './htmlEscape.js'

const malicious = '\"><img src=x onerror=alert(1)><script>alert(2)</script>'
const escaped = escapeHtml(malicious)
assert.equal(escaped.includes('<img'), false, 'financial labels must not retain injected image markup')
assert.equal(escaped.includes('<script>'), false, 'financial labels must not retain injected script markup')

const readSource = (relativePath) => readFileSync(new URL(relativePath, import.meta.url), 'utf8')
const indexHtml = readSource('../../index.html')
const goalCard = readSource('../components/GoalCard.js')
const goalsPage = readSource('../pages/GoalsPage.js')
const treasuryTimeline = readSource('../components/TreasuryTimeline.js')
const treasuryPlanner = readSource('../components/TreasuryPlannerUI.js')
const planHub = readSource('../plan/PlanHubUI.js')
const main = readSource('../main.js')

assert.match(indexHtml, /escapeHtml\(goal\.name \|\| 'Projet'\)/, 'savings analytics must escape project names')
assert.match(indexHtml, /escapeHtml\(c\.name \|\| 'Projet'\)/, 'savings cards must escape project names')
assert.match(goalCard, /escapeHtml\(forecast\.projectedLabel \|\| 'Projection indisponible'\)/, 'goal forecasts must escape generated labels')
assert.match(goalsPage, /escapeHtml\(primary\.name \|\| 'Objectif'\)/, 'goal analytics must escape the primary goal name')
assert.match(treasuryTimeline, /escapeHtml\(item\.title \|\| 'Événement'\)/, 'treasury timeline must escape movement titles')
assert.match(treasuryPlanner, /escapeHtml\(dateLabel\)[\s\S]*escapeHtml\(item\.title \|\| 'Événement'\)[\s\S]*escapeHtml\(priority\)/, 'treasury planner must escape synchronized labels')
assert.match(planHub, /escapeHtml\(item\.title \|\| \(positive \? 'Revenu' : 'Charge'\)\)/, 'plan rows must escape movement titles')
assert.match(main, /escapeHtml\(household\.name \|\| 'Foyer Nexora'\)/, 'couple summary must escape household names')
assert.match(main, /escapeHtml\(goal\.name \|\| 'Objectif'\)/, 'couple summary must escape goal names')
assert.match(main, /escapeHtml\(debt\.name \|\| 'Dette'\)/, 'couple summary must escape debt names')
assert.match(main, /data-share-id="\$\{escapeHtml\(id\)\}"/, 'sharing controls must escape imported identifiers')

console.info('financialMarkupSecurity-tests: user-controlled financial labels are escaped — OK')
