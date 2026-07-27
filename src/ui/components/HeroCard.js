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
 * Displays the main financial balance as the dashboard focal point.
 * @example createHeroCard({ amount: '1 250 €', label: 'Argent restant ce mois-ci', tone: 'positive', actionLabel: 'Voir le plan', onAction })
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

  const amount = document.createElement('strong')
  amount.className = 'nx-hero-card__amount nx-numeric'
  setText(amount, options.amount ?? '—')
  content.appendChild(amount)

  if (options.trend) {
    const trend = document.createElement('p')
    trend.className = 'nx-hero-card__trend'
    setText(trend, options.trend)
    content.appendChild(trend)
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
