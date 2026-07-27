import { appendContent, getDocument, normalizeChoice } from '../internal/dom.js'

const GAPS = ['none', '2xs', 'xs', 'sm', 'md', 'lg', 'xl', '2xl', '3xl', '4xl']

/**
 * Creates a vertical layout using only the spacing scale.
 * @example createStack({ gap: 'lg', children: [cardA, cardB] })
 */
export function createStack(options = {}, documentRef) {
  const document = getDocument(documentRef)
  const tagName = normalizeChoice(options.as, ['div', 'section', 'article', 'ul', 'ol'], 'div')
  const gap = normalizeChoice(options.gap, GAPS, 'md')
  const stack = document.createElement(tagName)
  stack.className = `nx-stack nx-stack--gap-${gap}`
  appendContent(stack, options.children, document)
  return stack
}

export default createStack
