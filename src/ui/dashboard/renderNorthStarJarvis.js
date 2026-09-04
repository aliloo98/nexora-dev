import { buildNorthStarJarvisEnrichment, formatEuro } from './northStarDecision.js'
import { getJarvisDecisionContext, subscribeToJarvisDecisionContext } from '../../jarvis/jarvisDecisionContext.js'

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

export function renderNorthStarJarvis(root, decision, context, documentRef, windowRef) {
  if (!root || !documentRef) return null
  root.querySelector('.north-star-jarvis')?.remove()
  const enrichment = buildNorthStarJarvisEnrichment(decision, context)
  if (!enrichment) return null

  const facts = enrichment.facts.map((fact) => `<li>${escapeHtml(fact.label)} : <strong>${formatFactValue(fact)}</strong></li>`).join('')
  const recommendation = enrichment.recommendation
  const recommendationMarkup = recommendation
    ? `<button type="button" class="north-star-jarvis__recommendation"${recommendation.target ? ` data-target-section="${escapeHtml(recommendation.target)}"` : ''}>→ ${escapeHtml(recommendation.label)}</button>`
    : ''

  const panel = documentRef.createElement('section')
  panel.className = `north-star-jarvis north-star-jarvis--${enrichment.tone}`
  panel.setAttribute('aria-label', 'Enrichissement Jarvis')
  panel.innerHTML = `
    <div class="north-star-jarvis__eyebrow">Jarvis</div>
    <p class="north-star-jarvis__insight">${escapeHtml(enrichment.insight || 'Analyse disponible')}</p>
    ${facts ? `<ul class="north-star-jarvis__facts">${facts}</ul>` : ''}
    ${recommendationMarkup ? `<div class="north-star-jarvis__action"><span>Recommandation</span>${recommendationMarkup}</div>` : ''}
  `

  const button = panel.querySelector('.north-star-jarvis__recommendation')
  if (button && recommendation?.target && typeof windowRef?.showSection === 'function') {
    button.addEventListener('click', () => windowRef.showSection(recommendation.target))
  } else if (button) {
    button.disabled = true
  }

  root.appendChild(panel)
  return panel
}

export function bindNorthStarJarvis(root, decision, documentRef, windowRef) {
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
    renderNorthStarJarvis(currentRoot, decision, context, documentRef, windowRef)
  }
  render(getJarvisDecisionContext())
  unsubscribe = subscribeToJarvisDecisionContext((context) => {
    render(context)
  })
  root.__northStarJarvisUnsubscribe = unsubscribe
}
