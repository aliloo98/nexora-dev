import assert from 'node:assert/strict'
import { toggleAvailableMoneyOptions } from './availableMoneyOptions.js'

const createElement = () => {
  const attrs = new Map()
  const classes = new Set()

  return {
    setAttribute(name, value) {
      attrs.set(name, String(value))
    },
    getAttribute(name) {
      return attrs.has(name) ? attrs.get(name) : null
    },
    textContent: '',
    hidden: true,
    classList: {
      add(name) {
        classes.add(name)
      },
      remove(name) {
        classes.delete(name)
      },
      contains(name) {
        return classes.has(name)
      }
    }
  }
}

const button = createElement()
const actions = createElement()

assert.equal(toggleAvailableMoneyOptions(button, actions), true)
assert.equal(button.getAttribute('aria-expanded'), 'true')
assert.equal(button.textContent, 'Masquer les options')
assert.equal(actions.hidden, false)
assert.equal(actions.classList.contains('is-visible'), true)

assert.equal(toggleAvailableMoneyOptions(button, actions), false)
assert.equal(button.getAttribute('aria-expanded'), 'false')
assert.equal(button.textContent, 'Voir les options')
assert.equal(actions.hidden, true)
assert.equal(actions.classList.contains('is-visible'), false)

console.log('availableMoneyOptions-tests: OK')
