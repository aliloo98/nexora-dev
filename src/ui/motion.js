const prefersReducedMotion = () => {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return true
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

const canAnimate = (element) => element && !prefersReducedMotion() && typeof element.animate === 'function'

const stagger = (elements, keyframes, options = {}) => {
  if (prefersReducedMotion()) return
  elements.filter(Boolean).forEach((element, index) => {
    if (!canAnimate(element)) return
    element.animate(keyframes, {
      duration: options.duration || 360,
      delay: (options.delay || 0) + index * (options.stagger || 45),
      easing: options.easing || 'cubic-bezier(.22,.8,.24,1)',
      fill: 'both'
    })
  })
}

const parseDisplayNumber = (text) => {
  const raw = String(text || '').replace(/\s/g, '').replace(',', '.')
  const match = raw.match(/-?\d+(\.\d+)?/)
  return match ? Number(match[0]) : null
}

const formatLike = (value, originalText) => {
  const rounded = Math.round(value)
  if (String(originalText).includes('%')) return `${rounded}%`
  if (String(originalText).includes('€')) return `${rounded.toLocaleString('fr-FR')} €`
  return rounded.toLocaleString('fr-FR')
}

export function animatePageEnter(container) {
  const root = typeof container === 'string' ? document.querySelector(container) : container
  if (!root) return
  stagger(
    [root.querySelector('.dashboard-clean-header'), root.querySelector('.dashboard-coach-card')],
    [{ opacity: 0, transform: 'translateY(10px)' }, { opacity: 1, transform: 'translateY(0)' }],
    { duration: 420, stagger: 80 }
  )
}

export function animateCards(container) {
  const root = typeof container === 'string' ? document.querySelector(container) : container
  if (!root) return
  stagger(
    Array.from(root.querySelectorAll('.kpi-card, .wow-card, .advisor-result-card, .plan-card')).slice(0, 16),
    [{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'translateY(0)' }],
    { duration: 360, stagger: 35 }
  )
}

export function animateKpiNumbers(container) {
  const root = typeof container === 'string' ? document.querySelector(container) : container
  if (!root || prefersReducedMotion()) return
  root.querySelectorAll('.kpi-value, .plan-balance-value').forEach((element) => {
    const finalText = element.textContent
    const finalValue = parseDisplayNumber(finalText)
    if (finalValue === null || !canAnimate(element)) return
    const previousValue = Number(element.dataset.motionValue)
    const startValue = Number.isFinite(previousValue) ? previousValue : 0
    element.dataset.motionValue = String(finalValue)
    if (Math.abs(finalValue - startValue) < 1) return
    const startedAt = performance.now()
    const duration = 520
    const tick = (now) => {
      const progress = Math.min(1, (now - startedAt) / duration)
      const eased = 1 - Math.pow(1 - progress, 3)
      element.textContent = formatLike(startValue + (finalValue - startValue) * eased, finalText)
      if (progress < 1) requestAnimationFrame(tick)
      else element.textContent = finalText
    }
    requestAnimationFrame(tick)
  })
}

export function animateModeSwitch(container) {
  const root = typeof container === 'string' ? document.querySelector(container) : container
  if (!canAnimate(root)) return
  root.animate(
    [{ opacity: 0.82, transform: 'translateY(4px)' }, { opacity: 1, transform: 'translateY(0)' }],
    { duration: 220, easing: 'ease-out' }
  )
}

export function animateTimeline(container) {
  const root = typeof container === 'string' ? document.querySelector(container) : container
  if (!root) return
  stagger(
    Array.from(root.querySelectorAll('.treasury-row, .plan-row, .plan-edit-item')).slice(0, 18),
    [{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'translateY(0)' }],
    { duration: 340, stagger: 38 }
  )
}

export function animateAdvisorResponse(container) {
  const root = typeof container === 'string' ? document.querySelector(container) : container
  if (!root) return
  stagger(
    Array.from(root.querySelectorAll('.advisor-result-card, .advisor-scenario-card')).slice(0, 10),
    [{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'translateY(0)' }],
    { duration: 340, stagger: 55 }
  )
}

export function animateButtonPress(button) {
  if (!canAnimate(button)) return
  button.animate(
    [{ transform: 'scale(1)' }, { transform: 'scale(.97)' }, { transform: 'scale(1)' }],
    { duration: 180, easing: 'ease-out' }
  )
}

export function bindButtonFeedback(container = document) {
  if (!container || container.__nexoraMotionButtonsBound) return
  container.__nexoraMotionButtonsBound = true
  container.addEventListener('pointerdown', (event) => {
    const button = event.target?.closest?.('button, .btn')
    if (button) animateButtonPress(button)
  }, { passive: true })
}

export default {
  animatePageEnter,
  animateCards,
  animateKpiNumbers,
  animateModeSwitch,
  animateTimeline,
  animateAdvisorResponse,
  animateButtonPress,
  bindButtonFeedback
}
