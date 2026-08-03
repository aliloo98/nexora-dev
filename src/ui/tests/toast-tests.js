import assert from 'node:assert/strict'
import { TestDocument, createTestEvent, createTestScheduler } from '../../../tests/helpers/uiTestDom.mjs'
import { createToastRegion } from '../components/Toast.js'

const documentRef = new TestDocument()
const scheduler = createTestScheduler()
const dismissReasons = []
const region = createToastRegion({ scheduler }, documentRef)

assert.equal(region.element.getAttribute('role'), 'status')
assert.equal(region.element.getAttribute('aria-live'), 'polite')
assert.equal(region.element.getAttribute('aria-atomic'), 'false')
const focusKeeper = documentRef.createElement('button')
documentRef.body.appendChild(focusKeeper)
focusKeeper.focus()
const first = region.show({
  message: 'Budget enregistré',
  tone: 'success',
  duration: 4000,
  onDismiss: (reason) => dismissReasons.push(reason)
})
assert.equal(first.element.getAttribute('role'), null)
assert.equal(documentRef.activeElement, focusKeeper)
assert.equal(region.getActiveCount(), 1)
assert.deepEqual(scheduler.durations(), [4000])

first.element.dispatchEvent(createTestEvent('mouseenter'))
assert.equal(scheduler.count(), 0)
first.element.dispatchEvent(createTestEvent('mouseleave'))
assert.equal(scheduler.count(), 1)
scheduler.runAll()
assert.equal(region.getActiveCount(), 0)
assert.deepEqual(dismissReasons, ['timeout'])

let actionCalls = 0
const actionable = region.show({
  message: 'Modification appliquée',
  tone: 'warning',
  duration: 0,
  actionLabel: 'Annuler',
  onAction: () => { actionCalls += 1 }
})
const actionButton = actionable.element.querySelector('button')
actionButton.click()
assert.equal(actionCalls, 1)
assert.equal(region.getActiveCount(), 0)

const alert = region.show({ message: 'Erreur', tone: 'danger', duration: 0 })
assert.equal(alert.element.classList.contains('nx-toast--danger'), true)
alert.dismiss('manual')
assert.equal(region.getActiveCount(), 0)

const duplicate = region.show({ message: 'Un', duration: 1000 })
const duplicateAgain = region.show({ message: 'Un', duration: 1000 })
assert.equal(duplicateAgain.id, duplicate.id)
assert.equal(region.getActiveCount(), 1)
region.show({ message: 'Deux', duration: 1000 })
assert.equal(region.getActiveCount(), 2)
region.destroy()
assert.equal(scheduler.count(), 0)
assert.equal(region.element.parentNode, null)

console.info('Nexora UI toast tests: OK')
