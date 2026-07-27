import { getDocument, listen, setText } from '../internal/dom.js'

/**
 * Creates a controlled filter or selection chip.
 * @example createChip({ label: 'Ce mois', selected: true, onChange })
 */
export function createChip(options = {}, documentRef) {
  const document = getDocument(documentRef)
  const selected = options.selected === true
  const chip = document.createElement('button')
  chip.className = `nx-chip${selected ? ' nx-chip--selected' : ''}`
  chip.type = 'button'
  chip.disabled = options.disabled === true
  chip.setAttribute('aria-pressed', selected ? 'true' : 'false')
  setText(chip, options.label || '')
  listen(chip, 'click', (event) => options.onChange?.(!selected, event))
  return chip
}

export default createChip
