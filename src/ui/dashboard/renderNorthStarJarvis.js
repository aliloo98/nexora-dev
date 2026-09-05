import { buildNorthStarJarvisEnrichment, formatEuro } from './northStarDecision.js'
import { getJarvisDecisionContext, subscribeToJarvisDecisionContext } from '../../jarvis/jarvisDecisionContext.js'
import { attachJarvisCopilot, renderJarvisCopilot } from '../../jarvis/copilot/jarvisCopilot.js'

const escapeHtml = (value) => String(value ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;')

const formatFactValue = (fact) => {
  const number = Number(fact?.value)
  if (!Number.isFinite(number)) return escapeHtml(fact?.value || '')
  return /jour/i.test(String(fact?.label || '')) ? String(number) : formatEuro(number)
}

const buildCopilotSnapshot = (decision, context = {}, metrics = {}) => {
  const safeContext = context || {}
  return {
  ...safeContext,
  health: safeContext.health || { label: decision?.label || 'Analyse disponible' },
  cashflow: safeContext.cashflow || { projected: Number(metrics.safetyMargin ?? metrics.solde ?? 0) },
  forecast: safeContext.forecast || { finalBalance: Number(metrics.solde ?? metrics.soldeEstime ?? 0) },
  priorities: Array.isArray(safeContext.priorities) && safeContext.priorities.length > 0
    ? safeContext.priorities
    : [{ action: decision?.action?.label || 'Surveiller la trajectoire' }]
  }
}

export function renderNorthStarJarvis(rootIdOrElement, decision, context, documentRef, windowRef, metrics = {}) {
  if (!rootIdOrElement || !documentRef) return null

  // Handle both string ID and DOM element
  const root = typeof rootIdOrElement === 'string'
    ? documentRef.getElementById(rootIdOrElement)
    : rootIdOrElement

  if (!root) return null

  root.querySelector('.north-star-jarvis')?.remove()

  const enrichment = buildNorthStarJarvisEnrichment(decision, context)

  const renderCopilotPanel = (panel, insight, snapshot) => {
    panel.innerHTML = `
      <div class="north-star-jarvis__brief">
        <span class="north-star-jarvis__brief-label">Analyse actualisée</span>
        <p class="north-star-jarvis__brief-text">${escapeHtml(insight)}</p>
      </div>
      <div class="north-star-jarvis__copilot">${renderJarvisCopilot(snapshot)}</div>
    `
    attachJarvisCopilot(panel, {
      documentRef,
      windowRef,
      initialSnapshot: snapshot,
      getSnapshot: async () => snapshot
    })
  }

  if (!enrichment) {
    // Create intelligent advisor from decision when context is not available
    const panel = documentRef.createElement('div')
    panel.className = `north-star-jarvis north-star-jarvis--${decision.tone || 'neutral'}`

    const insight = decision.why || decision.label || 'Analyse disponible'
    const facts = []

    if (decision.tone === 'positive') {
      facts.push({ label: 'Situation', value: decision.label })
    } else if (decision.tone === 'warning') {
      facts.push({ label: 'Attention', value: decision.label })
    } else if (decision.tone === 'negative') {
      facts.push({ label: 'Action requise', value: decision.label })
    }

    const factsMarkup = facts.map((fact) => `<li>${escapeHtml(fact.label)} : <strong>${escapeHtml(fact.value)}</strong></li>`).join('')

    const snapshot = buildCopilotSnapshot(decision, context, metrics)
    renderCopilotPanel(panel, insight, snapshot)

    if (factsMarkup) {
      const reasons = documentRef.createElement('ul')
      reasons.className = 'north-star-jarvis__reasons'
      reasons.innerHTML = factsMarkup
      panel.querySelector('.north-star-jarvis__brief')?.appendChild(reasons)
    }

    if (decision.action?.target && typeof windowRef?.showSection === 'function') {
      const actionDiv = documentRef.createElement('div')
      actionDiv.className = 'north-star-jarvis__action-container'
      actionDiv.innerHTML = `<button type="button" class="north-star-jarvis__action" data-target-section="${escapeHtml(decision.action.target)}">→ ${escapeHtml(decision.action.label)}</button>`
      const button = actionDiv.querySelector('.north-star-jarvis__action')
      button.addEventListener('click', () => windowRef.showSection(decision.action.target))
      panel.appendChild(actionDiv)
    }

    root.appendChild(panel)
    return panel
  }

  const facts = enrichment.facts.map((fact) => `<li>${escapeHtml(fact.label)} : <strong>${formatFactValue(fact)}</strong></li>`).join('')
  const recommendation = enrichment.recommendation
  const recommendationMarkup = recommendation
    ? `<button type="button" class="north-star-jarvis__action"${recommendation.target ? ` data-target-section="${escapeHtml(recommendation.target)}"` : ''}>→ ${escapeHtml(recommendation.label)}</button>`
    : ''

  const panel = documentRef.createElement('div')
  panel.className = `north-star-jarvis north-star-jarvis--${enrichment.tone}`
  const snapshot = buildCopilotSnapshot(decision, context, metrics)
  renderCopilotPanel(panel, enrichment.insight || 'Analyse disponible', snapshot)

  if (facts) {
    const reasons = documentRef.createElement('ul')
    reasons.className = 'north-star-jarvis__reasons'
    reasons.innerHTML = facts
    panel.querySelector('.north-star-jarvis__brief')?.appendChild(reasons)
  }

  if (recommendationMarkup) {
    const actionContainer = documentRef.createElement('div')
    actionContainer.className = 'north-star-jarvis__action-container'
    actionContainer.innerHTML = recommendationMarkup
    panel.appendChild(actionContainer)
  }

  const button = panel.querySelector('.north-star-jarvis__action')
  if (button && recommendation?.target && typeof windowRef?.showSection === 'function') {
    button.addEventListener('click', () => windowRef.showSection(recommendation.target))
  } else if (button) {
    button.disabled = true
  }

  root.appendChild(panel)
  return panel
}

export function bindNorthStarJarvis(rootId, decision, documentRef, windowRef, metrics = {}) {
  if (!rootId || !documentRef) return
  const root = documentRef.getElementById(rootId)
  if (!root) return
  root.__northStarJarvisUnsubscribe?.()
  const rootRef = typeof WeakRef === 'function' ? new WeakRef(root) : { deref: () => root }
  let unsubscribe = () => {}

  const render = (context) => {
    const currentRoot = rootRef.deref()
    if (!currentRoot || currentRoot.isConnected === false) {
      unsubscribe()
      return
    }
    renderNorthStarJarvis(currentRoot, decision, context, documentRef, windowRef, metrics)
  }

  const initialContext = getJarvisDecisionContext()
  render(initialContext)

  unsubscribe = subscribeToJarvisDecisionContext((context) => {
    render(context)
  })

  root.__northStarJarvisUnsubscribe = unsubscribe
}
