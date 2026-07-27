class TestClassList {
  constructor(element) {
    this.element = element
    this.values = new Set()
  }

  fromString(value) {
    this.values = new Set(String(value || '').split(/\s+/).filter(Boolean))
  }

  add(...names) {
    names.filter(Boolean).forEach((name) => this.values.add(name))
  }

  remove(...names) {
    names.forEach((name) => this.values.delete(name))
  }

  contains(name) {
    return this.values.has(name)
  }

  toggle(name, force) {
    const shouldAdd = force === undefined ? !this.values.has(name) : Boolean(force)
    if (shouldAdd) this.values.add(name)
    else this.values.delete(name)
    return shouldAdd
  }

  toString() {
    return Array.from(this.values).join(' ')
  }
}

class TestEventTarget {
  constructor() {
    this.listeners = new Map()
  }

  addEventListener(type, listener) {
    if (typeof listener !== 'function') return
    if (!this.listeners.has(type)) this.listeners.set(type, new Set())
    this.listeners.get(type).add(listener)
  }

  removeEventListener(type, listener) {
    this.listeners.get(type)?.delete(listener)
  }

  dispatchEvent(event) {
    const normalized = event || {}
    normalized.type ||= 'unknown'
    normalized.target ||= this
    normalized.currentTarget = this
    normalized.defaultPrevented ||= false
    normalized.preventDefault ||= function preventDefault() {
      this.defaultPrevented = true
    }
    for (const listener of this.listeners.get(normalized.type) || []) {
      listener.call(this, normalized)
    }
    return !normalized.defaultPrevented
  }

  listenerCount(type) {
    return this.listeners.get(type)?.size || 0
  }
}

class TestTextNode {
  constructor(text, ownerDocument) {
    this.nodeType = 3
    this.ownerDocument = ownerDocument
    this.parentNode = null
    this.data = String(text)
  }

  get textContent() {
    return this.data
  }

  set textContent(value) {
    this.data = String(value)
  }

  remove() {
    this.parentNode?.removeChild(this)
  }
}

function parseAttributeSelector(selector) {
  const match = selector.match(/^\[([^=\]]+)(?:=["']?([^"'\]]+)["']?)?\]$/)
  return match ? { name: match[1], value: match[2] } : null
}

function matchesSimpleSelector(element, selector) {
  const trimmed = selector.trim()
  if (!trimmed) return false
  if (trimmed.startsWith('#')) return element.id === trimmed.slice(1)
  if (trimmed.startsWith('.')) {
    return trimmed.slice(1).split('.').every((name) => element.classList.contains(name))
  }
  const attribute = parseAttributeSelector(trimmed)
  if (attribute) {
    const actual = element.getAttribute(attribute.name)
    return attribute.value === undefined ? actual !== null : actual === attribute.value
  }
  const tagAndClass = trimmed.match(/^([a-z0-9-]+)((?:\.[a-z0-9_-]+)*)$/i)
  if (tagAndClass) {
    const tagMatches = element.tagName === tagAndClass[1].toUpperCase()
    const classes = tagAndClass[2].split('.').filter(Boolean)
    return tagMatches && classes.every((name) => element.classList.contains(name))
  }
  return false
}

class TestElement extends TestEventTarget {
  constructor(tagName, ownerDocument) {
    super()
    this.nodeType = 1
    this.tagName = String(tagName).toUpperCase()
    this.ownerDocument = ownerDocument
    this.parentNode = null
    this.childNodes = []
    this.attributes = new Map()
    this.classList = new TestClassList(this)
    this.hidden = false
    this.disabled = false
    this.required = false
    this.value = ''
    this.type = ''
    this.name = ''
    this.max = 1
    this.min = 0
    this._id = ''
    this._text = ''
  }

  get children() {
    return this.childNodes.filter((node) => node.nodeType === 1)
  }

  get firstChild() {
    return this.childNodes[0] || null
  }

  get className() {
    return this.classList.toString()
  }

  set className(value) {
    this.classList.fromString(value)
  }

  get id() {
    return this._id
  }

  set id(value) {
    this._id = String(value || '')
    if (this._id) this.attributes.set('id', this._id)
    else this.attributes.delete('id')
  }

  get textContent() {
    return this._text + this.childNodes.map((node) => node.textContent).join('')
  }

  set textContent(value) {
    this._text = String(value ?? '')
    this.childNodes = []
  }

  setAttribute(name, value) {
    const normalized = String(value)
    this.attributes.set(name, normalized)
    if (name === 'class') this.className = normalized
    if (name === 'id') this._id = normalized
    if (name === 'tabindex') this.tabIndex = Number(normalized)
    if (name === 'href') this.href = normalized
  }

  getAttribute(name) {
    if (name === 'class') return this.className || null
    if (name === 'id') return this.id || null
    return this.attributes.has(name) ? this.attributes.get(name) : null
  }

  hasAttribute(name) {
    return this.getAttribute(name) !== null
  }

  removeAttribute(name) {
    this.attributes.delete(name)
    if (name === 'id') this._id = ''
  }

  appendChild(node) {
    if (!node?.nodeType) throw new TypeError('Only test nodes can be appended')
    node.parentNode?.removeChild(node)
    node.parentNode = this
    this.childNodes.push(node)
    return node
  }

  append(...nodes) {
    nodes.forEach((node) => {
      this.appendChild(node?.nodeType ? node : this.ownerDocument.createTextNode(String(node)))
    })
  }

  prepend(...nodes) {
    const normalized = nodes.map((node) => node?.nodeType ? node : this.ownerDocument.createTextNode(String(node)))
    normalized.reverse().forEach((node) => {
      node.parentNode?.removeChild(node)
      node.parentNode = this
      this.childNodes.unshift(node)
    })
  }

  replaceChildren(...nodes) {
    this.childNodes.forEach((node) => {
      node.parentNode = null
    })
    this.childNodes = []
    this._text = ''
    this.append(...nodes)
  }

  removeChild(node) {
    const index = this.childNodes.indexOf(node)
    if (index >= 0) {
      this.childNodes.splice(index, 1)
      node.parentNode = null
    }
    return node
  }

  remove() {
    this.parentNode?.removeChild(this)
  }

  contains(node) {
    if (node === this) return true
    return this.children.some((child) => child.contains(node))
  }

  querySelectorAll(selector) {
    const selectors = String(selector).split(',').map((item) => item.trim())
    const matches = []
    const visit = (node) => {
      node.children.forEach((child) => {
        if (selectors.some((candidate) => matchesSimpleSelector(child, candidate))) matches.push(child)
        visit(child)
      })
    }
    visit(this)
    return matches
  }

  querySelector(selector) {
    return this.querySelectorAll(selector)[0] || null
  }

  focus() {
    this.ownerDocument.activeElement = this
  }

  blur() {
    if (this.ownerDocument.activeElement === this) this.ownerDocument.activeElement = this.ownerDocument.body
  }

  click() {
    if (this.disabled) return
    this.dispatchEvent({ type: 'click', target: this })
  }
}

export class TestDocument extends TestEventTarget {
  constructor() {
    super()
    this.nodeType = 9
    this.documentElement = new TestElement('html', this)
    this.body = new TestElement('body', this)
    this.documentElement.appendChild(this.body)
    this.activeElement = this.body
  }

  createElement(tagName) {
    return new TestElement(tagName, this)
  }

  createElementNS(_namespace, tagName) {
    return this.createElement(tagName)
  }

  createTextNode(text) {
    return new TestTextNode(text, this)
  }

  getElementById(id) {
    if (this.documentElement.id === id) return this.documentElement
    return this.documentElement.querySelector(`#${id}`)
  }

  querySelector(selector) {
    return this.documentElement.querySelector(selector)
  }

  querySelectorAll(selector) {
    return this.documentElement.querySelectorAll(selector)
  }
}

export function createTestEvent(type, properties = {}) {
  return {
    type,
    defaultPrevented: false,
    preventDefault() {
      this.defaultPrevented = true
    },
    ...properties
  }
}

export function createTestScheduler() {
  let sequence = 0
  const timers = new Map()
  return {
    setTimeout(callback, duration) {
      sequence += 1
      timers.set(sequence, { callback, duration })
      return sequence
    },
    clearTimeout(id) {
      timers.delete(id)
    },
    run(id) {
      const timer = timers.get(id)
      if (!timer) return false
      timers.delete(id)
      timer.callback()
      return true
    },
    runAll() {
      Array.from(timers.keys()).forEach((id) => this.run(id))
    },
    count() {
      return timers.size
    },
    durations() {
      return Array.from(timers.values()).map((timer) => timer.duration)
    }
  }
}
