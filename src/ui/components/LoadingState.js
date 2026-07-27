import { createIcon } from '../icons/index.js'
import { getDocument, normalizeChoice, setText } from '../internal/dom.js'

/**
 * Creates an accessible in-place loading announcement.
 * @example createLoadingState({ label: 'Chargement du budget' })
 */
export function createLoadingState(options = {}, documentRef) {
  const document = getDocument(documentRef)
  const size = normalizeChoice(options.size, ['compact', 'default'], 'default')
  const loading = document.createElement('div')
  loading.className = `nx-loading-state nx-loading-state--${size}`
  loading.setAttribute('role', 'status')
  loading.setAttribute('aria-live', 'polite')
  loading.setAttribute('aria-busy', 'true')
  loading.appendChild(createIcon('spinner', { size: size === 'compact' ? 20 : 24 }, document))
  const label = document.createElement('span')
  setText(label, options.label || 'Chargement')
  loading.appendChild(label)
  return loading
}

export default createLoadingState
