import { getDocument, normalizeChoice, setText } from '../internal/dom.js'

const TONES = ['neutral', 'opportunity', 'stable', 'success', 'warning', 'danger', 'info']

/**
 * Creates a non-interactive semantic status label.
 * @example createBadge({ label: 'Stable', tone: 'stable' })
 */
export function createBadge(options = {}, documentRef) {
  const document = getDocument(documentRef)
  const tone = normalizeChoice(options.tone, TONES, 'neutral')
  const badge = document.createElement('span')
  badge.className = `nx-badge nx-badge--${tone}`
  setText(badge, options.label || '')
  return badge
}

export default createBadge
