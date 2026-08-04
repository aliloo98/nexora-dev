import { createBadge } from '../primitives/Badge.js'
import { createButton } from '../primitives/Button.js'
import { createCard } from '../primitives/Card.js'
import { getDocument, normalizeChoice, setText } from '../internal/dom.js'

const TONES = ['neutral', 'positive', 'warning', 'danger']
const BADGE_TONES = {
  neutral: 'neutral',
  positive: 'success',
  warning: 'warning',
  danger: 'danger'
}

/**
 * Displays the main financial balance as the dashboard focal point with premium indicators.
 * @example createHeroCard({ amount: '1 250 €', label: 'Argent restant ce mois-ci', tone: 'positive', subMetrics: [{label: 'Épargne', value: '20%'}], actionLabel: 'Voir le plan', onAction })
 */
export function createHeroCard(options = {}, documentRef) {
  const document = getDocument(documentRef)
  const tone = normalizeChoice(options.tone, TONES, 'neutral')
  const card = createCard({
    as: 'section',
    padding: 'comfortable',
    variant: 'elevated'
  }, document)
  card.classList.add('nx-hero-card', `nx-hero-card--${tone}`)
  card.setAttribute('aria-label', options.ariaLabel || 'Solde du mois')

  const content = document.createElement('div')
  content.className = 'nx-hero-card__content'
  card.appendChild(content)

  const header = document.createElement('div')
  header.className = 'nx-hero-card__header'
  content.appendChild(header)

  if (options.context) {
    const context = createBadge({
      label: options.context,
      tone: BADGE_TONES[tone]
    }, document)
    context.classList.add('nx-hero-card__context')
    header.appendChild(context)
  }

  const label = document.createElement('p')
  label.className = 'nx-hero-card__label'
  setText(label, options.label || 'Argent restant ce mois-ci')
  header.appendChild(label)

  const amountWrapper = document.createElement('div')
  amountWrapper.className = 'nx-hero-card__amount-wrapper'
  content.appendChild(amountWrapper)

  const amount = document.createElement('strong')
  amount.className = 'nx-hero-card__amount nx-numeric'
  setText(amount, options.amount ?? '—')
  amountWrapper.appendChild(amount)

  if (options.trend) {
    const trend = document.createElement('p')
    trend.className = 'nx-hero-card__trend'
    setText(trend, options.trend)
    amountWrapper.appendChild(trend)
  }

  if (options.subMetrics && Array.isArray(options.subMetrics) && options.subMetrics.length > 0) {
    const subMetrics = document.createElement('div')
    subMetrics.className = 'nx-hero-card__sub-metrics'
    options.subMetrics.forEach(metric => {
      const metricEl = document.createElement('div')
      metricEl.className = 'nx-hero-card__sub-metric'
      
      const metricLabel = document.createElement('span')
      metricLabel.className = 'nx-hero-card__sub-metric-label'
      setText(metricLabel, metric.label)
      metricEl.appendChild(metricLabel)
      
      const metricValue = document.createElement('span')
      metricValue.className = 'nx-hero-card__sub-metric-value'
      setText(metricValue, metric.value)
      metricEl.appendChild(metricValue)
      
      subMetrics.appendChild(metricEl)
    })
    content.appendChild(subMetrics)
  }

  if (options.actionLabel && typeof options.onAction === 'function') {
    const action = createButton({
      label: options.actionLabel,
      variant: 'primary',
      icon: 'arrowRight',
      iconPosition: 'end',
      onClick: options.onAction
    }, document)
    action.classList.add('nx-hero-card__action')
    content.appendChild(action)
  }

  return card
}

export default createHeroCard
