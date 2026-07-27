import { appendContent, createHeading, getDocument } from '../internal/dom.js'

/**
 * Creates a section heading with a safe configurable heading level.
 * @example createSectionHeader({ title: 'Ce mois', headingLevel: 2 })
 */
export function createSectionHeader(options = {}, documentRef) {
  const document = getDocument(documentRef)
  const header = document.createElement('header')
  header.className = 'nx-section-header'
  const copy = document.createElement('div')
  copy.className = 'nx-section-header__copy'
  const heading = createHeading(document, options.headingLevel || 2, options.title || '', 'nx-section-header__title')
  copy.appendChild(heading)
  if (options.description) {
    const description = document.createElement('p')
    description.className = 'nx-section-header__description'
    description.textContent = String(options.description)
    copy.appendChild(description)
  }
  header.appendChild(copy)
  if (options.action) {
    const action = document.createElement('div')
    action.className = 'nx-section-header__action'
    appendContent(action, options.action, document)
    header.appendChild(action)
  }
  return header
}

export default createSectionHeader
