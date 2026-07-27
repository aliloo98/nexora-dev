import { appendContent, getDocument, normalizeChoice, setOptionalAttribute } from '../internal/dom.js'

/**
 * Creates a responsive, navigation-agnostic Nexora page shell.
 * @example createAppShell({ children: pageContent, as: 'main' })
 */
export function createAppShell(options = {}, documentRef) {
  const document = getDocument(documentRef)
  const tagName = normalizeChoice(options.as, ['div', 'main', 'section'], 'div')
  const shell = document.createElement(tagName)
  shell.className = 'nx-app-shell nx-scope'
  setOptionalAttribute(shell, 'id', options.id)
  setOptionalAttribute(shell, 'aria-label', options.ariaLabel)
  appendContent(shell, options.children, document)
  return shell
}

export default createAppShell
