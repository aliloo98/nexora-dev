import { getDocument, normalizeChoice } from '../internal/dom.js'

/**
 * Creates a horizontal separator.
 * @example createDivider({ inset: 'content', decorative: true })
 */
export function createDivider(options = {}, documentRef) {
  const document = getDocument(documentRef)
  const inset = normalizeChoice(options.inset, ['full', 'content'], 'full')
  const divider = document.createElement('hr')
  divider.className = `nx-divider nx-divider--${inset}`
  if (options.decorative === true) {
    divider.setAttribute('role', 'presentation')
    divider.setAttribute('aria-hidden', 'true')
  }
  return divider
}

export default createDivider
