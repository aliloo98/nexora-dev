let idSequence = 0

export function getDocument(documentRef) {
  const resolved = documentRef || globalThis.document
  if (!resolved?.createElement) {
    throw new Error('A DOM document is required to render Nexora UI components')
  }
  return resolved
}

export function createId(prefix = 'nx') {
  idSequence += 1
  return `${prefix}-${idSequence}`
}

export function normalizeChoice(value, allowed, fallback) {
  return allowed.includes(value) ? value : fallback
}

export function normalizeHeadingLevel(value, fallback = 2) {
  const level = Number(value)
  return Number.isInteger(level) && level >= 1 && level <= 6 ? level : fallback
}

export function appendContent(element, content, documentRef) {
  if (content === null || content === undefined || content === false) return element
  if (Array.isArray(content)) {
    content.forEach((item) => appendContent(element, item, documentRef))
    return element
  }
  if (typeof content === 'string' || typeof content === 'number') {
    element.appendChild(getDocument(documentRef).createTextNode(String(content)))
    return element
  }
  if (content?.nodeType) {
    element.appendChild(content)
    return element
  }
  throw new TypeError('Nexora UI content must be text, a DOM node, or an array of those values')
}

export function setText(element, value) {
  element.textContent = value === null || value === undefined ? '' : String(value)
  return element
}

export function setOptionalAttribute(element, name, value) {
  if (value === null || value === undefined || value === false || value === '') {
    element.removeAttribute(name)
  } else {
    element.setAttribute(name, String(value))
  }
}

export function listen(element, type, listener, options) {
  if (typeof listener !== 'function') return () => {}
  element.addEventListener(type, listener, options)
  return () => element.removeEventListener(type, listener, options)
}

export function createHeading(documentRef, level, text, className) {
  const document = getDocument(documentRef)
  const heading = document.createElement(`h${normalizeHeadingLevel(level)}`)
  heading.className = className
  setText(heading, text)
  return heading
}
