import { createButton } from '../primitives/Button.js'
import { appendContent, createId, getDocument, listen, setText } from '../internal/dom.js'

const FOCUSABLE_TAGS = new Set(['BUTTON', 'A', 'INPUT', 'SELECT', 'TEXTAREA'])

export function getFocusableElements(root) {
  const focusable = []
  const visit = (node) => {
    Array.from(node?.children || []).forEach((child) => {
      const tagName = String(child.tagName || '').toUpperCase()
      const tabIndex = child.getAttribute?.('tabindex')
      const hidden = child.hidden === true || child.getAttribute?.('aria-hidden') === 'true'
      const disabled = child.disabled === true || child.getAttribute?.('aria-disabled') === 'true'
      const naturallyFocusable = FOCUSABLE_TAGS.has(tagName)
        && (tagName !== 'A' || Boolean(child.getAttribute?.('href')))
      const explicitlyFocusable = tabIndex !== null && Number(tabIndex) >= 0
      if (!hidden && !disabled && (naturallyFocusable || explicitlyFocusable)) focusable.push(child)
      visit(child)
    })
  }
  visit(root)
  return focusable
}

/**
 * Creates a mounted modal controller with focus trapping and restoration.
 * @example createModal({ title: 'Confirmation', content, footer }).open()
 */
export function createModal(options = {}, documentRef) {
  const document = getDocument(documentRef)
  const titleId = options.titleId || createId('nx-modal-title')
  const descriptionId = options.description ? (options.descriptionId || createId('nx-modal-description')) : null
  const overlay = document.createElement('div')
  overlay.className = 'nx-modal'
  overlay.hidden = true
  overlay.setAttribute('aria-hidden', 'true')

  const dialog = document.createElement('section')
  dialog.className = 'nx-modal__dialog'
  dialog.setAttribute('role', 'dialog')
  dialog.setAttribute('aria-modal', 'true')
  dialog.setAttribute('aria-labelledby', titleId)
  if (descriptionId) dialog.setAttribute('aria-describedby', descriptionId)

  const header = document.createElement('header')
  header.className = 'nx-modal__header'
  const heading = document.createElement('h2')
  heading.className = 'nx-modal__title'
  heading.id = titleId
  setText(heading, options.title || '')
  header.appendChild(heading)

  const closeButton = createButton({
    variant: 'ghost',
    size: 'icon-only',
    icon: 'close',
    ariaLabel: options.closeLabel || 'Fermer la boîte de dialogue'
  }, document)
  closeButton.classList.add('nx-modal__close')
  header.appendChild(closeButton)
  dialog.appendChild(header)

  if (options.description) {
    const description = document.createElement('p')
    description.className = 'nx-modal__description'
    description.id = descriptionId
    setText(description, options.description)
    dialog.appendChild(description)
  }

  const body = document.createElement('div')
  body.className = 'nx-modal__body'
  appendContent(body, options.content, document)
  dialog.appendChild(body)

  const footer = document.createElement('footer')
  footer.className = 'nx-modal__footer'
  appendContent(footer, options.footer, document)
  if (footer.children.length || footer.textContent) dialog.appendChild(footer)

  overlay.appendChild(dialog)
  const mount = options.mount || document.body
  mount.appendChild(overlay)

  let open = false
  let previousFocus = null
  let removeDocumentKeydown = () => {}

  const close = (reason = 'programmatic') => {
    if (!open) return
    open = false
    removeDocumentKeydown()
    removeDocumentKeydown = () => {}
    overlay.classList.remove('nx-modal--open')
    overlay.hidden = true
    overlay.setAttribute('aria-hidden', 'true')
    document.body?.classList.remove('nx-modal-open')
    if (previousFocus?.focus) previousFocus.focus()
    options.onClose?.(reason)
  }

  const handleKeydown = (event) => {
    if (event.key === 'Escape') {
      event.preventDefault()
      close('escape')
      return
    }
    if (event.key !== 'Tab') return
    const focusable = getFocusableElements(dialog)
    if (focusable.length === 0) {
      event.preventDefault()
      dialog.focus?.()
      return
    }
    const first = focusable[0]
    const last = focusable[focusable.length - 1]
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault()
      last.focus()
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault()
      first.focus()
    }
  }

  const show = () => {
    if (open) return
    open = true
    previousFocus = document.activeElement
    overlay.hidden = false
    overlay.setAttribute('aria-hidden', 'false')
    overlay.classList.add('nx-modal--open')
    document.body?.classList.add('nx-modal-open')
    removeDocumentKeydown = listen(document, 'keydown', handleKeydown)
    const focusTarget = typeof options.initialFocus === 'function'
      ? options.initialFocus({ dialog, closeButton })
      : options.initialFocus
    const first = focusTarget?.focus ? focusTarget : getFocusableElements(dialog)[0]
    ;(first || closeButton).focus()
  }

  listen(closeButton, 'click', () => close('close-button'))
  listen(overlay, 'pointerdown', (event) => {
    if (event.target !== overlay || options.closeOnBackdrop === false) return
    close('backdrop')
  })

  const destroy = () => {
    if (open) close('destroy')
    removeDocumentKeydown()
    overlay.remove()
  }

  return {
    element: overlay,
    dialog,
    body,
    closeButton,
    open: show,
    close,
    destroy,
    isOpen: () => open
  }
}

export default createModal
