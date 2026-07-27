import { createBadge } from '../primitives/Badge.js'
import { createButton } from '../primitives/Button.js'
import { createCard } from '../primitives/Card.js'
import { createHeading, getDocument, normalizeChoice, setText } from '../internal/dom.js'

const LEVELS = ['neutral', 'opportunity', 'vigilance', 'critical']
const LEVEL_LABELS = {
  neutral: 'À retenir',
  opportunity: 'Opportunité',
  vigilance: 'Vigilance',
  critical: 'Priorité'
}
const LEVEL_TONES = {
  neutral: 'neutral',
  opportunity: 'opportunity',
  vigilance: 'warning',
  critical: 'danger'
}

/**
 * Presents exactly one Coach recommendation and at most one action.
 * @example createCoachCard({ title, description, level: 'opportunity', actionLabel, onAction })
 */
export function createCoachCard(options = {}, documentRef) {
  const document = getDocument(documentRef)
  const level = normalizeChoice(options.level, LEVELS, 'neutral')
  const card = createCard({
    as: 'article',
    padding: 'comfortable',
    variant: level === 'critical' ? 'critical' : 'elevated'
  }, document)
  card.classList.add('nx-coach-card', `nx-coach-card--${level}`)
  card.setAttribute('aria-busy', options.loading === true ? 'true' : 'false')

  const header = document.createElement('div')
  header.className = 'nx-coach-card__header'
  const eyebrow = document.createElement('span')
  eyebrow.className = 'nx-coach-card__eyebrow'
  setText(eyebrow, options.eyebrow || 'Coach Nexora')
  header.appendChild(eyebrow)
  header.appendChild(createBadge({
    label: options.levelLabel || LEVEL_LABELS[level],
    tone: LEVEL_TONES[level]
  }, document))
  card.appendChild(header)

  const title = createHeading(
    document,
    options.headingLevel || 2,
    options.loading ? (options.loadingTitle || 'Analyse en cours') : (options.title || ''),
    'nx-coach-card__title'
  )
  card.appendChild(title)

  if (options.description) {
    const description = document.createElement('p')
    description.className = 'nx-coach-card__description'
    setText(description, options.description)
    card.appendChild(description)
  }

  if (options.loading) {
    const loading = document.createElement('div')
    loading.className = 'nx-coach-card__loading'
    loading.setAttribute('role', 'status')
    loading.setAttribute('aria-live', 'polite')
    loading.appendChild(createButton({
      label: options.loadingLabel || 'Chargement',
      variant: 'secondary',
      loading: true
    }, document))
    card.appendChild(loading)
  } else if (options.actionLabel && typeof options.onAction === 'function') {
    const action = createButton({
      label: options.actionLabel,
      variant: 'secondary',
      icon: 'arrowRight',
      iconPosition: 'end',
      onClick: options.onAction
    }, document)
    action.classList.add('nx-coach-card__action')
    card.appendChild(action)
  }

  return card
}

export default createCoachCard
