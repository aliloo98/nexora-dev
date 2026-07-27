import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')
const read = (path) => readFileSync(resolve(root, path), 'utf8')

const colors = read('tokens/colors.css')
const spacing = read('tokens/spacing.css')
const typography = read('tokens/typography.css')
const motion = read('tokens/motion.css')
const index = read('index.css')

for (const token of [
  '--nx-color-canvas',
  '--nx-color-surface-1',
  '--nx-color-text-primary',
  '--nx-color-gold',
  '--nx-color-success',
  '--nx-color-warning',
  '--nx-color-danger',
  '--nx-color-focus'
]) {
  assert.match(colors, new RegExp(`${token}\\s*:`), `missing color token ${token}`)
}

for (const token of ['--nx-space-none', '--nx-space-2xs', '--nx-space-md', '--nx-space-6xl']) {
  assert.match(spacing, new RegExp(`${token}\\s*:`), `missing spacing token ${token}`)
}

const durations = [...motion.matchAll(/--nx-motion-[\w-]+\s*:\s*([\d.]+)ms/g)]
assert.ok(durations.length >= 5)
durations.forEach(([, duration]) => assert.ok(Number(duration) <= 250, `${duration}ms exceeds 250ms`))

const fontSizes = [...typography.matchAll(/--nx-font-size-[\w-]+\s*:\s*([\d.]+)px/g)]
assert.ok(fontSizes.length >= 6)
fontSizes.forEach(([, size]) => assert.ok(Number(size) >= 12, `${size}px is below the 12px minimum`))

assert.match(index, /tokens\/index\.css/)
assert.match(index, /foundation\/index\.css/)
assert.match(index, /primitives\/primitives\.css/)
assert.match(index, /components\/components\.css/)

console.info('Nexora UI token tests: OK')
