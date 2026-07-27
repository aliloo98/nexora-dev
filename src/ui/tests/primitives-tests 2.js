import assert from 'node:assert/strict'
import { TestDocument } from '../../../tests/helpers/uiTestDom.mjs'
import { createBadge, createButton, createCard, createChip, createInput, createProgress } from '../primitives/index.js'

const documentRef = new TestDocument()

let buttonCalls = 0
const primary = createButton({
  label: 'Continuer',
  variant: 'primary',
  onClick: () => { buttonCalls += 1 }
}, documentRef)
assert.ok(primary.classList.contains('nx-button--primary'))
assert.equal(primary.disabled, false)
primary.click()
assert.equal(buttonCalls, 1)

const disabled = createButton({ label: 'Indisponible', disabled: true }, documentRef)
disabled.click()
assert.equal(disabled.getAttribute('aria-disabled'), 'true')

const loading = createButton({ label: 'Enregistrer', loading: true }, documentRef)
assert.equal(loading.disabled, true)
assert.ok(loading.classList.contains('nx-button--loading'))
assert.equal(loading.querySelector('[role="status"]').textContent, 'Chargement')

assert.throws(
  () => createButton({ size: 'icon-only', icon: 'plus' }, documentRef),
  /ariaLabel/
)
const iconOnly = createButton({
  size: 'icon-only',
  icon: 'plus',
  ariaLabel: 'Ajouter'
}, documentRef)
assert.equal(iconOnly.getAttribute('aria-label'), 'Ajouter')

const field = createInput({
  id: 'income',
  label: 'Revenus',
  helper: 'Montant mensuel',
  error: 'Montant invalide',
  suffix: '€'
}, documentRef)
const fieldLabel = field.querySelector('label')
const fieldControl = field.querySelector('input')
const fieldHelper = field.querySelector('.nx-field__helper')
const fieldError = field.querySelector('.nx-field__error')
assert.equal(fieldLabel.getAttribute('for'), 'income')
assert.equal(fieldControl.getAttribute('aria-invalid'), 'true')
assert.equal(fieldControl.getAttribute('aria-describedby'), 'income-helper income-error')
assert.equal(fieldHelper.id, 'income-helper')
assert.equal(fieldError.getAttribute('role'), 'alert')
assert.throws(() => createInput({ id: 'missing-label' }, documentRef), /permanent label/)

let chipResult = null
const chip = createChip({
  label: 'Ce mois',
  selected: true,
  onChange: (selected) => { chipResult = selected }
}, documentRef)
assert.equal(chip.getAttribute('aria-pressed'), 'true')
chip.click()
assert.equal(chipResult, false)

const progress = createProgress({
  label: 'Objectif',
  value: 140,
  min: 0,
  max: 100,
  valueLabel: '100 %'
}, documentRef)
const progressControl = progress.querySelector('progress')
assert.equal(progressControl.getAttribute('aria-valuemin'), '0')
assert.equal(progressControl.getAttribute('aria-valuemax'), '100')
assert.equal(progressControl.getAttribute('aria-valuenow'), '100')
assert.equal(progressControl.value, 100)

assert.equal(createBadge({ label: 'Stable', tone: 'stable' }, documentRef).textContent, 'Stable')

let cardCalls = 0
const interactiveCard = createCard({
  variant: 'interactive',
  children: 'Ouvrir',
  onActivate: () => { cardCalls += 1 }
}, documentRef)
interactiveCard.dispatchEvent({
  type: 'keydown',
  key: 'Enter',
  preventDefault() {}
})
assert.equal(cardCalls, 1)
assert.equal(interactiveCard.getAttribute('role'), 'button')
assert.throws(() => createCard({ variant: 'interactive' }, documentRef), /onActivate/)

console.info('Nexora UI primitive tests: OK')
