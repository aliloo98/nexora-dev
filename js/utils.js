import { createButton } from '../src/ui/primitives/Button.js'
import { createModal } from '../src/ui/components/Modal.js'
import { createToastRegion } from '../src/ui/components/Toast.js'

let confirmationModal = null
let confirmationTitle = null
let confirmationDescription = null
let confirmationCallback = null
let toastRegion = null

const getToastTone = (message) => {
  const text = String(message || '')
  if (text.includes('❌')) return 'danger'
  if (text.includes('⚠️')) return 'warning'
  if (text.includes('✅') || text.includes('🎯')) return 'success'
  return 'neutral'
}

const getToastRegion = () => {
  if (!toastRegion) toastRegion = createToastRegion({ ariaLabel: 'Notifications Nexora' })
  return toastRegion
}

const getConfirmationModal = () => {
  if (confirmationModal) return confirmationModal

  const cancelButton = createButton({
    label: 'Annuler',
    variant: 'secondary',
    onClick: () => confirmationModal?.close('cancel')
  })
  const confirmButton = createButton({
    label: 'Confirmer',
    variant: 'primary',
    onClick: () => {
      const callback = confirmationCallback
      confirmationModal?.close('confirm')
      callback?.()
    }
  })

  confirmationModal = createModal({
    title: 'Confirmation',
    description: ' ',
    footer: [cancelButton, confirmButton],
    initialFocus: () => cancelButton,
    closeOnBackdrop: false,
    onClose: () => {
      confirmationCallback = null
    }
  })
  confirmationTitle = confirmationModal.dialog.querySelector('.nx-modal__title')
  confirmationDescription = confirmationModal.dialog.querySelector('.nx-modal__description')
  return confirmationModal
}

// Shared utility functions
const Utils = {
  fmt: (n) => n.toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) + ' €',

  showToast: (msg, options = {}) => {
    const message = String(msg || '')
    return getToastRegion().show({
      message,
      tone: options.tone || getToastTone(message),
      duration: options.duration ?? 3000
    })
  },

  customConfirm: (title, message, onConfirm, options = {}) => {
    const modal = getConfirmationModal()
    if (modal.isOpen()) modal.close('replaced')
    confirmationTitle.textContent = String(title || 'Confirmation')
    confirmationDescription.textContent = String(message || '')
    confirmationCallback = typeof onConfirm === 'function' ? onConfirm : null
    modal.open({ closeOnBackdrop: options.closeOnBackdrop === true })
    return modal
  }
};

// Make globally accessible
const showToast = (msg, options) => Utils.showToast(msg, options);
const customConfirm = (title, message, onConfirm, options) => Utils.customConfirm(title, message, onConfirm, options);

export { Utils, showToast, customConfirm };
