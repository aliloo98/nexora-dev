import { getDocument, listen, setOptionalAttribute, setText } from '../internal/dom.js'

/**
 * Creates a labelled form field with helper and error associations.
 * An id or name is required to keep the label association deterministic.
 * @example createInput({ id: 'monthly-income', label: 'Revenus', suffix: '€' })
 */
export function createInput(options = {}, documentRef) {
  const document = getDocument(documentRef)
  const id = options.id || options.name
  if (!id) throw new Error('Nexora inputs require an id or name')
  if (!options.label) throw new Error('Nexora inputs require a permanent label')

  const field = document.createElement('div')
  field.className = `nx-field${options.error ? ' nx-field--invalid' : ''}${options.disabled ? ' nx-field--disabled' : ''}`

  const label = document.createElement('label')
  label.className = 'nx-field__label'
  label.setAttribute('for', id)
  setText(label, options.label)
  if (options.required) {
    const required = document.createElement('span')
    required.className = 'nx-field__required'
    required.setAttribute('aria-hidden', 'true')
    required.textContent = ' *'
    label.appendChild(required)
  }
  field.appendChild(label)

  const controlWrap = document.createElement('div')
  controlWrap.className = 'nx-field__control'
  if (options.prefix !== undefined) {
    const prefix = document.createElement('span')
    prefix.className = 'nx-field__affix nx-field__affix--prefix'
    prefix.setAttribute('aria-hidden', 'true')
    setText(prefix, options.prefix)
    controlWrap.appendChild(prefix)
  }

  const input = document.createElement('input')
  input.className = 'nx-input'
  input.id = id
  input.type = options.type || 'text'
  input.name = options.name || id
  input.disabled = options.disabled === true
  input.required = options.required === true
  if (options.value !== undefined) input.value = String(options.value)
  setOptionalAttribute(input, 'placeholder', options.placeholder)
  setOptionalAttribute(input, 'inputmode', options.inputMode)
  setOptionalAttribute(input, 'autocomplete', options.autocomplete)
  setOptionalAttribute(input, 'min', options.min)
  setOptionalAttribute(input, 'max', options.max)
  setOptionalAttribute(input, 'step', options.step)

  const describedBy = []
  if (options.helper) describedBy.push(`${id}-helper`)
  if (options.error) describedBy.push(`${id}-error`)
  setOptionalAttribute(input, 'aria-describedby', describedBy.join(' '))
  input.setAttribute('aria-invalid', options.error ? 'true' : 'false')

  listen(input, 'input', options.onInput)
  listen(input, 'change', options.onChange)
  controlWrap.appendChild(input)

  if (options.suffix !== undefined) {
    const suffix = document.createElement('span')
    suffix.className = 'nx-field__affix nx-field__affix--suffix'
    suffix.setAttribute('aria-hidden', 'true')
    setText(suffix, options.suffix)
    controlWrap.appendChild(suffix)
  }
  field.appendChild(controlWrap)

  if (options.helper) {
    const helper = document.createElement('p')
    helper.className = 'nx-field__helper'
    helper.id = `${id}-helper`
    setText(helper, options.helper)
    field.appendChild(helper)
  }

  if (options.error) {
    const error = document.createElement('p')
    error.className = 'nx-field__error'
    error.id = `${id}-error`
    error.setAttribute('role', 'alert')
    setText(error, options.error)
    field.appendChild(error)
  }

  return field
}

export default createInput
