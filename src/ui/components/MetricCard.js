import { createBadge } from '../primitives/Badge.js'
import { createCard } from '../primitives/Card.js'
import { getDocument, normalizeChoice, setText } from '../internal/dom.js'

const TONES = ['neutral', 'positive', 'warning', 'critical', 'stable']
const BADGE_TONES = {
  neutral: 'neutral',
  positive: 'success',
  warning: 'warning',
  critical: 'danger',
  stable: 'stable'
}

/**
 * Displays a value already prepared by a presenter.
 * @example createMetricCard({ label: 'Revenus', value: '3 000 €', context: 'Ce mois' })
 */
export function createMetricCard(options = {}, documentRef) {
  const document = getDocument(documentRef)
  const tone = normalizeChoice(options.tone, TONES, 'neutral')
  const card = createCard({ as: 'article', padding: 'default' }, document)
  card.classList.add('nx-metric-card', `nx-metric-card--${tone}`)

  const label = document.createElement('p')
  label.className = 'nx-metric-card__label'
  setText(label, options.label || '')
  card.appendChild(label)

  const value = document.createElement('strong')
  value.className = 'nx-metric-card__value nx-numeric'
  setText(value, options.value ?? '—')
  card.appendChild(value)

  if (options.context) {
    const context = document.createElement('p')
    context.className = 'nx-metric-card__context'
    setText(context, options.context)
    card.appendChild(context)
  }

  if (options.trend?.label) {
    const trend = createBadge({
      label: options.trend.label,
      tone: options.trend.tone || BADGE_TONES[tone]
    }, document)
    trend.classList.add('nx-metric-card__trend')
    card.appendChild(trend)
  }
  return card
}

export default createMetricCard
