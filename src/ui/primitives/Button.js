import { createIcon } from '../icons/index.js'
import { getDocument, listen, normalizeChoice, setOptionalAttribute, setText } from '../internal/dom.js'

const VARIANTS = ['primary', 'secondary', 'ghost', 'danger']
const SIZES = ['default', 'compact', 'icon-only']

/**
 * Creates an accessible Nexora button.
 * @example createButton({ label: 'Continuer', variant: 'primary', onClick })
 */
export function createButton(options = {}, documentRef) {
  const document = getDocument(documentRef)
  const variant = normalizeChoice(options.variant, VARIANTS, 'primary')
  const size = normalizeChoice(options.size, SIZES, 'default')
  const loading = options.loading === true
  const iconPosition = normalizeChoice(options.iconPosition, ['start', 'end'], 'start')
  const button = document.createElement('button')
  button.className = `nx-button nx-button--${variant} nx-button--${size}${loading ? ' nx-button--loading' : ''}`
  button.type = options.type || 'button'
  button.disabled = options.disabled === true || loading
  button.setAttribute('aria-disabled', button.disabled ? 'true' : 'false')
  setOptionalAttribute(button, 'name', options.name)
  setOptionalAttribute(button, 'value', options.value)

  if (size === 'icon-only' && !options.ariaLabel) {
    throw new Error('Nexora icon-only buttons require an ariaLabel')
  }
  setOptionalAttribute(button, 'aria-label', options.ariaLabel)

  const iconName = loading ? 'spinner' : options.icon
  const icon = iconName ? createIcon(iconName, { size: options.iconSize || 20 }, document) : null
  if (icon && (loading || size === 'icon-only' || iconPosition === 'start')) button.appendChild(icon)

  if (size !== 'icon-only') {
    const label = document.createElement('span')
    label.className = 'nx-button__label'
    setText(label, options.label || '')
    button.appendChild(label)
  }
  if (icon && !loading && size !== 'icon-only' && iconPosition === 'end') button.appendChild(icon)

  if (loading) {
    const status = document.createElement('span')
    status.className = 'nx-sr-only'
    status.setAttribute('role', 'status')
    setText(status, options.loadingLabel || 'Chargement')
    button.appendChild(status)
  } else {
    listen(button, 'click', options.onClick)
  }

  return button
}

export default createButton
