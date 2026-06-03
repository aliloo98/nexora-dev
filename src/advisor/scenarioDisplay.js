import { generateScenarios } from './scenarioService.js'

export const NEUTRAL_SCENARIO_CONTEXT = { income: 0 }

const SCENARIO_LABELS = ['Prudent', 'Équilibré', 'Agressif']

export const getNeutralScenarios = () => generateScenarios(NEUTRAL_SCENARIO_CONTEXT)

export const resolveScenariosForDisplay = (scenarios) => {
  const list = Array.isArray(scenarios) ? scenarios.filter(Boolean) : []
  if (list.length >= 3) return list.slice(0, 3)
  const fallback = getNeutralScenarios()
  const merged = [...list]
  fallback.forEach((item) => {
    if (merged.length >= 3) return
    if (!merged.some((entry) => entry.id === item.id || entry.label === item.label)) merged.push(item)
  })
  return merged.length >= 3 ? merged.slice(0, 3) : getNeutralScenarios()
}

const escapeHtml = (value) => String(value ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#039;')

const formatScenarioAmount = (value, incomplete = false) => {
  if (incomplete) return 'À compléter'
  return `${(Number(value) || 0).toLocaleString('fr-FR')} €`
}

export const renderScenarioCardsMarkup = (scenarios = []) => {
  const visible = resolveScenariosForDisplay(scenarios)
  const cards = visible.length ? visible : getNeutralScenarios()
  return cards.map((scenario) => {
    const incomplete = !Number.isFinite(Number(scenario.projectedBalance)) && !Number.isFinite(Number(scenario.possibleSaving))
      || scenario.risk === 'indéfini'
      || /non analysable|à compléter/i.test(String(scenario.primaryGoalImpact || ''))
    return `
    <div class="advisor-scenario-card scenario-${escapeHtml(scenario.id || 'default')}" data-reveal-ready="true" data-revealed="true">
      <div>
        <strong>${escapeHtml(scenario.label || 'Scénario')}</strong>
        <span>Risque ${escapeHtml(scenario.risk || 'modéré')}</span>
      </div>
      <p>Solde fin de cycle : ${formatScenarioAmount(scenario.projectedBalance, incomplete)}</p>
      <p>Épargne possible : ${formatScenarioAmount(scenario.possibleSaving, incomplete)}</p>
      <em>${escapeHtml(scenario.advice || 'Données à compléter dans le budget.')}</em>
    </div>
  `
  }).join('')
}

export const countScenarioCardsInMarkup = (markup = '') => (String(markup).match(/advisor-scenario-card/g) || []).length

export const getScenarioLabelsFromMarkup = (markup = '') => SCENARIO_LABELS.filter((label) => String(markup).includes(label))
