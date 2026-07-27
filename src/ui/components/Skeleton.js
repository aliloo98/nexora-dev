import { getDocument, normalizeChoice, setOptionalAttribute } from '../internal/dom.js'

/**
 * Creates a static structural placeholder hidden from assistive technologies.
 * @example createSkeleton({ shape: 'text', size: 'lg' })
 */
export function createSkeleton(options = {}, documentRef) {
  const document = getDocument(documentRef)
  const shape = normalizeChoice(options.shape, ['text', 'block', 'circle'], 'text')
  const size = normalizeChoice(options.size, ['sm', 'md', 'lg'], 'md')
  const skeleton = document.createElement('span')
  skeleton.className = `nx-skeleton nx-skeleton--${shape} nx-skeleton--${size}`
  skeleton.setAttribute('aria-hidden', 'true')
  setOptionalAttribute(skeleton, 'data-testid', options.testId)
  return skeleton
}

export default createSkeleton
