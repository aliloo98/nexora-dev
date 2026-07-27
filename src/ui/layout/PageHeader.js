import { appendContent, createHeading, getDocument } from '../internal/dom.js'

/**
 * Creates a page heading with one optional supporting action.
 * @example createPageHeader({ title: 'Budget', description: 'Juillet 2026' })
 */
export function createPageHeader(options = {}, documentRef) {
  const document = getDocument(documentRef)
  const header = document.createElement('header')
  header.className = 'nx-page-header'

  const copy = document.createElement('div')
  copy.className = 'nx-page-header__copy'
  copy.appendChild(createHeading(document, options.headingLevel || 1, options.title || '', 'nx-page-header__title'))

  if (options.description) {
    const description = document.createElement('p')
    description.className = 'nx-page-header__description'
    description.textContent = String(options.description)
    copy.appendChild(description)
  }

  header.appendChild(copy)
  if (options.action) {
    const action = document.createElement('div')
    action.className = 'nx-page-header__action'
    appendContent(action, options.action, document)
    header.appendChild(action)
  }
  return header
}

export default createPageHeader
