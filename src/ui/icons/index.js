import { getDocument, normalizeChoice } from '../internal/dom.js'

const ICONS = {
  close: [
    ['path', { d: 'M6 6l12 12M18 6L6 18' }]
  ],
  check: [
    ['path', { d: 'M5 12.5l4.2 4.2L19 7' }]
  ],
  warning: [
    ['path', { d: 'M12 3.5L21 20H3L12 3.5z' }],
    ['path', { d: 'M12 9v4.5' }],
    ['circle', { cx: '12', cy: '17', r: '0.6', fill: 'currentColor', stroke: 'none' }]
  ],
  info: [
    ['circle', { cx: '12', cy: '12', r: '9' }],
    ['path', { d: 'M12 10.5V17' }],
    ['circle', { cx: '12', cy: '7.2', r: '0.6', fill: 'currentColor', stroke: 'none' }]
  ],
  chevron: [
    ['path', { d: 'M9 5l7 7-7 7' }]
  ],
  spinner: [
    ['circle', { cx: '12', cy: '12', r: '8', class: 'nx-icon__spinner-track' }],
    ['path', { d: 'M12 4a8 8 0 018 8', class: 'nx-icon__spinner-head' }]
  ],
  plus: [
    ['path', { d: 'M12 5v14M5 12h14' }]
  ],
  arrowRight: [
    ['path', { d: 'M5 12h14M14 7l5 5-5 5' }]
  ]
}

/**
 * Creates one of the small, dependency-free Nexora SVG icons.
 * @example createIcon('arrowRight', { size: 20 })
 */
export function createIcon(name, options = {}, documentRef) {
  const document = getDocument(documentRef)
  const iconName = Object.hasOwn(ICONS, name) ? name : 'info'
  const size = normalizeChoice(Number(options.size), [20, 24], 20)
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  svg.setAttribute('class', `nx-icon nx-icon--${size}${iconName === 'spinner' ? ' nx-icon--spinner' : ''}`)
  svg.setAttribute('viewBox', '0 0 24 24')
  svg.setAttribute('width', String(size))
  svg.setAttribute('height', String(size))
  svg.setAttribute('fill', 'none')
  svg.setAttribute('stroke', 'currentColor')
  svg.setAttribute('stroke-width', '1.75')
  svg.setAttribute('stroke-linecap', 'round')
  svg.setAttribute('stroke-linejoin', 'round')
  svg.setAttribute('focusable', 'false')
  svg.setAttribute('data-icon', iconName)

  if (options.label) {
    svg.setAttribute('role', 'img')
    svg.setAttribute('aria-label', String(options.label))
  } else {
    svg.setAttribute('aria-hidden', 'true')
  }

  for (const [tagName, attributes] of ICONS[iconName]) {
    const child = document.createElementNS('http://www.w3.org/2000/svg', tagName)
    Object.entries(attributes).forEach(([attribute, value]) => child.setAttribute(attribute, value))
    svg.appendChild(child)
  }

  return svg
}
