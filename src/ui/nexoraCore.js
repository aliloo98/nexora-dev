/**
 * Nexora Core V6.5 — Signature Edition (globe + métriques).
 * Animations visuelles GSAP uniquement — logique métier inchangée.
 */

import { gsap } from 'gsap'

const prefersReducedMotion = () => {
  if (typeof window === 'undefined' || !window.matchMedia) return true
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

const isCoarsePointer = () => {
  if (typeof window === 'undefined' || !window.matchMedia) return true
  return window.matchMedia('(hover: none), (pointer: coarse)').matches
}

const clamp = (value, min, max) => Math.max(min, Math.min(max, value))

const formatEuro = (value) => {
  const amount = Number(value) || 0
  return `${Math.round(amount).toLocaleString('fr-FR')} €`
}

const riskLabel = (risk) => {
  if (risk >= 55) return 'Élevé'
  if (risk >= 32) return 'Modéré'
  return 'Faible'
}

const healthLabel = (health) => {
  if (health >= 72) return 'Solide'
  if (health >= 45) return 'À surveiller'
  return 'Fragile'
}

let tiltBound = false
let globeMotionReady = false
let globeMotionCtx = null

const killGlobeMotion = () => {
  if (globeMotionCtx) {
    globeMotionCtx.revert()
    globeMotionCtx = null
  }
  globeMotionReady = false
}

const initGlobeSignature = (panel) => {
  if (!panel || globeMotionReady || prefersReducedMotion()) return

  const globe = panel.querySelector('#nexora-core-globe')
  const rig = panel.querySelector('.nexora-core-orbit-rig')
  const sphere = panel.querySelector('.nexora-core-sphere')
  const shimmer = panel.querySelector('.nexora-core-shimmer')
  const reflection = panel.querySelector('.nexora-core-reflection')
  const haloOuter = panel.querySelector('.nexora-core-halo--outer')
  const haloInner = panel.querySelector('.nexora-core-halo--inner')
  const particles = panel.querySelectorAll('.nexora-core-particle')
  const orbits = panel.querySelectorAll('.nexora-core-orbit')
  const satellites = panel.querySelectorAll('.nexora-core-satellite')
  const nodes = panel.querySelectorAll('.nexora-core-node')

  if (!globe) return
  globeMotionReady = true

  globeMotionCtx = gsap.context(() => {
    gsap.set(globe, { transformPerspective: 900, transformStyle: 'preserve-3d' })

    if (rig) {
      gsap.to(rig, {
        rotation: 360,
        duration: 56,
        repeat: -1,
        ease: 'none',
        transformOrigin: '50% 50%'
      })
    }

    if (sphere) {
      gsap.to(sphere, {
        rotation: 360,
        duration: 140,
        repeat: -1,
        ease: 'none',
        transformOrigin: '50% 50%'
      })
    }

    orbits.forEach((orbit, index) => {
      gsap.to(orbit, {
        rotateZ: index % 2 === 0 ? '+=360' : '-=360',
        duration: 18 + index * 6,
        repeat: -1,
        ease: 'none',
        transformOrigin: '50% 50%'
      })
    })

    satellites.forEach((satellite, index) => {
      gsap.to(satellite, {
        opacity: 0.45,
        scale: 1.35,
        duration: 2.4 + index * 0.5,
        yoyo: true,
        repeat: -1,
        ease: 'sine.inOut'
      })
    })

    nodes.forEach((node, index) => {
      gsap.to(node, {
        opacity: 1,
        scale: 1.2,
        duration: 2.8 + index * 0.35,
        yoyo: true,
        repeat: -1,
        ease: 'sine.inOut',
        delay: index * 0.2
      })
    })

    if (haloOuter) {
      gsap.to(haloOuter, {
        scale: 1.08,
        opacity: 0.7,
        duration: 4.2,
        yoyo: true,
        repeat: -1,
        ease: 'sine.inOut',
        transformOrigin: '50% 50%'
      })
    }

    if (haloInner) {
      gsap.to(haloInner, {
        scale: 1.04,
        opacity: 0.55,
        duration: 3.1,
        yoyo: true,
        repeat: -1,
        ease: 'sine.inOut',
        transformOrigin: '50% 50%',
        delay: 0.6
      })
    }

    if (shimmer) {
      gsap.fromTo(
        shimmer,
        { xPercent: -120, opacity: 0 },
        { xPercent: 120, opacity: 0.85, duration: 4.8, repeat: -1, ease: 'power1.inOut', repeatDelay: 1.2 }
      )
    }

    if (reflection) {
      gsap.to(reflection, {
        xPercent: 18,
        yPercent: -6,
        opacity: 0.55,
        duration: 5.5,
        yoyo: true,
        repeat: -1,
        ease: 'sine.inOut'
      })
    }

    particles.forEach((particle, index) => {
      gsap.to(particle, {
        x: `+=${6 + (index % 4) * 3}`,
        y: `+=${-4 - (index % 3) * 2}`,
        opacity: 0.9,
        duration: 3.2 + (index % 5) * 0.45,
        yoyo: true,
        repeat: -1,
        ease: 'sine.inOut',
        delay: index * 0.18
      })
    })

    gsap.to(globe, {
      y: -8,
      duration: 5.5,
      yoyo: true,
      repeat: -1,
      ease: 'sine.inOut'
    })

    if (isCoarsePointer()) {
      gsap.to(globe, {
        x: 5,
        rotation: 1.5,
        duration: 6.5,
        yoyo: true,
        repeat: -1,
        ease: 'sine.inOut',
        delay: 0.4
      })
      gsap.to(panel.querySelector('.nexora-core-stage'), {
        x: -3,
        y: 2,
        duration: 7.2,
        yoyo: true,
        repeat: -1,
        ease: 'sine.inOut'
      })
    }
  }, panel)
}

const bindGlobeTilt = (root) => {
  if (tiltBound || prefersReducedMotion() || isCoarsePointer()) return

  const globe = root?.querySelector?.('#nexora-core-globe')
  const stage = root?.querySelector?.('#nexora-core-stage')
  if (!globe) return
  tiltBound = true

  gsap.set(globe, { transformPerspective: 900 })

  const tiltX = gsap.quickTo(globe, 'rotationX', { duration: 0.75, ease: 'power2.out' })
  const tiltY = gsap.quickTo(globe, 'rotationY', { duration: 0.75, ease: 'power2.out' })
  const parallaxX = stage ? gsap.quickTo(stage, 'x', { duration: 0.9, ease: 'power2.out' }) : null
  const parallaxY = stage ? gsap.quickTo(stage, 'y', { duration: 0.9, ease: 'power2.out' }) : null
  const setGlow = (xPct, yPct) => {
    globe.style.setProperty('--core-glow-x', `${xPct}%`)
    globe.style.setProperty('--core-glow-y', `${yPct}%`)
  }

  const reset = () => {
    tiltX(0)
    tiltY(0)
    parallaxX?.(0)
    parallaxY?.(0)
    gsap.to(globe, {
      '--core-glow-x': '50%',
      '--core-glow-y': '42%',
      duration: 0.75,
      ease: 'power2.out',
      overwrite: 'auto'
    })
  }

  setGlow(50, 42)

  const onMove = (event) => {
    const rect = globe.getBoundingClientRect()
    const cx = rect.left + rect.width / 2
    const cy = rect.top + rect.height / 2
    const dx = clamp((event.clientX - cx) / (rect.width / 2), -1, 1)
    const dy = clamp((event.clientY - cy) / (rect.height / 2), -1, 1)
    tiltX(dy * -5)
    tiltY(dx * 6)
    parallaxX?.(dx * 10)
    parallaxY?.(dy * 7)
    setGlow(50 + dx * 14, 42 + dy * 12)
  }

  root.addEventListener('pointermove', onMove, { passive: true })
  root.addEventListener('pointerleave', reset, { passive: true })
}

/**
 * @param {{
 *   revReel?: number,
 *   solde?: number,
 *   tauxCh?: number,
 *   variablesPct?: number,
 *   debtRate?: number,
 *   primaryGoalName?: string,
 *   primaryGoalProgress?: number
 * }} metrics
 */
export function updateNexoraCore(metrics = {}) {
  const panel = document.getElementById('nexora-core-panel')
  const globe = document.getElementById('nexora-core-globe')
  const healthEl = document.getElementById('nexora-core-health')
  const riskEl = document.getElementById('nexora-core-risk')
  const balanceEl = document.getElementById('nexora-core-balance')
  const goalEl = document.getElementById('nexora-core-goal')
  const detailEl = document.getElementById('nexora-core-detail')
  const ringEl = document.getElementById('nexora-core-health-ring')

  if (!panel || !globe) return

  const income = Number(metrics.revReel || 0)
  const balance = Number(metrics.solde || 0)
  const chargesRate = Number(metrics.tauxCh || 0)
  const variableRate = Number(metrics.variablesPct || 0)
  const debtRate = Number(metrics.debtRate || 0)

  const health = income > 0
    ? clamp(100 - Math.max(0, chargesRate - 55) - Math.max(0, variableRate - 25) - Math.max(0, debtRate - 20) + Math.min(20, Math.max(0, balance / Math.max(1, income) * 100)), 12, 96)
    : 24
  const risk = clamp(100 - health, 8, 88)

  globe.style.setProperty('--core-health', `${Math.round(health)}`)
  globe.style.setProperty('--core-risk', `${Math.round(risk)}`)
  panel.dataset.health = health >= 72 ? 'solid' : health >= 45 ? 'watch' : 'fragile'

  if (healthEl) healthEl.textContent = income > 0 ? `${Math.round(health)}% · ${healthLabel(health)}` : '—'
  if (riskEl) riskEl.textContent = income > 0 ? `${riskLabel(risk)} (${Math.round(risk)}%)` : '—'
  if (balanceEl) balanceEl.textContent = income > 0 ? formatEuro(balance) : '—'
  if (goalEl) {
    const name = metrics.primaryGoalName || 'Aucun objectif principal'
    const pct = Number(metrics.primaryGoalProgress)
    goalEl.textContent = Number.isFinite(pct) && pct > 0
      ? `${name} · ${Math.round(pct)}%`
      : name
  }
  if (detailEl) {
    detailEl.textContent = income > 0
      ? `Charges ${chargesRate}% · Variables ${variableRate}% · Lecture unifiée Nexora Core.`
      : 'Complète ton budget pour activer le centre de contrôle.'
  }
  if (ringEl) {
    if (prefersReducedMotion()) {
      ringEl.style.strokeDashoffset = `${264 - (264 * health) / 100}`
    } else {
      gsap.to(ringEl, {
        strokeDashoffset: 264 - (264 * health) / 100,
        duration: 0.85,
        ease: 'power2.out',
        overwrite: 'auto'
      })
    }
  }

  initGlobeSignature(panel)
  bindGlobeTilt(panel)
}

export function openNexoraCoreAction() {
  if (typeof window.showSection === 'function') {
    const target = document.getElementById('priority-action-title')?.dataset?.targetSection || 'plan'
    window.showSection(target)
    return
  }
  window.showToast?.('Ouvre le plan financier pour la prochaine action.')
}

export function teardownNexoraCoreMotion() {
  killGlobeMotion()
  tiltBound = false
}

if (typeof window !== 'undefined') {
  window.addEventListener?.('beforeunload', teardownNexoraCoreMotion)
}

export default { updateNexoraCore, openNexoraCoreAction, teardownNexoraCoreMotion }
