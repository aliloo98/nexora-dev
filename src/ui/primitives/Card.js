import { appendContent, getDocument, listen, normalizeChoice, setOptionalAttribute } from '../internal/dom.js'

const VARIANTS = ['default', 'elevated', 'interactive', 'critical']
const PADDINGS = ['compact', 'default', 'comfortable']

/**
 * Creates the shared surface used by every Nexora card.
 * @example createCard({ variant: 'elevated', children: content })
 */
export function createCard(options = {}, documentRef) {
  const document = getDocument(documentRef)
  const variant = normalizeChoice(options.variant, VARIANTS, 'default')
  const padding = normalizeChoice(options.padding, PADDINGS, 'default')
  const tagName = normalizeChoice(options.as, ['div', 'article', 'section'], 'div')

  if (variant === 'interactive' && typeof options.onActivate !== 'function') {
    throw new Error('Interactive Nexora cards require an onActivate callback')
  }

  const card = document.createElement(tagName)
  card.className = `nx-card nx-card--${variant} nx-card--padding-${padding}`
  setOptionalAttribute(card, 'aria-label', options.ariaLabel)
  setOptionalAttribute(card, 'aria-labelledby', options.ariaLabelledby)
  appendContent(card, options.children, document)

  if (variant === 'interactive') {
    card.setAttribute('role', 'button')
    card.setAttribute('tabindex', '0')
    listen(card, 'click', options.onActivate)
    listen(card, 'keydown', (event) => {
      if (event.key !== 'Enter' && event.key !== ' ') return
      event.preventDefault()
      options.onActivate(event)
    })
  }

  return card
}

export default createCard
