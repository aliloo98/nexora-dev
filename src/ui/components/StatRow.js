import { createButton } from '../primitives/Button.js'
import { getDocument, normalizeChoice, setText } from '../internal/dom.js'

const TONES = ['neutral', 'positive', 'warning', 'critical', 'stable']

/**
 * Creates a compact label/value pair with an optional secondary action.
 * @example createStatRow({ label: 'Reste', value: '1 651 €' })
 */
export function createStatRow(options = {}, documentRef) {
  const document = getDocument(documentRef)
  const tone = normalizeChoice(options.tone, TONES, 'neutral')
  const row = document.createElement('div')
  row.className = `nx-stat-row nx-stat-row--${tone}`

  const copy = document.createElement('div')
  copy.className = 'nx-stat-row__copy'
  const label = document.createElement('span')
  label.className = 'nx-stat-row__label'
  setText(label, options.label || '')
  const value = document.createElement('strong')
  value.className = 'nx-stat-row__value nx-numeric'
  setText(value, options.value ?? '—')
  copy.appendChild(label)
  copy.appendChild(value)
  if (options.helper) {
    const helper = document.createElement('span')
    helper.className = 'nx-stat-row__helper'
    setText(helper, options.helper)
    copy.appendChild(helper)
  }
  row.appendChild(copy)

  if (options.actionLabel && typeof options.onAction === 'function') {
    const action = createButton({
      label: options.actionLabel,
      variant: 'ghost',
      size: 'compact',
      onClick: options.onAction
    }, document)
    row.appendChild(action)
  }
  return row
}

export default createStatRow
