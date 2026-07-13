import assert from 'node:assert/strict'
import fs from 'node:fs'

const html = fs.readFileSync(new URL('../../index.html', import.meta.url), 'utf8')
assert.match(html, /<body class="auth-locked">/, 'application chrome should be locked in the initial HTML')
assert.match(html, /body\.auth-locked > main/, 'initial lock should hide the main financial content')
assert.match(html, /body\.auth-locked > \.sidebar/, 'initial lock should hide navigation')
assert.match(html, /body\.auth-locked > \.save-bar/, 'initial lock should hide budget actions')
assert.match(html, /body\.auth-locked > #nexora-status-bar/, 'initial lock should hide sync status while logged out')

const bodyClasses = new Set(['auth-locked'])
const authContainer = { style: {} }
const main = { style: {} }
const sidebar = { style: {} }

globalThis.window = {}
globalThis.document = {
  body: {
    classList: {
      add: (name) => bodyClasses.add(name),
      remove: (name) => bodyClasses.delete(name)
    }
  },
  getElementById: (id) => id === 'auth-container' ? authContainer : null,
  querySelector: (selector) => selector === 'main' ? main : selector === '.sidebar' ? sidebar : null
}

const { AuthPages } = await import('../pages/AuthPages.js')

AuthPages.hideAuthPages()
assert.equal(bodyClasses.has('auth-locked'), false, 'authenticated UI should remove the initial lock')
assert.equal(authContainer.style.display, 'none', 'authenticated UI should hide auth pages')
assert.equal(main.style.display, 'block', 'authenticated UI should show financial content')
assert.equal(sidebar.style.display, 'flex', 'authenticated UI should show navigation')

AuthPages.showAuthPages()
assert.equal(bodyClasses.has('auth-locked'), true, 'logged-out UI should restore the application lock')
assert.equal(authContainer.style.display, 'flex', 'logged-out UI should show auth pages')
assert.equal(main.style.display, 'none', 'logged-out UI should hide financial content')
assert.equal(sidebar.style.display, 'none', 'logged-out UI should hide navigation')

console.log('authVisibility-tests: OK')
