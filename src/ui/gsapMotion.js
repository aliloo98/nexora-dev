import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

const reducedMotionQuery = '(prefers-reduced-motion: reduce)'
const hoverBound = new WeakSet()

gsap.registerPlugin(ScrollTrigger)

const prefersReducedMotion = () => {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return true
  return window.matchMedia(reducedMotionQuery).matches
}

const resolveRoot = (container) => typeof container === 'string' ? document.querySelector(container) : container
const canMotion = () => !prefersReducedMotion()

const runStagger = (elements, from = {}, to = {}) => {
  const list = elements.filter(Boolean)
  if (!list.length || !canMotion()) return null
  return gsap.fromTo(
    list,
    {
      autoAlpha: 0,
      y: 16,
      scale: 0.985,
      filter: 'blur(6px)',
      ...from
    },
    {
      autoAlpha: 1,
      y: 0,
      x: 0,
      scale: 1,
      filter: 'blur(0px)',
      duration: 0.58,
      ease: 'power3.out',
      stagger: 0.045,
      overwrite: 'auto',
      ...to
    }
  )
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

const cardSelector = [
  '.kpi-card',
  '.wow-card',
  '.advisor-result-card',
  '.advisor-scenario-card',
  '.plan-card',
  '.settings-card',
  '.param-block',
  '.assistant-block',
  '.empty-state'
].join(', ')

const interactiveSelector = [
  'button',
  '.btn',
  '.nav-btn',
  '.mode-toggle-btn',
  '.inline-cta',
  cardSelector,
  '.treasury-row',
  '.plan-row',
  '.plan-edit-item',
  '.timeline-node-card'
].join(', ')

const getSectionChildren = (root) => [
  root.querySelector('.dashboard-clean-header, .settings-page-header'),
  root.querySelector('.dashboard-greeting-card, .dashboard-coach-card, .advisor-page, .plan-balance-card'),
  ...Array.from(root.querySelectorAll('.kpi-card, .wow-card, .plan-card, .assistant-block')).slice(0, 14)
].filter(Boolean)

const getCards = (root) => Array.from(root.querySelectorAll(cardSelector)).slice(0, 28)

const ensureNavPill = (button) => {
  const sidebar = button?.closest?.('.sidebar')
  if (!sidebar) return null
  let pill = sidebar.querySelector('.nav-active-pill')
  if (!pill) {
    pill = document.createElement('span')
    pill.className = 'nav-active-pill'
    pill.setAttribute('aria-hidden', 'true')
    sidebar.appendChild(pill)
  }
  return pill
}

export function animatePageEnter(container) {
  const root = resolveRoot(container)
  if (!root) return
  runStagger(
    getSectionChildren(root),
    { y: 18, scale: 0.99 },
    { duration: 0.62, stagger: 0.065, ease: 'expo.out' }
  )
}

export function animateCards(container) {
  const root = resolveRoot(container)
  if (!root) return
  runStagger(
    getCards(root),
    { y: 18, scale: 0.975 },
    { duration: 0.54, stagger: 0.038, ease: 'power4.out' }
  )
}

export function animateKpiNumbers(container) {
  const root = resolveRoot(container)
  if (!root || !canMotion()) return
  root.querySelectorAll('.kpi-value, .plan-balance-value, .assistant-kpi-value').forEach((element) => {
    const finalText = element.textContent
    const finalValue = parseDisplayNumber(finalText)
    if (finalValue === null) return

    const previousValue = Number(element.dataset.motionValue)
    const startValue = Number.isFinite(previousValue) ? previousValue : Math.max(0, finalValue * 0.72)
    element.dataset.motionValue = String(finalValue)

    gsap.fromTo(
      element,
      { y: 4, autoAlpha: 0.72 },
      { y: 0, autoAlpha: 1, duration: 0.32, ease: 'power2.out', overwrite: 'auto' }
    )

    gsap.to({ value: startValue }, {
      value: finalValue,
      duration: 0.92,
      ease: 'power3.out',
      overwrite: true,
      onUpdate() {
        element.textContent = formatLike(this.targets()[0].value, finalText)
      },
      onComplete() {
        element.textContent = finalText
      }
    })
  })
}

export function animateModeSwitch(container) {
  const root = resolveRoot(container)
  if (!root || !canMotion()) return
  gsap.fromTo(
    root,
    { autoAlpha: 0.82, y: 8, scale: 0.995 },
    { autoAlpha: 1, y: 0, scale: 1, duration: 0.34, ease: 'power2.out', overwrite: 'auto' }
  )
}

export function animateTimeline(container) {
  const root = resolveRoot(container)
  if (!root) return
  runStagger(
    Array.from(root.querySelectorAll('.treasury-row, .plan-row, .plan-edit-item, .timeline-node')).slice(0, 32),
    { autoAlpha: 0, x: -18, y: 4, scale: 0.992 },
    { duration: 0.5, stagger: 0.04, ease: 'power3.out' }
  )
}

export function animateAdvisorResponse(container) {
  const root = resolveRoot(container)
  if (!root) return
  runStagger(
    Array.from(root.querySelectorAll('.advisor-steps span, .advisor-result-card, .advisor-scenario-card, .assistant-block, .assistant-analysis-bullet-item')).slice(0, 22),
    { autoAlpha: 0, y: 14, scale: 0.98 },
    { duration: 0.5, stagger: 0.045, ease: 'back.out(1.35)' }
  )
}

export function animateSectionTransition(container) {
  const root = resolveRoot(container)
  if (!root || !canMotion()) return
  gsap.fromTo(
    root,
    { autoAlpha: 0, y: 18, scale: 0.992, filter: 'blur(8px)' },
    { autoAlpha: 1, y: 0, scale: 1, filter: 'blur(0px)', duration: 0.46, ease: 'power3.out', overwrite: 'auto' }
  )
}

export function animateNavigation(button) {
  if (!button || !canMotion()) return
  const pill = ensureNavPill(button)
  if (pill) {
    const sidebarBox = button.closest('.sidebar').getBoundingClientRect()
    const buttonBox = button.getBoundingClientRect()
    gsap.to(pill, {
      autoAlpha: 1,
      x: buttonBox.left - sidebarBox.left,
      y: buttonBox.top - sidebarBox.top,
      width: buttonBox.width,
      height: buttonBox.height,
      duration: 0.44,
      ease: 'expo.out',
      overwrite: 'auto'
    })
  }
  gsap.fromTo(button, { scale: 0.96 }, { scale: 1, duration: 0.34, ease: 'back.out(2.4)', overwrite: 'auto' })
}

export function animateButtonPress(button) {
  if (!button || !canMotion()) return
  gsap.fromTo(
    button,
    { scale: 0.97 },
    { scale: 1, duration: 0.22, ease: 'back.out(2.2)', overwrite: 'auto' }
  )
}

const animateHoverIn = (element) => {
  if (!element || !canMotion()) return
  const isCard = element.matches(cardSelector)
  const x = element.matches('.treasury-row, .plan-row, .plan-edit-item') ? 3 : 0
  gsap.to(element, {
    y: isCard ? -3 : -1,
    x,
    scale: isCard ? 1.012 : 1.01,
    '--premium-glow-opacity': isCard ? 1 : 0.55,
    duration: 0.26,
    ease: 'power2.out',
    overwrite: 'auto'
  })
}

const animateHoverOut = (element) => {
  if (!element || !canMotion()) return
  gsap.to(element, {
    y: 0,
    x: 0,
    scale: 1,
    '--premium-glow-opacity': 0,
    duration: 0.3,
    ease: 'power2.out',
    overwrite: 'auto'
  })
}

export function bindButtonFeedback(container = document) {
  if (!container || hoverBound.has(container)) return
  hoverBound.add(container)
  container.addEventListener('pointerdown', (event) => {
    const button = event.target?.closest?.('button, .btn, .nav-btn, .mode-toggle-btn, .inline-cta')
    if (button) animateButtonPress(button)
  }, { passive: true })
  container.addEventListener('pointerenter', (event) => {
    const target = event.target?.closest?.(interactiveSelector)
    if (target) animateHoverIn(target)
  }, { passive: true, capture: true })
  container.addEventListener('pointerleave', (event) => {
    const target = event.target?.closest?.(interactiveSelector)
    if (target) animateHoverOut(target)
  }, { passive: true, capture: true })
}

export function initScrollReveal(container = document) {
  const root = resolveRoot(container)
  if (!root || !canMotion()) return
  const items = getCards(root).filter((item) => !item.dataset.revealReady)
  if (!items.length) return

  gsap.set(items, { autoAlpha: 0, y: 18, scale: 0.985, filter: 'blur(6px)' })
  items.forEach((item) => {
    item.dataset.revealReady = 'true'
    ScrollTrigger.create({
      trigger: item,
      start: 'top 88%',
      once: true,
      onEnter: () => {
        item.dataset.revealed = 'true'
        gsap.to(item, {
          autoAlpha: 1,
          y: 0,
          scale: 1,
          filter: 'blur(0px)',
          duration: 0.58,
          ease: 'power3.out',
          overwrite: 'auto'
        })
      }
    })
  })
  ScrollTrigger.refresh()
}

export default {
  animatePageEnter,
  animateCards,
  animateKpiNumbers,
  animateModeSwitch,
  animateTimeline,
  animateAdvisorResponse,
  animateSectionTransition,
  animateNavigation,
  animateButtonPress,
  bindButtonFeedback,
  initScrollReveal
}
