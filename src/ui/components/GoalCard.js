import { createBadge } from '../primitives/Badge.js'
import { createButton } from '../primitives/Button.js'
import { createCard } from '../primitives/Card.js'
import { createProgress } from '../primitives/Progress.js'
import { createHeading, getDocument, setText } from '../internal/dom.js'

/**
 * Presents goal values supplied by a presenter. It performs no financial calculation.
 * @example createGoalCard({ name: 'Maison', currentAmount: '4 000 €', targetAmount: '20 000 €', percentage: 20 })
 */
export function createGoalCard(options = {}, documentRef) {
  const document = getDocument(documentRef)
  const card = createCard({ as: 'article', padding: 'default' }, document)
  card.classList.add('nx-goal-card')

  const header = document.createElement('div')
  header.className = 'nx-goal-card__header'
  const heading = document.createElement('div')
  heading.className = 'nx-goal-card__heading'
  const eyebrow = document.createElement('span')
  eyebrow.className = 'nx-goal-card__eyebrow'
  setText(eyebrow, options.eyebrow || 'Objectif')
  // Always use a heading element for accessibility (heading-order axe rule)
  const headingLevel = options.headingLevel && options.headingLevel > 0 && options.headingLevel <= 6 ? options.headingLevel : 3
  const title = createHeading(document, headingLevel, options.name || '', 'nx-goal-card__title')
  setText(title, options.name || '')
  heading.appendChild(eyebrow)
  heading.appendChild(title)
  header.appendChild(heading)
  if (options.statusLabel) {
    header.appendChild(createBadge({ label: options.statusLabel, tone: options.statusTone || 'neutral' }, document))
  }
  card.appendChild(header)

  const amounts = document.createElement('p')
  amounts.className = 'nx-goal-card__amounts nx-numeric'
  setText(amounts, `${options.currentAmount ?? '—'} / ${options.targetAmount ?? '—'}`)
  card.appendChild(amounts)

  const progress = createProgress({
    label: options.progressLabel || 'Progression',
    valueLabel: options.percentageLabel || `${options.percentage ?? 0} %`,
    value: options.percentage,
    min: 0,
    max: 100,
    thickness: 8
  }, document)
  card.appendChild(progress)

  const metadata = document.createElement('dl')
  metadata.className = 'nx-goal-card__metadata'
  const entries = [
    ['Reste', options.remaining],
    ['Échéance', options.deadline]
  ].filter(([, value]) => value !== undefined && value !== null && value !== '')
  entries.forEach(([label, value]) => {
    const item = document.createElement('div')
    item.className = 'nx-goal-card__metadata-item'
    const term = document.createElement('dt')
    setText(term, label)
    const detail = document.createElement('dd')
    detail.className = 'nx-numeric'
    setText(detail, value)
    item.appendChild(term)
    item.appendChild(detail)
    metadata.appendChild(item)
  })
  if (entries.length) card.appendChild(metadata)

  if ((options.actionLabel && typeof options.onAction === 'function')
    || (options.secondaryActionLabel && typeof options.onSecondaryAction === 'function')) {
    const actions = document.createElement('div')
    actions.className = 'nx-goal-card__actions'
    if (options.actionLabel && typeof options.onAction === 'function') {
      const action = createButton({
        label: options.actionLabel,
        variant: 'secondary',
        onClick: options.onAction
      }, document)
      actions.appendChild(action)
    }
    if (options.secondaryActionLabel && typeof options.onSecondaryAction === 'function') {
      const secondary = createButton({
        size: 'icon-only',
        variant: 'ghost',
        icon: 'chevron',
        ariaLabel: options.secondaryActionLabel,
        onClick: options.onSecondaryAction
      }, document)
      actions.appendChild(secondary)
    }
    card.appendChild(actions)
  }

  return card
}

export default createGoalCard
