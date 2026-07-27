import { createButton } from '../primitives/Button.js'
import { createIcon } from '../icons/index.js'
import { createHeading, getDocument, setText } from '../internal/dom.js'

/**
 * Creates a calm empty state with an optional single recovery action.
 * @example createEmptyState({ title: 'Aucun objectif', description, actionLabel, onAction })
 */
export function createEmptyState(options = {}, documentRef) {
  const document = getDocument(documentRef)
  const empty = document.createElement('section')
  empty.className = 'nx-empty-state'

  if (options.icon) {
    const icon = document.createElement('div')
    icon.className = 'nx-empty-state__icon'
    icon.appendChild(createIcon(options.icon, { size: 24 }, document))
    empty.appendChild(icon)
  }
  const title = createHeading(document, options.headingLevel || 3, options.title || '', 'nx-empty-state__title')
  empty.appendChild(title)
  if (options.description) {
    const description = document.createElement('p')
    description.className = 'nx-empty-state__description'
    setText(description, options.description)
    empty.appendChild(description)
  }
  if (options.actionLabel && typeof options.onAction === 'function') {
    const action = createButton({
      label: options.actionLabel,
      variant: 'secondary',
      onClick: options.onAction
    }, document)
    empty.appendChild(action)
  }
  return empty
}

export default createEmptyState
