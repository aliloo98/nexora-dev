import { createButton } from '../primitives/Button.js'
import { createId, getDocument, listen, normalizeChoice, setText } from '../internal/dom.js'

const TONES = ['neutral', 'success', 'warning', 'danger', 'info']

/**
 * Creates a toast region controller with timer cleanup and pause on interaction.
 * @example createToastRegion().show({ message: 'Budget enregistré', tone: 'success' })
 */
export function createToastRegion(options = {}, documentRef) {
  const document = getDocument(documentRef)
  const scheduler = options.scheduler || globalThis
  const region = document.createElement('section')
  region.className = 'nx-toast-region nx-scope'
  region.setAttribute('aria-label', options.ariaLabel || 'Notifications')
  region.setAttribute('role', 'status')
  region.setAttribute('aria-live', 'polite')
  region.setAttribute('aria-atomic', 'false')
  region.setAttribute('aria-relevant', 'additions text')
  ;(options.mount || document.body).appendChild(region)

  const active = new Map()

  const clearTimer = (entry) => {
    if (entry?.timer !== null && entry?.timer !== undefined) {
      scheduler.clearTimeout(entry.timer)
      entry.timer = null
    }
  }

  const dismiss = (id, reason = 'programmatic') => {
    const entry = active.get(id)
    if (!entry) return false
    clearTimer(entry)
    entry.element.remove()
    active.delete(id)
    entry.onDismiss?.(reason)
    return true
  }

  const schedule = (entry) => {
    if (!entry.duration || entry.duration <= 0) return
    clearTimer(entry)
    entry.timer = scheduler.setTimeout(() => dismiss(entry.id, 'timeout'), entry.duration)
  }

  const show = (toastOptions = {}) => {
    const tone = normalizeChoice(toastOptions.tone, TONES, 'neutral')
    const duration = Number.isFinite(Number(toastOptions.duration))
      ? Math.max(0, Number(toastOptions.duration))
      : 5000
    const messageText = String(toastOptions.message || '')
    const duplicate = Array.from(active.values()).find((entry) => (
      entry.message === messageText && entry.tone === tone
    ))
    if (duplicate) {
      duplicate.duration = duration
      schedule(duplicate)
      return {
        id: duplicate.id,
        element: duplicate.element,
        dismiss: (reason) => dismiss(duplicate.id, reason)
      }
    }

    const id = toastOptions.id || createId('nx-toast')
    const toast = document.createElement('article')
    toast.className = `nx-toast nx-toast--${tone}`
    toast.setAttribute('data-toast-id', id)

    const message = document.createElement('p')
    message.className = 'nx-toast__message'
    setText(message, messageText)
    toast.appendChild(message)

    const actions = document.createElement('div')
    actions.className = 'nx-toast__actions'
    if (toastOptions.actionLabel && typeof toastOptions.onAction === 'function') {
      actions.appendChild(createButton({
        label: toastOptions.actionLabel,
        variant: 'ghost',
        size: 'compact',
        onClick: (event) => {
          toastOptions.onAction(event)
          dismiss(id, 'action')
        }
      }, document))
    }
    actions.appendChild(createButton({
      variant: 'ghost',
      size: 'icon-only',
      icon: 'close',
      ariaLabel: toastOptions.dismissLabel || 'Fermer la notification',
      onClick: () => dismiss(id, 'close-button')
    }, document))
    toast.appendChild(actions)
    region.appendChild(toast)

    const entry = {
      id,
      element: toast,
      message: messageText,
      tone,
      duration,
      timer: null,
      onDismiss: toastOptions.onDismiss
    }
    active.set(id, entry)
    listen(toast, 'mouseenter', () => clearTimer(entry))
    listen(toast, 'mouseleave', () => schedule(entry))
    listen(toast, 'focusin', () => clearTimer(entry))
    listen(toast, 'focusout', () => schedule(entry))
    schedule(entry)

    return {
      id,
      element: toast,
      dismiss: (reason) => dismiss(id, reason)
    }
  }

  const destroy = () => {
    Array.from(active.keys()).forEach((id) => dismiss(id, 'destroy'))
    region.remove()
  }

  return {
    element: region,
    show,
    dismiss,
    destroy,
    getActiveCount: () => active.size
  }
}

export default createToastRegion
