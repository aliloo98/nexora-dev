import assert from 'node:assert/strict'
import { TestDocument, createTestEvent } from '../../../tests/helpers/uiTestDom.mjs'
import { createButton, createInput } from '../primitives/index.js'
import { createModal, getFocusableElements } from '../components/Modal.js'

const documentRef = new TestDocument()
const trigger = createButton({ label: 'Ouvrir' }, documentRef)
documentRef.body.appendChild(trigger)
trigger.focus()

const input = createInput({ id: 'modal-name', label: 'Nom' }, documentRef)
const cancel = createButton({ label: 'Annuler', variant: 'ghost' }, documentRef)
const confirm = createButton({ label: 'Confirmer' }, documentRef)
const closeReasons = []
const inputControl = input.querySelector('input')
const modal = createModal({
  title: 'Confirmation',
  description: 'Description',
  content: input,
  footer: [cancel, confirm],
  initialFocus: () => inputControl,
  onClose: (reason) => closeReasons.push(reason)
}, documentRef)

assert.equal(modal.dialog.getAttribute('role'), 'dialog')
assert.equal(modal.dialog.getAttribute('aria-modal'), 'true')
assert.ok(modal.dialog.getAttribute('aria-labelledby'))
assert.ok(modal.dialog.getAttribute('aria-describedby'))
assert.equal(modal.element.hidden, true)

modal.open()
assert.equal(modal.isOpen(), true)
assert.equal(documentRef.activeElement, inputControl)
assert.equal(documentRef.body.classList.contains('nx-modal-open'), true)
assert.equal(documentRef.listenerCount('keydown'), 1)

const focusable = getFocusableElements(modal.dialog)
assert.equal(focusable.length, 4)
focusable.at(-1).focus()
const tabEvent = createTestEvent('keydown', { key: 'Tab' })
documentRef.dispatchEvent(tabEvent)
assert.equal(tabEvent.defaultPrevented, true)
assert.equal(documentRef.activeElement, focusable[0])

focusable[0].focus()
const reverseTab = createTestEvent('keydown', { key: 'Tab', shiftKey: true })
documentRef.dispatchEvent(reverseTab)
assert.equal(documentRef.activeElement, focusable.at(-1))

const escape = createTestEvent('keydown', { key: 'Escape' })
documentRef.dispatchEvent(escape)
assert.equal(modal.isOpen(), false)
assert.equal(documentRef.activeElement, trigger)
assert.equal(documentRef.body.classList.contains('nx-modal-open'), false)
assert.equal(documentRef.listenerCount('keydown'), 0)
assert.deepEqual(closeReasons, ['escape'])

const lockedModal = createModal({
  title: 'Non dismissible',
  closeOnBackdrop: false
}, documentRef)
lockedModal.open()
lockedModal.element.dispatchEvent(createTestEvent('pointerdown', { target: lockedModal.element }))
assert.equal(lockedModal.isOpen(), true)
lockedModal.open({ closeOnBackdrop: true })
assert.equal(lockedModal.isOpen(), true)
lockedModal.close()
lockedModal.open({ closeOnBackdrop: true })
lockedModal.element.dispatchEvent(createTestEvent('pointerdown', { target: lockedModal.element }))
assert.equal(lockedModal.isOpen(), false)
lockedModal.destroy()
assert.equal(documentRef.listenerCount('keydown'), 0)
assert.equal(lockedModal.element.parentNode, null)

modal.destroy()
console.info('Nexora UI modal tests: OK')
