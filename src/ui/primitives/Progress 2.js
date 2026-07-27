import { getDocument, normalizeChoice, setOptionalAttribute, setText } from '../internal/dom.js'

/**
 * Creates a native accessible progress indicator.
 * @example createProgress({ label: 'Objectif', value: 30, max: 100 })
 */
export function createProgress(options = {}, documentRef) {
  const document = getDocument(documentRef)
  const min = Number.isFinite(Number(options.min)) ? Number(options.min) : 0
  const maxCandidate = Number(options.max)
  const max = Number.isFinite(maxCandidate) && maxCandidate > min ? maxCandidate : 100
  const thickness = normalizeChoice(Number(options.thickness), [4, 8], 8)
  const indeterminate = options.indeterminate === true

  const wrapper = document.createElement('div')
  wrapper.className = 'nx-progress'
  if (options.label || options.valueLabel) {
    const header = document.createElement('div')
    header.className = 'nx-progress__header'
    if (options.label) {
      const label = document.createElement('span')
      label.className = 'nx-progress__label'
      setText(label, options.label)
      header.appendChild(label)
    }
    if (options.valueLabel) {
      const valueLabel = document.createElement('span')
      valueLabel.className = 'nx-progress__value'
      setText(valueLabel, options.valueLabel)
      header.appendChild(valueLabel)
    }
    wrapper.appendChild(header)
  }

  const progress = document.createElement('progress')
  progress.className = `nx-progress__control nx-progress__control--${thickness}`
  progress.max = max - min
  if (!indeterminate) {
    const rawValue = Number(options.value)
    const safeValue = Number.isFinite(rawValue) ? Math.min(max, Math.max(min, rawValue)) : min
    progress.value = safeValue - min
    progress.setAttribute('aria-valuemin', String(min))
    progress.setAttribute('aria-valuemax', String(max))
    progress.setAttribute('aria-valuenow', String(safeValue))
  }
  setOptionalAttribute(progress, 'aria-label', options.ariaLabel || options.label)
  wrapper.appendChild(progress)
  return wrapper
}

export default createProgress
